#!/usr/bin/env python3
"""
Clean database script - removes all records but keeps table structure
"""
import sys
import os
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from app.core.database import DATABASE_URL

def clean_database():
    """Remove all records from all tables while keeping table structure"""
    load_dotenv()
    
    print("=" * 50)
    print("Database Cleanup Script")
    print("=" * 50)
    print(f"Database: {DATABASE_URL}")
    print()
    
    # Create engine
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
    
    # Get all table names
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        tables = [row[0] for row in result.fetchall()]
        
        # Filter out system tables
        user_tables = [t for t in tables if t != 'sqlite_master']
        
        if not user_tables:
            print("No tables found to clean.")
            return
        
        print(f"Found {len(user_tables)} tables: {', '.join(user_tables)}")
        print()
        
        # Count records before deletion
        print("Records before deletion:")
        counts_before = {}
        for table in user_tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.fetchone()[0]
            counts_before[table] = count
            print(f"  {table}: {count} records")
        print()
        
        # Delete all records
        print("Deleting records...")
        for table in user_tables:
            conn.execute(text(f"DELETE FROM {table}"))
            print(f"  ✓ Cleared {table}")
        
        conn.commit()
        print()
        
        # Count records after deletion
        print("Records after deletion:")
        for table in user_tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.fetchone()[0]
            print(f"  {table}: {count} records")
        print()
        
        # Verify table structure
        print("Table structures (verified):")
        for table in user_tables:
            result = conn.execute(text(f"PRAGMA table_info({table})"))
            columns = result.fetchall()
            print(f"  {table}: {len(columns)} columns")
        print()
        
        print("=" * 50)
        print("✅ Database cleaned successfully!")
        print("=" * 50)
        print()
        print("Summary:")
        total_before = sum(counts_before.values())
        print(f"  Total records deleted: {total_before}")
        print(f"  Tables cleaned: {len(user_tables)}")
        print(f"  Table structures: Preserved ✓")

if __name__ == "__main__":
    try:
        clean_database()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

