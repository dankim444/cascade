"""
Migration script to add pipeline_id to datasets and output_dataset_id to pipelines
"""
import sqlite3
from app.core.database import engine
from sqlalchemy import inspect, text

def migrate():
    """Add missing columns to existing tables"""
    print("Running migration: Adding pipeline fields...")
    
    # Get database connection
    conn = engine.connect()
    
    try:
        # Check if datasets table has pipeline_id column
        inspector = inspect(engine)
        datasets_columns = [col['name'] for col in inspector.get_columns('datasets')]
        
        if 'pipeline_id' not in datasets_columns:
            print("Adding pipeline_id column to datasets table...")
            conn.execute(text("ALTER TABLE datasets ADD COLUMN pipeline_id VARCHAR"))
            conn.commit()
            print("✅ Added pipeline_id to datasets")
        else:
            print("✅ pipeline_id already exists in datasets")
        
        # Check if pipelines table has output_dataset_id column
        pipelines_columns = [col['name'] for col in inspector.get_columns('pipelines')]
        
        if 'output_dataset_id' not in pipelines_columns:
            print("Adding output_dataset_id column to pipelines table...")
            conn.execute(text("ALTER TABLE pipelines ADD COLUMN output_dataset_id VARCHAR"))
            conn.commit()
            print("✅ Added output_dataset_id to pipelines")
        else:
            print("✅ output_dataset_id already exists in pipelines")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()


