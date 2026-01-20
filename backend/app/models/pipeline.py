"""
Pipeline model for storing saved pipelines
"""
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Pipeline(Base):
    __tablename__ = "pipelines"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Pipeline definition (nodes, edges, etc.)
    definition = Column(JSON, nullable=False)
    
    # Output dataset (the transformed result saved as a dataset)
    output_dataset_id = Column(String, ForeignKey("datasets.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="pipelines")
    project = relationship("Project", back_populates="pipelines")
    output_dataset = relationship("Dataset", foreign_keys=[output_dataset_id], uselist=False)

