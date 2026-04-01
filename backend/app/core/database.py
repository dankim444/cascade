"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL - using SQLite for now, can be upgraded to PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cascade.db")


def _connect_args(url: str) -> dict:
    if "sqlite" in url:
        return {"check_same_thread": False}
    scheme = url.split("://", 1)[0].lower() if "://" in url else ""
    # RDS rejects non-SSL clients (pg_hba "no encryption"); libpq may also try GSSAPI on macOS.
    if "rds.amazonaws.com" in url and "postgres" in scheme:
        return {"sslmode": "require", "gssencmode": "disable"}
    return {}


# Create engine
engine = create_engine(DATABASE_URL, connect_args=_connect_args(DATABASE_URL))

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    from app.models import User, Project, Dataset, Pipeline, SavedGraph
    Base.metadata.create_all(bind=engine)

