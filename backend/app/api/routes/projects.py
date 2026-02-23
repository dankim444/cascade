"""
Project routes for managing user projects
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_share import ProjectShare, SharePermission
from app.models.dataset import Dataset
from app.models.pipeline import Pipeline
from app.models.saved_graph import SavedGraph

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    dataset_count: int
    pipeline_count: int
    graph_count: int

    class Config:
        from_attributes = True


class ShareProjectRequest(BaseModel):
    email: EmailStr
    permission: str = "view"  # view, edit, or admin


class ShareResponse(BaseModel):
    id: str
    email: str
    permission: str
    sharedAt: str


class ProjectShareInfo(BaseModel):
    id: str
    sharedWithEmail: str
    sharedByEmail: str
    permission: str
    sharedAt: str


@router.post("")
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    project = Project(
        user_id=current_user.id,
        name=project_data.name,
        description=project_data.description
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "createdAt": project.created_at.isoformat(),
        "updatedAt": project.updated_at.isoformat(),
        "datasetCount": 0,
        "pipelineCount": 0,
        "graphCount": 0
    }


@router.get("")
async def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects for the current user (owned and shared)"""
    # Get owned projects
    owned_projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.updated_at.desc()).all()
    
    # Get shared projects
    shared_project_ids = db.query(ProjectShare.project_id).filter(
        ProjectShare.shared_with_user_id == current_user.id
    ).all()
    shared_project_ids = [p[0] for p in shared_project_ids]
    
    shared_projects = db.query(Project).filter(Project.id.in_(shared_project_ids)).order_by(Project.updated_at.desc()).all() if shared_project_ids else []
    
    result = []
    
    # Add owned projects
    for project in owned_projects:
        dataset_count = db.query(Dataset).filter(Dataset.project_id == project.id).count()
        pipeline_count = db.query(Pipeline).filter(Pipeline.project_id == project.id).count()
        graph_count = db.query(SavedGraph).filter(SavedGraph.project_id == project.id).count()
        
        result.append({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "createdAt": project.created_at.isoformat(),
            "updatedAt": project.updated_at.isoformat(),
            "datasetCount": dataset_count,
            "pipelineCount": pipeline_count,
            "graphCount": graph_count,
            "isOwner": True,
            "ownerEmail": current_user.email
        })
    
    # Add shared projects
    for project in shared_projects:
        dataset_count = db.query(Dataset).filter(Dataset.project_id == project.id).count()
        pipeline_count = db.query(Pipeline).filter(Pipeline.project_id == project.id).count()
        graph_count = db.query(SavedGraph).filter(SavedGraph.project_id == project.id).count()
        
        # Get the share info
        share = db.query(ProjectShare).filter(
            ProjectShare.project_id == project.id,
            ProjectShare.shared_with_user_id == current_user.id
        ).first()
        
        # Get owner email
        owner = db.query(User).filter(User.id == project.user_id).first()
        
        result.append({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "createdAt": project.created_at.isoformat(),
            "updatedAt": project.updated_at.isoformat(),
            "datasetCount": dataset_count,
            "pipelineCount": pipeline_count,
            "graphCount": graph_count,
            "isOwner": False,
            "ownerEmail": owner.email if owner else "Unknown",
            "permission": share.permission if share else "view"
        })
    
    return {"projects": result}


def get_project_access(project_id: str, user_id: str, db: Session):
    """Helper function to check if user has access to a project and return access info"""
    # Check if user owns the project
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        return None, None, None
    
    if project.user_id == user_id:
        return project, True, "admin"
    
    # Check if project is shared with user
    share = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id,
        ProjectShare.shared_with_user_id == user_id
    ).first()
    
    if share:
        return project, False, share.permission
    
    return None, None, None


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific project with its contents"""
    project, is_owner, permission = get_project_access(project_id, current_user.id, db)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get project contents
    datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
    pipelines = db.query(Pipeline).filter(Pipeline.project_id == project_id).all()
    graphs = db.query(SavedGraph).filter(SavedGraph.project_id == project_id).all()
    
    # Get shares for this project (only if owner or admin)
    shares = []
    if is_owner or permission == "admin":
        share_records = db.query(ProjectShare).filter(ProjectShare.project_id == project_id).all()
        for share in share_records:
            shared_with = db.query(User).filter(User.id == share.shared_with_user_id).first()
            shared_by = db.query(User).filter(User.id == share.shared_by_user_id).first()
            shares.append({
                "id": share.id,
                "sharedWithEmail": shared_with.email if shared_with else "Unknown",
                "sharedByEmail": shared_by.email if shared_by else "Unknown",
                "permission": share.permission,
                "sharedAt": share.created_at.isoformat()
            })
    
    # Get owner info
    owner = db.query(User).filter(User.id == project.user_id).first()
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "createdAt": project.created_at.isoformat(),
        "updatedAt": project.updated_at.isoformat(),
        "isOwner": is_owner,
        "permission": permission,
        "ownerEmail": owner.email if owner else "Unknown",
        "shares": shares,
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
        ],
        "pipelines": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "createdAt": p.created_at.isoformat(),
                "updatedAt": p.updated_at.isoformat()
            }
            for p in pipelines
        ],
        "graphs": [
            {
                "id": g.id,
                "name": g.name,
                "config": g.config,
                "dataKey": g.data_key,
                "createdAt": g.created_at.isoformat()
            }
            for g in graphs
        ]
    }


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    
    db.commit()
    db.refresh(project)
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "createdAt": project.created_at.isoformat(),
        "updatedAt": project.updated_at.isoformat()
    }


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project and all its contents"""
    from app.services.s3_service import s3_service
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Delete all datasets' S3 files
        datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
        for dataset in datasets:
            if dataset.s3_csv_path:
                s3_service.delete_file(dataset.s3_csv_path)
            if dataset.s3_db_path:
                s3_service.delete_file(dataset.s3_db_path)
        
        # Delete project (cascades to datasets, pipelines, graphs)
        db.delete(project)
        db.commit()
        
        return {"message": "Project deleted successfully", "id": project_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting project: {str(e)}"
        )


