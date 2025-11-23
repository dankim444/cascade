"""
Dataset routes with authentication and S3 storage
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import sqlite3
import io
import uuid
from datetime import datetime
import tempfile
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.services.s3_service import s3_service

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

def _map_sqlite_type(sqlite_type: str) -> str:
    """Map SQLite types to our type system"""
    if sqlite_type.upper() in ['INTEGER', 'REAL']:
        return 'number'
    elif sqlite_type.upper() == 'TEXT':
        return 'string'
    else:
        return 'string'

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a dataset file with S3 storage"""
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
            "uploadedAt": dataset.uploaded_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@router.get("")
async def get_datasets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all datasets for the current user"""
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    
    return {
        "datasets": [
            {
                "id": ds.id,
                "name": ds.name,
                "columns": ds.columns,
                "rowCount": ds.row_count,
                "dataKey": ds.data_key,
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
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
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
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
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

@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a dataset and its files from S3, and any pipelines that reference it"""
    from app.models.pipeline import Pipeline
    import json
    
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
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

