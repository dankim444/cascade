"""
Saved graph model for storing user graph configurations
"""
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class SavedGraph(Base):
    __tablename__ = "saved_graphs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    
    # Graph configuration as JSON
    config = Column(JSON, nullable=False)
    
    # Reference to the dataset
    data_key = Column(String, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="saved_graphs")
    project = relationship("Project", back_populates="saved_graphs")
