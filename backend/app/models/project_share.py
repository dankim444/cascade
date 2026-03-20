"""
ProjectShare model for sharing projects between users
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum


class SharePermission(str, enum.Enum):
    VIEW = "view"  # Can view project and its contents
    EDIT = "edit"  # Can view and edit project contents
    ADMIN = "admin"  # Can view, edit, and manage sharing


class ProjectShare(Base):
    __tablename__ = "project_shares"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_with_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_by_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String, default=SharePermission.VIEW.value, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="shares")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id], backref="shared_projects")
    shared_by_user = relationship("User", foreign_keys=[shared_by_user_id])
    
    # Ensure a project can only be shared once with each user
    __table_args__ = (
        UniqueConstraint('project_id', 'shared_with_user_id', name='unique_project_share'),
    )

