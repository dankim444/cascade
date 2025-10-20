#!/usr/bin/env python3
"""
Create test data for the transformation system
"""

import sqlite3
import pandas as pd
import os

def create_test_data():
    """Create test data in SQLite database"""
    
    # Create data directory if it doesn't exist
    os.makedirs("backend/data", exist_ok=True)
    
    # Create test data
    test_data = {
        'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
        'age': [25, 30, 35, 28, 32, 45, 29, 38],
        'city': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'],
        'salary': [50000, 60000, 70000, 55000, 65000, 80000, 58000, 75000]
    }
    
    df = pd.DataFrame(test_data)
    
    # Create SQLite database
    db_path = "backend/data/test_data.db"
    conn = sqlite3.connect(db_path)
    
    # Store data in SQLite
    df.to_sql('data', conn, if_exists='replace', index=False)
    
    # Get row count
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM data")
    row_count = cursor.fetchone()[0]
    
    print(f"Created test data with {row_count} rows")
    print(f"Database saved to: {db_path}")
    
    # Show sample data
    cursor.execute("SELECT * FROM data LIMIT 5")
    rows = cursor.fetchall()
    column_names = [desc[0] for desc in cursor.description]
    
    print("\nSample data:")
    for row in rows:
        print(dict(zip(column_names, row)))
    
    conn.close()
    return db_path

if __name__ == "__main__":
    create_test_data()
