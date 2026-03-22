"""
Persist pipeline executor output SQLite files as Dataset records + S3 objects.
"""
import io
import os
import re
import sqlite3
import uuid
from datetime import datetime
from typing import Any, List, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.pipeline import Pipeline
from app.models.user import User
from app.services.s3_service import s3_service


def _is_safe_output_data_key(key: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_]+$", key))


def persist_execution_sqlite_as_dataset(
    db: Session,
    output_data_key: str,
    current_user: User,
    project_id: str,
    *,
    pipeline_id: Optional[str] = None,
    dataset_name_override: Optional[str] = None,
    pipeline_name_hint: Optional[str] = None,
    output_schema: Optional[List[Any]] = None,
    row_count_override: Optional[int] = None,
) -> Tuple[Optional[Dataset], Optional[str]]:
    """
    Read data/{output_data_key}.db from disk, upload CSV + SQLite to S3, create or update Dataset.
    Returns (dataset, None) on success, (None, error_message) on failure.
    """
    key = (output_data_key or "").strip()
    if not key or not _is_safe_output_data_key(key):
        return None, "Invalid output data key"

    output_db_path = os.path.join("data", f"{key}.db")
    if not os.path.exists(output_db_path):
        return None, (
            "Full output file is no longer on the server (it may have been removed). "
            "Run the pipeline again, then save."
        )

    try:
        output_conn = sqlite3.connect(output_db_path)
        df = pd.read_sql_query("SELECT * FROM data", output_conn)
        output_conn.close()

        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode("utf-8")

        with open(output_db_path, "rb") as db_file:
            db_content = db_file.read()

        schema = list(output_schema) if output_schema is not None else []
        if not schema and len(df.columns) > 0:
            schema = [
                {"name": str(c), "type": "string", "nullable": True}
                for c in df.columns
            ]

        row_count = int(row_count_override) if row_count_override is not None else len(df)

        saved_pipeline = None
        if pipeline_id:
            saved_pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()

        output_dataset = None
        if saved_pipeline and saved_pipeline.output_dataset_id:
            output_dataset = db.query(Dataset).filter(
                Dataset.id == saved_pipeline.output_dataset_id
            ).first()
        if not output_dataset and pipeline_id:
            output_dataset = db.query(Dataset).filter(
                Dataset.pipeline_id == pipeline_id
            ).first()

        if dataset_name_override and dataset_name_override.strip():
            consistent_dataset_name = dataset_name_override.strip()
        else:
            pipeline_name = (
                saved_pipeline.name
                if saved_pipeline
                else (pipeline_name_hint or "Untitled Pipeline")
            )
            consistent_dataset_name = f"{pipeline_name} - Output"

        user_prefix = f"users/{current_user.id}"

        if output_dataset:
            data_key = output_dataset.data_key
            csv_s3_key = output_dataset.s3_csv_path
            db_s3_key = output_dataset.s3_db_path
            dataset_id = output_dataset.id
            output_dataset.name = consistent_dataset_name
        else:
            dataset_id = str(uuid.uuid4())
            data_key = f"data_{dataset_id}"
            csv_s3_key = f"{user_prefix}/datasets/{data_key}/original.csv"
            db_s3_key = f"{user_prefix}/datasets/{data_key}/data.db"

        s3_service.upload_file(csv_content, csv_s3_key, "text/csv")
        s3_service.upload_file(db_content, db_s3_key, "application/x-sqlite3")

        if output_dataset:
            output_dataset.columns = schema
            output_dataset.row_count = row_count
            output_dataset.file_size = len(csv_content)
            output_dataset.updated_at = datetime.now()
            output_dataset.last_accessed = datetime.now()
            if pipeline_id:
                output_dataset.pipeline_id = pipeline_id
        else:
            output_dataset = Dataset(
                id=dataset_id,
                user_id=current_user.id,
                project_id=project_id,
                pipeline_id=pipeline_id,
                name=consistent_dataset_name,
                data_key=data_key,
                s3_csv_path=csv_s3_key,
                s3_db_path=db_s3_key,
                columns=schema,
                row_count=row_count,
                file_size=len(csv_content),
            )
            db.add(output_dataset)

        db.commit()
        db.refresh(output_dataset)

        if saved_pipeline:
            saved_pipeline.output_dataset_id = output_dataset.id
            db.commit()

        return output_dataset, None
    except Exception as e:
        db.rollback()
        return None, str(e)
