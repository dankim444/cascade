from pathlib import Path

from dotenv import load_dotenv

# Load .env before any import that reads DATABASE_URL (app.core.database).
# override=True: backend/.env should win over a stale DATABASE_URL from the shell/IDE.
_backend_root = Path(__file__).resolve().parent.parent
load_dotenv(_backend_root / ".env", override=True)

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
import math
import os
from app.transformations.executor_fixed import TransformationExecutor
from app.services.pipeline_validation import (
    prepare_pipeline_for_execution,
    validate_pipeline_payload,
)
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
from app.middleware.permissive_cors import PermissiveCORSMiddleware

app = FastAPI(
    title="Cascade API",
    description="Backend API for Cascade - No-Code Data Platform",
    version="2.0.0"
)

# CORS: echo Origin, handle OPTIONS, Private-Network preflight (e.g. localhost → EC2)
app.add_middleware(PermissiveCORSMiddleware)

# Include routers
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(projects_router)
app.include_router(presence_router)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Create data directory if it doesn't exist (for temporary files)
os.makedirs("data", exist_ok=True)


def _sanitize_non_finite_numbers(value: Any) -> Any:
    """Convert NaN/Infinity to None so JSON encoding never fails."""
    if isinstance(value, dict):
        return {k: _sanitize_non_finite_numbers(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_non_finite_numbers(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_non_finite_numbers(item) for item in value]
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return value
    # Handle numpy scalar values without requiring numpy import here.
    if hasattr(value, "item"):
        try:
            scalar = value.item()
            if isinstance(scalar, float) and not math.isfinite(scalar):
                return None
            return scalar
        except Exception:
            return value
    return value

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
    temp_files_to_cleanup: List[str] = []

    try:
        nodes, resolved_data_connections, temp_files, verrs = prepare_pipeline_for_execution(
            db, current_user, pipeline
        )
        temp_files_to_cleanup.extend(temp_files)

        if verrs:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Pipeline validation failed",
                    "errors": verrs,
                },
            )

        executor = TransformationExecutor(resolved_data_connections)
        result = executor.execute_pipeline(nodes, resolved_data_connections)
        
        # If execution was successful, optionally persist full output as a dataset (Run Pipeline only).
        persist_output = pipeline.get('persistOutputAsDataset', True)
        if result.get('status') == 'success' and persist_output:
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
        
        return _sanitize_non_finite_numbers(result)
        
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

    if pipeline.get("flowNodes") is not None or pipeline.get("nodes") is not None:
        ok, errors = validate_pipeline_payload(db, current_user, pipeline)
        if not ok:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Pipeline validation failed",
                    "errors": errors,
                },
            )
    
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


class CommitNodeBody(BaseModel):
    node_id: str
    node: Dict[str, Any]


@app.post("/api/pipelines/{pipeline_id}/commit-node")
async def commit_pipeline_node(
    pipeline_id: str,
    body: CommitNodeBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Merge one node into the saved pipeline definition, validate full graph, then persist."""
    pipeline_row = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline_row:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    can_edit = pipeline_row.user_id == current_user.id
    if not can_edit and pipeline_row.project_id:
        can_edit = user_can_edit_project(pipeline_row.project_id, current_user.id, db)
    if not can_edit:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this pipeline")

    definition = dict(pipeline_row.definition or {})
    flow_nodes = list(definition.get("flowNodes") or [])
    found = False
    for i, n in enumerate(flow_nodes):
        if n.get("id") == body.node_id:
            flow_nodes[i] = body.node
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Node not found in pipeline")

    definition["flowNodes"] = flow_nodes
    merged: Dict[str, Any] = {
        **definition,
        "id": pipeline_id,
        "name": pipeline_row.name,
        "projectId": pipeline_row.project_id or definition.get("projectId"),
    }

    ok, errors = validate_pipeline_payload(db, current_user, merged)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Pipeline validation failed",
                "errors": errors,
            },
        )

    pipeline_row.definition = merged
    pipeline_row.updated_at = datetime.now()
    db.commit()
    db.refresh(pipeline_row)

    updated_at = pipeline_row.updated_at or pipeline_row.created_at
    return {
        "id": pipeline_row.id,
        "name": pipeline_row.name,
        "projectId": pipeline_row.project_id,
        "definition": pipeline_row.definition,
        "createdAt": pipeline_row.created_at.isoformat(),
        "updatedAt": updated_at.isoformat(),
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
