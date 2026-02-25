"""
Saved graphs API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.project_access import check_project_access, user_can_edit_project
from app.models.saved_graph import SavedGraph
from app.models.user import User
from app.core.security import get_current_user
from app.api.routes.presence import presence_manager

router = APIRouter()

class SaveGraphRequest(BaseModel):
    name: str
    config: Dict[str, Any]
    data_key: str
    project_id: Optional[str] = None

class SavedGraphResponse(BaseModel):
    id: str
    name: str
    config: Dict[str, Any]
    data_key: str
    project_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

@router.post("", response_model=Dict[str, str])
async def save_graph(
    request: SaveGraphRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a graph configuration for the current user"""
    try:
        # If saving to a project, require edit access to that project
        if request.project_id and not user_can_edit_project(request.project_id, current_user.id, db):
            raise HTTPException(status_code=403, detail="You don't have permission to save graphs in this project")

        saved_graph = SavedGraph(
            user_id=current_user.id,
            project_id=request.project_id,
            name=request.name,
            config=request.config,
            data_key=request.data_key
        )
        
        db.add(saved_graph)
        db.commit()
        db.refresh(saved_graph)

        if request.project_id:
            await presence_manager.broadcast_visualization_changed(
                request.project_id,
                "created",
                saved_graph.id
            )
        
        return {
            "id": saved_graph.id,
            "message": "Graph saved successfully"
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error saving graph: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving graph: {str(e)}")

@router.get("", response_model=List[SavedGraphResponse])
async def get_saved_graphs(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get saved graphs (project-scoped for collaborators, user-scoped otherwise)"""
    try:
        if project_id:
            # For project-scoped queries, include all graphs in the project
            project, _, _ = check_project_access(project_id, current_user.id, db)
            if not project:
                raise HTTPException(status_code=403, detail="You don't have access to this project")
            query = db.query(SavedGraph).filter(SavedGraph.project_id == project_id)
        else:
            # Without project_id, return current user's personal graphs
            query = db.query(SavedGraph).filter(SavedGraph.user_id == current_user.id)
        
        graphs = query.order_by(SavedGraph.created_at.desc()).all()
        
        return [
            SavedGraphResponse(
                id=graph.id,
                name=graph.name,
                config=graph.config,
                data_key=graph.data_key,
                project_id=graph.project_id,
                created_at=graph.created_at.isoformat(),
                updated_at=graph.updated_at.isoformat() if graph.updated_at else None
            )
            for graph in graphs
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching saved graphs: {str(e)}")

@router.delete("/{graph_id}", response_model=Dict[str, str])
async def delete_saved_graph(
    graph_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved graph"""
    try:
        graph = db.query(SavedGraph).filter(SavedGraph.id == graph_id).first()
        
        if not graph:
            raise HTTPException(status_code=404, detail="Saved graph not found")

        # If this graph belongs to a project, user must have edit access
        if graph.project_id and not user_can_edit_project(graph.project_id, current_user.id, db):
            raise HTTPException(
                status_code=403,
                detail="You have view-only access to this project. You need edit or admin permission to delete visualizations."
            )

        # Keep creator ownership rule for deletes
        if graph.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete visualizations that you created."
            )
        
        db.delete(graph)
        db.commit()

        if graph.project_id:
            await presence_manager.broadcast_visualization_changed(
                graph.project_id,
                "deleted",
                graph.id
            )
        
        return {"message": "Graph deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting graph: {str(e)}")

@router.put("/{graph_id}", response_model=Dict[str, str])
async def update_saved_graph(
    graph_id: str,
    request: SaveGraphRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a saved graph"""
    try:
        graph = db.query(SavedGraph).filter(
            SavedGraph.id == graph_id,
            SavedGraph.user_id == current_user.id  # Security: only update own graphs
        ).first()
        
        if not graph:
            raise HTTPException(status_code=404, detail="Saved graph not found")
        
        graph.name = request.name
        graph.config = request.config
        graph.data_key = request.data_key
        
        db.commit()

        if graph.project_id:
            await presence_manager.broadcast_visualization_changed(
                graph.project_id,
                "updated",
                graph.id
            )
        
        return {"message": "Graph updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating graph: {str(e)}")
