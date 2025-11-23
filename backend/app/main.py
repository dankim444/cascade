from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
from app.transformations.executor_fixed import TransformationExecutor
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.pipeline import Pipeline
from app.api.routes import auth_router
from app.api.routes.datasets import router as datasets_router

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="Cascade API",
    description="Backend API for Cascade - No-Code Data Platform",
    version="2.0.0"
)

# CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(datasets_router)

# Create data directory if it doesn't exist (for temporary files)
os.makedirs("data", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Cascade API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Legacy upload endpoint - now handled by datasets router
# Keeping for backward compatibility during migration

@app.post("/api/transformations/run")
async def run_transformation(
    pipeline: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a transformation pipeline"""
    from app.models.dataset import Dataset
    from app.services.s3_service import s3_service
    import tempfile
    import os
    
    temp_files_to_cleanup = []  # Track temp files for cleanup
    
    try:
        # Extract nodes and data connections from pipeline
        nodes = pipeline.get('nodes', [])
        data_connections_raw = pipeline.get('dataConnections', [])
        
        # Resolve data connections: convert dataKeys to actual S3 downloads
        resolved_data_connections = []
        
        for conn in data_connections_raw:
            data_key = conn.get('dataKey')
            if not data_key:
                continue
            
            # Find dataset in database by dataKey and user
            dataset = db.query(Dataset).filter(
                Dataset.data_key == data_key,
                Dataset.user_id == current_user.id
            ).first()
            
            if dataset:
                # Download database from S3 to temporary file
                db_content = s3_service.download_file(dataset.s3_db_path)
                if db_content:
                    # Create temporary database file
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
                    temp_file.write(db_content)
                    temp_file.close()
                    temp_path = temp_file.name
                    temp_files_to_cleanup.append(temp_path)
                    
                    # Create resolved connection
                    resolved_conn = {
                        'dataKey': dataset.data_key,
                        'sqlConnection': temp_path,  # Local temp path
                        'schema': {'columns': dataset.columns},
                        'rowCount': dataset.row_count
                    }
                    resolved_data_connections.append(resolved_conn)
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Could not download dataset {data_key} from S3"
                    )
            else:
                # Might be an intermediate result from a previous transformation
                # Check if it's a local temp file path (from intermediate results)
                sql_connection = conn.get('sqlConnection', '')
                if os.path.exists(sql_connection):
                    # It's already a local file (intermediate result)
                    resolved_data_connections.append(conn)
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Dataset with dataKey {data_key} not found for user"
                    )
        
        # Create transformation executor with resolved connections
        executor = TransformationExecutor(resolved_data_connections)
        
        # Execute pipeline
        result = executor.execute_pipeline(nodes, resolved_data_connections)
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")
    finally:
        # Clean up temporary files
        for temp_path in temp_files_to_cleanup:
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except Exception as e:
                print(f"Error cleaning up temp file {temp_path}: {e}")

@app.post("/api/pipelines/save")
async def save_pipeline(
    pipeline: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a pipeline"""
    import uuid
    
    pipeline_id = pipeline.get("id") or str(uuid.uuid4())
    
    # Check if pipeline exists
    existing = db.query(Pipeline).filter(
        Pipeline.id == pipeline_id,
        Pipeline.user_id == current_user.id
    ).first()
    
    if existing:
        # Update existing
        existing.name = pipeline.get("name", existing.name)
        existing.definition = pipeline
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        
        # Handle updated_at which should be set after update
        updated_at = existing.updated_at
        if updated_at is None:
            updated_at = existing.created_at
        
        return {
            "id": existing.id,
            "name": existing.name,
            "definition": existing.definition,
            "createdAt": existing.created_at.isoformat(),
            "updatedAt": updated_at.isoformat()
        }
    else:
        # Create new
        new_pipeline = Pipeline(
            id=pipeline_id,
            user_id=current_user.id,
            name=pipeline.get("name", "Untitled Pipeline"),
            definition=pipeline
        )
        db.add(new_pipeline)
        db.commit()
        db.refresh(new_pipeline)
        
        # Handle updated_at which might be None for new records
        updated_at = new_pipeline.updated_at
        if updated_at is None:
            updated_at = new_pipeline.created_at
        
        return {
            "id": new_pipeline.id,
            "name": new_pipeline.name,
            "definition": new_pipeline.definition,
            "createdAt": new_pipeline.created_at.isoformat(),
            "updatedAt": updated_at.isoformat()
        }

@app.get("/api/pipelines")
async def get_pipelines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all saved pipelines for the current user"""
    pipelines = db.query(Pipeline).filter(Pipeline.user_id == current_user.id).all()
    
    return {
        "pipelines": [
            {
                "id": p.id,
                "name": p.name,
                "definition": p.definition,
                "createdAt": p.created_at.isoformat(),
                "updatedAt": (p.updated_at or p.created_at).isoformat()
            }
            for p in pipelines
        ]
    }

@app.get("/api/pipelines/{pipeline_id}")
async def get_pipeline(
    pipeline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific pipeline"""
    pipeline = db.query(Pipeline).filter(
        Pipeline.id == pipeline_id,
        Pipeline.user_id == current_user.id
    ).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return {
        "id": pipeline.id,
        "name": pipeline.name,
        "definition": pipeline.definition,
        "createdAt": pipeline.created_at.isoformat(),
        "updatedAt": (pipeline.updated_at or pipeline.created_at).isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
