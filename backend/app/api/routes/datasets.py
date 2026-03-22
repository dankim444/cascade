"""
Dataset routes with authentication and S3 storage
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
import re
from sqlalchemy.orm import Session
from typing import Any, List, Optional
import pandas as pd
import sqlite3
import io
import uuid
from datetime import datetime
import tempfile
import os
import boto3
from decimal import Decimal
import json
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.project_access import check_project_access, user_can_edit_project
from app.models.user import User
from app.models.dataset import Dataset
from app.services.s3_service import s3_service

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

class FromExecutionOutputRequest(BaseModel):
    output_data_key: str = Field(..., min_length=1)
    project_id: str = Field(..., min_length=1)
    pipeline_id: Optional[str] = None
    pipeline_name: Optional[str] = None
    output_schema: Optional[List[Any]] = None
    row_count: Optional[int] = None


class DynamoDBImportRequest(BaseModel):
    table_name: str = Field(..., min_length=1)
    region: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    session_token: Optional[str] = None
    endpoint_url: Optional[str] = None
    limit: Optional[int] = None
    dataset_name: Optional[str] = None
    project_id: Optional[str] = None

def _safe_csv_attachment_filename(name: str) -> str:
    base = re.sub(r"[^\w\-. ]+", "_", (name or "dataset").strip()) or "dataset"
    if not base.lower().endswith(".csv"):
        base = f"{base}.csv"
    return base


def _safe_db_attachment_filename(name: str) -> str:
    base = re.sub(r"[^\w\-. ]+", "_", (name or "dataset").strip()) or "dataset"
    if base.lower().endswith(".csv"):
        base = base[:-4]
    if not base.lower().endswith(".db"):
        base = f"{base}.db"
    return base


def _attachment_content_disposition(filename: str) -> str:
    safe = filename.replace('"', "")
    return f'attachment; filename="{safe}"'


def _map_sqlite_type(sqlite_type: str) -> str:
    """Map SQLite types to our type system"""
    if sqlite_type.upper() in ['INTEGER', 'REAL']:
        return 'number'
    elif sqlite_type.upper() == 'TEXT':
        return 'string'
    else:
        return 'string'

def _coerce_dynamo_value(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    if isinstance(value, (dict, list, set, tuple)):
        return json.dumps(value, default=str)
    return value

def _normalize_dynamo_items(items):
    normalized = []
    for item in items:
        normalized_item = {}
        for key, value in item.items():
            normalized_item[key] = _coerce_dynamo_value(value)
        normalized.append(normalized_item)
    return normalized

def _scan_dynamodb_table(
    table,
    limit: Optional[int] = None
) -> List[dict]:
    items: List[dict] = []
    scan_kwargs = {}
    exclusive_start_key = None
    while True:
        if exclusive_start_key:
            scan_kwargs["ExclusiveStartKey"] = exclusive_start_key
        if limit is not None:
            remaining = max(limit - len(items), 0)
            if remaining == 0:
                break
            scan_kwargs["Limit"] = min(1000, remaining)
        response = table.scan(**scan_kwargs)
        items.extend(response.get("Items", []))
        if limit is not None and len(items) >= limit:
            items = items[:limit]
            break
        exclusive_start_key = response.get("LastEvaluatedKey")
        if not exclusive_start_key:
            break
    return items

@router.post("/dynamodb/import")
async def import_dynamodb_dataset(
    payload: DynamoDBImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import a DynamoDB table into a dataset"""
    if payload.project_id:
        if not user_can_edit_project(payload.project_id, current_user.id, db):
            raise HTTPException(status_code=403, detail="You don't have permission to import datasets to this project")
    if payload.limit is not None and payload.limit <= 0:
        raise HTTPException(status_code=400, detail="Limit must be greater than 0")
    try:
        session_kwargs = {}
        if payload.access_key_id and payload.secret_access_key:
            session_kwargs["aws_access_key_id"] = payload.access_key_id
            session_kwargs["aws_secret_access_key"] = payload.secret_access_key
        if payload.session_token:
            session_kwargs["aws_session_token"] = payload.session_token
        aws_region = payload.region or os.getenv("AWS_REGION", "us-east-1")
        session = boto3.session.Session(region_name=aws_region, **session_kwargs)
        dynamodb = session.resource("dynamodb", region_name=aws_region, endpoint_url=payload.endpoint_url)
        table = dynamodb.Table(payload.table_name)
        raw_items = _scan_dynamodb_table(table, limit=payload.limit)
        if not raw_items:
            raise HTTPException(status_code=404, detail="No items found in DynamoDB table")
        items = _normalize_dynamo_items(raw_items)
        df = pd.DataFrame(items)
        dataset_id = str(uuid.uuid4())
        data_key = f"data_{dataset_id}"
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_db:
            db_path = tmp_db.name
        try:
            conn = sqlite3.connect(db_path)
            df.to_sql('data', conn, if_exists='replace', index=False)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(data)")
            columns_info = cursor.fetchall()
            columns = []
            for col_info in columns_info:
                col_name = col_info[1]
                col_type = col_info[2]
                nullable = not col_info[3]
                columns.append({
                    "name": col_name,
                    "type": _map_sqlite_type(col_type),
                    "nullable": nullable
                })
            cursor.execute("SELECT * FROM data LIMIT 10")
            preview_rows = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]
            preview_data = []
            for row in preview_rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[column_names[i]] = value
                preview_data.append(row_dict)
            cursor.execute("SELECT COUNT(*) FROM data")
            row_count = cursor.fetchone()[0]
            conn.close()
            csv_content = df.to_csv(index=False).encode("utf-8")
            user_prefix = f"users/{current_user.id}"
            csv_s3_key = f"{user_prefix}/datasets/{data_key}/original.csv"
            db_s3_key = f"{user_prefix}/datasets/{data_key}/data.db"
            s3_service.upload_file(csv_content, csv_s3_key, "text/csv")
            with open(db_path, 'rb') as db_file:
                db_content = db_file.read()
                s3_service.upload_file(db_content, db_s3_key, "application/x-sqlite3")
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)
        dataset = Dataset(
            id=dataset_id,
            user_id=current_user.id,
            project_id=payload.project_id,
            name=payload.dataset_name or payload.table_name,
            data_key=data_key,
            s3_csv_path=csv_s3_key,
            s3_db_path=db_s3_key,
            columns=columns,
            row_count=row_count,
            file_size=len(csv_content)
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        return {
            "id": dataset.id,
            "name": dataset.name,
            "columns": dataset.columns,
            "rowCount": dataset.row_count,
            "preview": preview_data,
            "dataKey": dataset.data_key,
            "projectId": dataset.project_id,
            "uploadedAt": dataset.uploaded_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error importing DynamoDB table: {str(e)}")

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    project_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a dataset file with S3 storage"""
    # If project_id is specified, check if user has edit access
    if project_id:
        if not user_can_edit_project(project_id, current_user.id, db):
            raise HTTPException(status_code=403, detail="You don't have permission to upload datasets to this project")
    
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Parse CSV
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Generate dataset ID and data key
        dataset_id = str(uuid.uuid4())
        data_key = f"data_{dataset_id}"
        
        # Create temporary SQLite database
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_db:
            db_path = tmp_db.name
            conn = sqlite3.connect(db_path)
            
            # Store data in SQLite
            df.to_sql('data', conn, if_exists='replace', index=False)
            
            # Get schema information
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(data)")
            columns_info = cursor.fetchall()
            
            # Convert to our schema format
            columns = []
            for col_info in columns_info:
                col_name = col_info[1]
                col_type = col_info[2]
                nullable = not col_info[3]
                
                columns.append({
                    "name": col_name,
                    "type": _map_sqlite_type(col_type),
                    "nullable": nullable
                })
            
            # Get preview data
            cursor.execute("SELECT * FROM data LIMIT 10")
            preview_rows = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]
            
            preview_data = []
            for row in preview_rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[column_names[i]] = value
                preview_data.append(row_dict)
            
            # Get row count
            cursor.execute("SELECT COUNT(*) FROM data")
            row_count = cursor.fetchone()[0]
            
            conn.close()
            
            # Upload files to S3
            user_prefix = f"users/{current_user.id}"
            csv_s3_key = f"{user_prefix}/datasets/{data_key}/original.csv"
            db_s3_key = f"{user_prefix}/datasets/{data_key}/data.db"
            
            # Upload CSV
            s3_service.upload_file(content, csv_s3_key, "text/csv")
            
            # Upload SQLite DB
            with open(db_path, 'rb') as db_file:
                db_content = db_file.read()
                s3_service.upload_file(db_content, db_s3_key, "application/x-sqlite3")
            
            # Clean up temporary file
            os.unlink(db_path)
        
        # Create dataset record in database
        dataset = Dataset(
            id=dataset_id,
            user_id=current_user.id,
            project_id=project_id,
            name=file.filename.replace('.csv', ''),
            data_key=data_key,
            s3_csv_path=csv_s3_key,
            s3_db_path=db_s3_key,
            columns=columns,
            row_count=row_count,
            file_size=file_size
        )
        
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        # Return dataset info
        return {
            "id": dataset.id,
            "name": dataset.name,
            "columns": dataset.columns,
            "rowCount": dataset.row_count,
            "preview": preview_data,
            "dataKey": dataset.data_key,
            "projectId": dataset.project_id,
            "uploadedAt": dataset.uploaded_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("/from-execution-output")
async def create_dataset_from_execution_output(
    body: FromExecutionOutputRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save the full pipeline output from the on-disk executor SQLite file (not API preview rows).
    """
    if not user_can_edit_project(body.project_id, current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to add datasets to this project",
        )

    from app.services.pipeline_output_storage import persist_execution_sqlite_as_dataset

    output_dataset, err = persist_execution_sqlite_as_dataset(
        db,
        body.output_data_key,
        current_user,
        body.project_id,
        pipeline_id=body.pipeline_id,
        pipeline_name_hint=body.pipeline_name,
        output_schema=body.output_schema,
        row_count_override=body.row_count,
    )
    if err or not output_dataset:
        raise HTTPException(status_code=400, detail=err or "Failed to save dataset")

    return {
        "id": output_dataset.id,
        "name": output_dataset.name,
        "columns": output_dataset.columns,
        "rowCount": output_dataset.row_count,
        "dataKey": output_dataset.data_key,
        "projectId": output_dataset.project_id,
        "uploadedAt": output_dataset.uploaded_at.isoformat(),
    }


@router.get("")
async def get_datasets(
    project_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all datasets for the current user, optionally filtered by project"""
    if project_id:
        # Check if user has access to this project
        project, is_owner, permission = check_project_access(project_id, current_user.id, db)
        if not project:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
        
        # Get all datasets for this project (regardless of who uploaded them)
        datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
    else:
        # Get only user's own datasets when no project specified
        datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    
    return {
        "datasets": [
            {
                "id": ds.id,
                "name": ds.name,
                "columns": ds.columns,
                "rowCount": ds.row_count,
                "dataKey": ds.data_key,
                "projectId": ds.project_id,
                "uploadedAt": ds.uploaded_at.isoformat()
            }
            for ds in datasets
        ]
    }

@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check access: user owns the dataset OR has access to its project
    has_access = dataset.user_id == current_user.id
    if not has_access and dataset.project_id:
        project, _, _ = check_project_access(dataset.project_id, current_user.id, db)
        has_access = project is not None
    
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this dataset")
    
    return {
        "id": dataset.id,
        "name": dataset.name,
        "columns": dataset.columns,
        "rowCount": dataset.row_count,
        "dataKey": dataset.data_key,
        "uploadedAt": dataset.uploaded_at.isoformat()
    }

@router.get("/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dataset preview data from S3"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check access: user owns the dataset OR has access to its project
    has_access = dataset.user_id == current_user.id
    if not has_access and dataset.project_id:
        project, _, _ = check_project_access(dataset.project_id, current_user.id, db)
        has_access = project is not None
    
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this dataset")
    
    # Download database from S3
    db_content = s3_service.download_file(dataset.s3_db_path)
    if not db_content:
        raise HTTPException(status_code=404, detail="Dataset file not found in storage")
    
    # Create temporary database file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_db:
        tmp_db.write(db_content)
        tmp_db_path = tmp_db.name
        
        try:
            conn = sqlite3.connect(tmp_db_path)
            cursor = conn.cursor()
            
            # Get preview data
            cursor.execute(f"SELECT * FROM data LIMIT {limit}")
            preview_rows = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]
            
            preview_data = []
            for row in preview_rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[column_names[i]] = value
                preview_data.append(row_dict)
            
            # Get total row count
            cursor.execute("SELECT COUNT(*) FROM data")
            total_rows = cursor.fetchone()[0]
            
            conn.close()
        finally:
            os.unlink(tmp_db_path)
    
    # Update last accessed time
    dataset.last_accessed = datetime.now()
    db.commit()
    
    return {
        "data": preview_data,
        "totalRows": total_rows
    }


@router.get("/{dataset_id}/download")
async def get_dataset_download_presigned_url(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a short-lived presigned S3 URL so the browser can download the object directly."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    has_access = dataset.user_id == current_user.id
    if not has_access and dataset.project_id:
        project, _, _ = check_project_access(dataset.project_id, current_user.id, db)
        has_access = project is not None

    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this dataset")

    url: Optional[str] = None

    if dataset.s3_csv_path and s3_service.file_exists(dataset.s3_csv_path):
        fn = _safe_csv_attachment_filename(dataset.name)
        url = s3_service.get_presigned_url(
            dataset.s3_csv_path,
            response_content_disposition=_attachment_content_disposition(fn),
        )
    elif dataset.s3_db_path and s3_service.file_exists(dataset.s3_db_path):
        fn = _safe_db_attachment_filename(dataset.name)
        url = s3_service.get_presigned_url(
            dataset.s3_db_path,
            response_content_disposition=_attachment_content_disposition(fn),
        )

    if not url:
        raise HTTPException(status_code=404, detail="Dataset file not found in storage")

    dataset.last_accessed = datetime.now()
    db.commit()

    return {"url": url}


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a dataset and its files from S3, and any pipelines that reference it"""
    from app.models.pipeline import Pipeline
    import json
    
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check access: user owns the dataset OR has edit access to its project
    can_delete = dataset.user_id == current_user.id
    if not can_delete and dataset.project_id:
        can_delete = user_can_edit_project(dataset.project_id, current_user.id, db)
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this dataset")
    
    try:
        # Find and delete pipelines that reference this dataset
        user_pipelines = db.query(Pipeline).filter(
            Pipeline.user_id == current_user.id
        ).all()
        
        deleted_pipelines = []
        for pipeline in user_pipelines:
            if not pipeline.definition:
                continue
            
            # Check if pipeline references this dataset
            # Pipelines can reference datasets by:
            # 1. In the datasets array (by ID)
            # 2. In flowNodes (dataNode with dataKey matching dataset's dataKey)
            definition = pipeline.definition if isinstance(pipeline.definition, dict) else json.loads(pipeline.definition) if isinstance(pipeline.definition, str) else {}
            
            references_dataset = False
            
            # Check datasets array
            if 'datasets' in definition:
                for ds in definition.get('datasets', []):
                    if isinstance(ds, dict) and ds.get('id') == dataset_id:
                        references_dataset = True
                        break
                    elif isinstance(ds, str) and ds == dataset_id:
                        references_dataset = True
                        break
            
            # Check flowNodes for dataKey references
            if not references_dataset and 'flowNodes' in definition:
                for node in definition.get('flowNodes', []):
                    if isinstance(node, dict):
                        # Check if it's a dataNode with matching dataKey
                        if (node.get('type') == 'dataNode' and 
                            node.get('data', {}).get('dataKey') == dataset.data_key):
                            references_dataset = True
                            break
                        # Also check if node data contains the dataset ID
                        node_data = node.get('data', {})
                        if node_data.get('datasetId') == dataset_id:
                            references_dataset = True
                            break
            
            if references_dataset:
                db.delete(pipeline)
                deleted_pipelines.append(pipeline.id)
        
        # Delete files from S3
        if dataset.s3_csv_path:
            s3_service.delete_file(dataset.s3_csv_path)
        if dataset.s3_db_path:
            s3_service.delete_file(dataset.s3_db_path)
        
        # Delete dataset record from database
        db.delete(dataset)
        db.commit()
        
        return {
            "message": "Dataset deleted successfully",
            "id": dataset_id,
            "deletedPipelines": deleted_pipelines,
            "pipelinesDeleted": len(deleted_pipelines)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting dataset: {str(e)}"
        )

