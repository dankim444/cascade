#!/usr/bin/env python3
"""
Clean everything script - removes all data from database AND S3
"""
import sys
import os
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from clean_db import clean_database
from clean_s3 import clean_s3

def clean_all():
    """Clean both database and S3"""
    load_dotenv()
    
    print("=" * 60)
    print("Complete Cleanup Script")
    print("=" * 60)
    print()
    print("This will:")
    print("  1. Delete all records from the database")
    print("  2. Delete all files from S3 bucket")
    print()
    
    response = input("Are you sure you want to clean EVERYTHING? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    print()
    print("=" * 60)
    print("Step 1: Cleaning Database")
    print("=" * 60)
    print()
    clean_database()
    
    print()
    print("=" * 60)
    print("Step 2: Cleaning S3")
    print("=" * 60)
    print()
    clean_s3()
    
    print()
    print("=" * 60)
    print("✅ Complete cleanup finished!")
    print("=" * 60)

if __name__ == "__main__":
    clean_all()

