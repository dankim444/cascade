"""
Dataset model for storing dataset metadata
"""
from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    data_key = Column(String, unique=True, nullable=False, index=True)
    
    # S3 storage paths
    s3_csv_path = Column(String, nullable=True)  # Original CSV in S3
    s3_db_path = Column(String, nullable=True)   # SQLite DB in S3
    
    # Metadata
    columns = Column(JSON, nullable=False)  # Schema information
    row_count = Column(Integer, nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="datasets")
    project = relationship("Project", back_populates="datasets")

