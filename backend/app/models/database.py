from sqlalchemy import create_engine, Column, String, Integer, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    data_key = Column(String, unique=True, nullable=False)
    columns = Column(JSON, nullable=False)  # Array of column objects
    row_count = Column(Integer, nullable=False)
    preview = Column(JSON)  # First 10 rows
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    s3_key = Column(String)  # For future S3 migration

class Pipeline(Base):
    __tablename__ = "pipelines"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    nodes = Column(JSON, nullable=False)  # FlowNode[]
    edges = Column(JSON, nullable=False)  # FlowEdge[]
    data_connections = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String)  # For future auth

class DataConnection(Base):
    __tablename__ = "data_connections"
    
    data_key = Column(String, primary_key=True)
    sql_connection = Column(String, nullable=False)  # Path to SQLite or S3 key
    schema = Column(JSON, nullable=False)
    row_count = Column(Integer, nullable=False)
    last_accessed = Column(DateTime, default=datetime.utcnow)
    s3_key = Column(String)  # For future S3 migration

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()