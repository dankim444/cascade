"""
Resolve pipeline dataConnections (dataKey + placeholders) to temp SQLite paths via S3.
Shared by run, validate, and save flows.
"""
import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.project_access import check_project_access
from app.models.dataset import Dataset
from app.models.user import User
from app.services.s3_service import s3_service


def resolve_data_connections_for_user(
    db: Session,
    current_user: User,
    data_connections_raw: List[Dict[str, Any]],
    temp_files_to_cleanup: List[str],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Returns (resolved_data_connections, first_error_message).
    On error, first element is None-like handling via message; caller should not use list if message set.
    """
    resolved: List[Dict[str, Any]] = []

    for conn in data_connections_raw:
        data_key = conn.get("dataKey")
        if not data_key:
            continue

        dataset = (
            db.query(Dataset)
            .filter(
                Dataset.data_key == data_key,
                Dataset.user_id == current_user.id,
            )
            .first()
        )

        if not dataset:
            dataset = db.query(Dataset).filter(Dataset.data_key == data_key).first()
            if dataset and dataset.project_id:
                project, _, _ = check_project_access(
                    dataset.project_id, current_user.id, db
                )
                if not project:
                    dataset = None

        if dataset:
            db_content = s3_service.download_file(dataset.s3_db_path)
            if db_content:
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
                temp_file.write(db_content)
                temp_file.close()
                temp_path = temp_file.name
                temp_files_to_cleanup.append(temp_path)
                resolved.append(
                    {
                        "dataKey": dataset.data_key,
                        "sqlConnection": temp_path,
                        "schema": {"columns": dataset.columns},
                        "rowCount": dataset.row_count,
                    }
                )
            else:
                return (
                    [],
                    f"Could not download dataset {data_key} from S3",
                )
        else:
            sql_connection = conn.get("sqlConnection", "")
            if os.path.exists(sql_connection):
                resolved.append(conn)
            else:
                return (
                    [],
                    f"Dataset with dataKey {data_key} not found for user",
                )

    return resolved, None
