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
from app.core.project_access import check_project_access, user_can_edit_project
from app.models.user import User
from app.models.pipeline import Pipeline
from app.api.routes import auth_router
from app.api.routes.presence import router as presence_router
from app.api.routes.datasets import router as datasets_router
from app.api.routes.projects import router as projects_router
from app.api.routes import router as api_router

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
app.include_router(projects_router)
app.include_router(presence_router)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

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
    import sqlite3
    
    temp_files_to_cleanup = []  # Track temp files for cleanup
    
    try:
        # Extract nodes and data connections from pipeline
        nodes = pipeline.get('nodes', [])
        data_connections_raw = pipeline.get('dataConnections', [])
        project_id = pipeline.get('projectId')
        
        # Resolve data connections: convert dataKeys to actual S3 downloads
        resolved_data_connections = []
        
        for conn in data_connections_raw:
            data_key = conn.get('dataKey')
            if not data_key:
                continue
            
            # Find dataset in database by dataKey
            # First try to find by user ownership
            dataset = db.query(Dataset).filter(
                Dataset.data_key == data_key,
                Dataset.user_id == current_user.id
            ).first()
            
            # If not found, check if user has access via project sharing
            if not dataset:
                dataset = db.query(Dataset).filter(Dataset.data_key == data_key).first()
                if dataset and dataset.project_id:
                    # Check if user has access to the project
                    project, _, _ = check_project_access(dataset.project_id, current_user.id, db)
                    if not project:
                        dataset = None  # User doesn't have access
            
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
        
        # If execution was successful, save the result as a dataset
        if result.get('status') == 'success':
            try:
                from app.services.pipeline_output_storage import persist_execution_sqlite_as_dataset

                pipeline_id = pipeline.get('id')
                project_id = pipeline.get('projectId')
                saved_pipeline = None
                if pipeline_id:
                    saved_pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()

                if saved_pipeline or project_id:
                    execution_results = result.get('executionResults', [])
                    if execution_results:
                        final_result = execution_results[-1]
                        output_data_key = final_result.get('output_data_key')
                        if output_data_key:
                            output_dataset, save_err = persist_execution_sqlite_as_dataset(
                                db,
                                output_data_key,
                                current_user,
                                project_id,
                                pipeline_id=pipeline_id,
                                pipeline_name_hint=pipeline.get('name'),
                                output_schema=result.get('outputSchema', []),
                                row_count_override=result.get('outputRows'),
                            )
                            if output_dataset and not save_err:
                                result['outputDataset'] = {
                                    'id': output_dataset.id,
                                    'name': output_dataset.name,
                                    'dataKey': output_dataset.data_key,
                                    'rowCount': output_dataset.row_count,
                                }
                            elif save_err:
                                print(
                                    f"Warning: Failed to save pipeline output as dataset: {save_err}"
                                )
            except Exception as e:
                print(f"Warning: Failed to save pipeline output as dataset: {str(e)}")
                import traceback
                traceback.print_exc()
        
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
    project_id = pipeline.get("projectId")
    
    # If project_id is specified, check if user has edit access
    if project_id:
        if not user_can_edit_project(project_id, current_user.id, db):
            raise HTTPException(status_code=403, detail="You don't have permission to save pipelines in this project")
    
    # Check if pipeline exists (owned by user OR in a project user can edit)
    existing = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if existing:
        # Check if user can edit this pipeline
        can_edit = existing.user_id == current_user.id
        if not can_edit and existing.project_id:
            can_edit = user_can_edit_project(existing.project_id, current_user.id, db)
        
        if not can_edit:
            # Create a new pipeline instead of updating
            existing = None
    
    if existing:
        # Update existing
        existing.name = pipeline.get("name", existing.name)
        existing.definition = pipeline
        existing.updated_at = datetime.now()
        if project_id:
            existing.project_id = project_id
        db.commit()
        db.refresh(existing)
        
        # Handle updated_at which should be set after update
        updated_at = existing.updated_at
        if updated_at is None:
            updated_at = existing.created_at
        
        return {
            "id": existing.id,
            "name": existing.name,
            "projectId": existing.project_id,
            "definition": existing.definition,
            "createdAt": existing.created_at.isoformat(),
            "updatedAt": updated_at.isoformat()
        }
    else:
        # Create new
        new_pipeline = Pipeline(
            id=pipeline_id,
            user_id=current_user.id,
            project_id=project_id,
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
            "projectId": new_pipeline.project_id,
            "definition": new_pipeline.definition,
            "createdAt": new_pipeline.created_at.isoformat(),
            "updatedAt": updated_at.isoformat()
        }

@app.get("/api/pipelines")
async def get_pipelines(
    project_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all saved pipelines for the current user, optionally filtered by project"""
    if project_id:
        # Check if user has access to this project
        project, is_owner, permission = check_project_access(project_id, current_user.id, db)
        if not project:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
        
        # Get all pipelines for this project (regardless of who created them)
        pipelines = db.query(Pipeline).filter(Pipeline.project_id == project_id).all()
    else:
        # Get only user's own pipelines when no project specified
        pipelines = db.query(Pipeline).filter(Pipeline.user_id == current_user.id).all()
    
    return {
        "pipelines": [
            {
                "id": p.id,
                "name": p.name,
                "projectId": p.project_id,
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
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check access: user owns the pipeline OR has access to its project
    has_access = pipeline.user_id == current_user.id
    if not has_access and pipeline.project_id:
        project, _, _ = check_project_access(pipeline.project_id, current_user.id, db)
        has_access = project is not None
    
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this pipeline")
    
    return {
        "id": pipeline.id,
        "name": pipeline.name,
        "definition": pipeline.definition,
        "createdAt": pipeline.created_at.isoformat(),
        "updatedAt": (pipeline.updated_at or pipeline.created_at).isoformat()
    }

@app.delete("/api/pipelines/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a pipeline"""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check access: user owns the pipeline OR has edit access to its project
    can_delete = pipeline.user_id == current_user.id
    if not can_delete and pipeline.project_id:
        can_delete = user_can_edit_project(pipeline.project_id, current_user.id, db)
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this pipeline")
    
    db.delete(pipeline)
    db.commit()
    
    return {"message": "Pipeline deleted successfully", "id": pipeline_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
