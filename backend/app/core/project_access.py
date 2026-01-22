"""
Project access utilities for checking user permissions on projects
"""
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from app.models.project import Project
from app.models.project_share import ProjectShare


def check_project_access(
    project_id: str, 
    user_id: str, 
    db: Session,
    required_permission: Optional[str] = None
) -> Tuple[Optional[Project], bool, Optional[str]]:
    """
    Check if a user has access to a project.
    
    Args:
        project_id: The project ID to check
        user_id: The user ID to check access for
        db: Database session
        required_permission: Optional minimum permission required ('view', 'edit', 'admin')
    
    Returns:
        Tuple of (project, is_owner, permission)
        - project: The Project object if access is granted, None otherwise
        - is_owner: True if the user owns the project
        - permission: The user's permission level ('view', 'edit', 'admin', or None)
    """
    # Check if user owns the project
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        return None, False, None
    
    if project.user_id == user_id:
        # Owner has full access
        return project, True, "admin"
    
    # Check if project is shared with user
    share = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id,
        ProjectShare.shared_with_user_id == user_id
    ).first()
    
    if share:
        # Check if user has required permission
        if required_permission:
            permission_levels = {"view": 1, "edit": 2, "admin": 3}
            user_level = permission_levels.get(share.permission, 0)
            required_level = permission_levels.get(required_permission, 0)
            
            if user_level < required_level:
                return None, False, share.permission
        
        return project, False, share.permission
    
    return None, False, None


def user_has_project_access(project_id: str, user_id: str, db: Session) -> bool:
    """
    Simple check if user has any access to a project.
    
    Args:
        project_id: The project ID to check
        user_id: The user ID to check access for
        db: Database session
    
    Returns:
        True if user has access (owner or shared), False otherwise
    """
    project, _, _ = check_project_access(project_id, user_id, db)
    return project is not None


def user_can_edit_project(project_id: str, user_id: str, db: Session) -> bool:
    """
    Check if user can edit a project (owner, edit, or admin permission).
    
    Args:
        project_id: The project ID to check
        user_id: The user ID to check access for
        db: Database session
    
    Returns:
        True if user can edit, False otherwise
    """
    project, is_owner, permission = check_project_access(project_id, user_id, db)
    
    if not project:
        return False
    
    if is_owner:
        return True
    
    return permission in ("edit", "admin")


