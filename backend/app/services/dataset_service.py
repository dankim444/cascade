"""
Service for managing dataset access and data connections
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import tempfile
import os
import sqlite3
from app.models.dataset import Dataset
from app.services.s3_service import s3_service

class DatasetService:
    """Service for managing dataset data connections"""
    
    @staticmethod
    def get_data_connection_for_transformation(
        dataset_id: str,
        user_id: str,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """
        Get a data connection for transformation execution.
        Downloads the database from S3 to a temporary location.
        Returns the connection info and a cleanup function.
        """
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id,
            Dataset.user_id == user_id
        ).first()
        
        if not dataset:
            return None
        
        # Download database from S3
        db_content = s3_service.download_file(dataset.s3_db_path)
        if not db_content:
            return None
        
        # Create temporary database file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        temp_file.write(db_content)
        temp_file.close()
        temp_path = temp_file.name
        
        return {
            "dataKey": dataset.data_key,
            "sqlConnection": temp_path,  # Local temp path
            "schema": {"columns": dataset.columns},
            "rowCount": dataset.row_count,
            "tempFilePath": temp_path  # For cleanup
        }
    
    @staticmethod
    def cleanup_temp_file(temp_path: str):
        """Clean up temporary database file"""
        try:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        except Exception as e:
            print(f"Error cleaning up temp file {temp_path}: {e}")

dataset_service = DatasetService()

