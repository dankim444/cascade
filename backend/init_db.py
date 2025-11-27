"""
Initialize the database - run this once to create tables
"""
from app.core.database import engine, Base
from app.models import User, Dataset, Pipeline, SavedGraph

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    
    # Import all models to ensure they're registered with Base
    from app.models import User, Dataset, Pipeline, SavedGraph
    
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
    
    # Specifically check for saved_graphs
    if 'saved_graphs' in tables:
        print("✅ saved_graphs table ready for user-based graph storage!")
    else:
        print("⚠️  saved_graphs table not found - check SavedGraph model import")

if __name__ == "__main__":
    init_db()

