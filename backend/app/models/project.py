"""
Project model for organizing user work
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="projects")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    pipelines = relationship("Pipeline", back_populates="project", cascade="all, delete-orphan")
    saved_graphs = relationship("SavedGraph", back_populates="project", cascade="all, delete-orphan")

