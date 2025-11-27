"""
Saved graphs API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.saved_graph import SavedGraph
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()

class SaveGraphRequest(BaseModel):
    name: str
    config: Dict[str, Any]
    data_key: str

class SavedGraphResponse(BaseModel):
    id: str
    name: str
    config: Dict[str, Any]
    data_key: str
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
        saved_graph = SavedGraph(
            user_id=current_user.id,
            name=request.name,
            config=request.config,
            data_key=request.data_key
        )
        
        db.add(saved_graph)
        db.commit()
        db.refresh(saved_graph)
        
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all saved graphs for the current user"""
    try:
        graphs = db.query(SavedGraph).filter(
            SavedGraph.user_id == current_user.id
        ).order_by(SavedGraph.created_at.desc()).all()
        
        return [
            SavedGraphResponse(
                id=graph.id,
                name=graph.name,
                config=graph.config,
                data_key=graph.data_key,
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
        graph = db.query(SavedGraph).filter(
            SavedGraph.id == graph_id,
            SavedGraph.user_id == current_user.id  # Security: only delete own graphs
        ).first()
        
        if not graph:
            raise HTTPException(status_code=404, detail="Saved graph not found")
        
        db.delete(graph)
        db.commit()
        
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
        
        return {"message": "Graph updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating graph: {str(e)}")
