"""
Initialize the database - run this once to create tables
WARNING: This will drop all existing tables and recreate them from scratch!
"""
from app.core.database import engine, Base
from app.models import User, Project, ProjectShare, Dataset, Pipeline, SavedGraph

def init_db():
    """Drop all existing tables and create all database tables from scratch"""
    print("=" * 60)
    print("🗄️  Database Initialization")
    print("=" * 60)
    print("⚠️  WARNING: This will DELETE all existing tables and data!")
    print()
    
    # Import all models to ensure they're registered with Base
    from app.models import User, Project, ProjectShare, Dataset, Pipeline, SavedGraph
    
    # Check existing tables
    import sqlalchemy
    inspector = sqlalchemy.inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if existing_tables:
        print(f"📋 Found {len(existing_tables)} existing table(s):")
        for table in sorted(existing_tables):
            print(f"   - {table}")
        print()
        print("🗑️  Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        print("✅ All existing tables dropped!")
        print()
    
    print("🔨 Creating database tables from scratch...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Verify tables were created
    inspector = sqlalchemy.inspect(engine)
    tables = inspector.get_table_names()
    
    print("✅ Database tables created successfully!")
    print()
    print("📋 Created tables:")
    for table in sorted(tables):
        print(f"   ✓ {table}")
    print()
    
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
    
    print()
    print("=" * 60)
    print("✅ Database initialization complete!")
    print("=" * 60)

if __name__ == "__main__":
    init_db()

