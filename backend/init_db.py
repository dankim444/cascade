"""
Initialize the database - run this once to create tables
"""
from dotenv import load_dotenv

load_dotenv()

from app.core.database import engine, Base
from app.models import User, Project, ProjectShare, Dataset, Pipeline, SavedGraph

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    
    # Import all models to ensure they're registered with Base
    from app.models import User, Project, ProjectShare, Dataset, Pipeline, SavedGraph
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Verify tables were created
    import sqlalchemy
    inspector = sqlalchemy.inspect(engine)
    tables = inspector.get_table_names()
    
    print("✅ Database tables created successfully!")
    print("📋 Created tables:")
    for table in sorted(tables):
        print(f"   - {table}")
    
    # Specifically check for projects table
    if 'projects' in tables:
        print("✅ projects table ready for project-based organization!")
    else:
        print("⚠️  projects table not found - check Project model import")
    
    # Check for project_shares table
    if 'project_shares' in tables:
        print("✅ project_shares table ready for project sharing!")
    else:
        print("⚠️  project_shares table not found - check ProjectShare model import")

if __name__ == "__main__":
    init_db()