# ============== Project Sharing Endpoints ==============

@router.post("/{project_id}/share")
async def share_project(
    project_id: str,
    share_data: ShareProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a project with another user by email"""
    # Check if user has permission to share (owner or admin)
    project, is_owner, permission = get_project_access(project_id, current_user.id, db)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not is_owner and permission != "admin":
        raise HTTPException(status_code=403, detail="You don't have permission to share this project")
    
    # Validate permission value
    valid_permissions = ["view", "edit", "admin"]
    if share_data.permission not in valid_permissions:
        raise HTTPException(status_code=400, detail=f"Invalid permission. Must be one of: {valid_permissions}")
    
    # Find the user to share with
    share_with_user = db.query(User).filter(User.email == share_data.email).first()
    
    if not share_with_user:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    # Can't share with yourself
    if share_with_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot share a project with yourself")
    
    # Can't share with the owner
    if share_with_user.id == project.user_id:
        raise HTTPException(status_code=400, detail="Cannot share project with its owner")
    
    # Check if already shared
    existing_share = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id,
        ProjectShare.shared_with_user_id == share_with_user.id
    ).first()
    
    if existing_share:
        # Update existing share permission
        existing_share.permission = share_data.permission
        db.commit()
        db.refresh(existing_share)
        
        return {
            "id": existing_share.id,
            "email": share_data.email,
            "permission": existing_share.permission,
            "sharedAt": existing_share.created_at.isoformat(),
            "message": "Share permission updated"
        }
    
    # Create new share
    new_share = ProjectShare(
        project_id=project_id,
        shared_with_user_id=share_with_user.id,
        shared_by_user_id=current_user.id,
        permission=share_data.permission
    )
    
    db.add(new_share)
    db.commit()
    db.refresh(new_share)
    
    return {
        "id": new_share.id,
        "email": share_data.email,
        "permission": new_share.permission,
        "sharedAt": new_share.created_at.isoformat(),
        "message": "Project shared successfully"
    }


@router.get("/{project_id}/shares")
async def get_project_shares(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all shares for a project"""
    project, is_owner, permission = get_project_access(project_id, current_user.id, db)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not is_owner and permission != "admin":
        raise HTTPException(status_code=403, detail="You don't have permission to view shares for this project")
    
    shares = db.query(ProjectShare).filter(ProjectShare.project_id == project_id).all()
    
    result = []
    for share in shares:
        shared_with = db.query(User).filter(User.id == share.shared_with_user_id).first()
        shared_by = db.query(User).filter(User.id == share.shared_by_user_id).first()
        
        result.append({
            "id": share.id,
            "sharedWithEmail": shared_with.email if shared_with else "Unknown",
            "sharedByEmail": shared_by.email if shared_by else "Unknown",
            "permission": share.permission,
            "sharedAt": share.created_at.isoformat()
        })
    
    return {"shares": result}


@router.put("/{project_id}/shares/{share_id}")
async def update_share(
    project_id: str,
    share_id: str,
    share_data: ShareProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a share's permission"""
    project, is_owner, permission = get_project_access(project_id, current_user.id, db)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not is_owner and permission != "admin":
        raise HTTPException(status_code=403, detail="You don't have permission to update shares for this project")
    
    share = db.query(ProjectShare).filter(
        ProjectShare.id == share_id,
        ProjectShare.project_id == project_id
    ).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    
    # Validate permission value
    valid_permissions = ["view", "edit", "admin"]
    if share_data.permission not in valid_permissions:
        raise HTTPException(status_code=400, detail=f"Invalid permission. Must be one of: {valid_permissions}")
    
    share.permission = share_data.permission
    db.commit()
    db.refresh(share)
    
    shared_with = db.query(User).filter(User.id == share.shared_with_user_id).first()
    
    return {
        "id": share.id,
        "email": shared_with.email if shared_with else "Unknown",
        "permission": share.permission,
        "sharedAt": share.created_at.isoformat(),
        "message": "Share updated successfully"
    }


@router.delete("/{project_id}/shares/{share_id}")
async def remove_share(
    project_id: str,
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a share (unshare project with a user)"""
    project, is_owner, permission = get_project_access(project_id, current_user.id, db)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Allow owner, admin, or the user who was shared with to remove the share
    share = db.query(ProjectShare).filter(
        ProjectShare.id == share_id,
        ProjectShare.project_id == project_id
    ).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    
    # Check permission: owner, admin, or the shared user can remove
    can_remove = is_owner or permission == "admin" or share.shared_with_user_id == current_user.id
    
    if not can_remove:
        raise HTTPException(status_code=403, detail="You don't have permission to remove this share")
    
    db.delete(share)
    db.commit()
    
    return {"message": "Share removed successfully", "id": share_id}

