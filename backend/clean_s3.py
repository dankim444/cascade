#!/usr/bin/env python3
"""
Clean S3 storage script - removes all files from S3 bucket
"""
import sys
import os
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.s3_service import get_s3_service
import boto3
from botocore.exceptions import ClientError

def clean_s3():
    """Remove all objects from S3 bucket"""
    load_dotenv()
    
    # Get the actual S3 service instance (not proxy)
    s3_service = get_s3_service()
    
    print("=" * 50)
    print("S3 Storage Cleanup Script")
    print("=" * 50)
    print(f"Bucket: {s3_service.bucket_name}")
    print(f"Region: {s3_service.region}")
    print()
    
    try:
        # List all objects in the bucket
        print("Listing objects in S3 bucket...")
        objects_to_delete = []
        
        paginator = s3_service.s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=s3_service.bucket_name)
        
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects_to_delete.append({'Key': obj['Key']})
                    print(f"  Found: {obj['Key']} ({obj['Size']} bytes)")
        
        if not objects_to_delete:
            print("  No objects found in bucket")
            print()
            print("=" * 50)
            print("✅ S3 bucket is already empty!")
            print("=" * 50)
            return
        
        print()
        print(f"Total objects to delete: {len(objects_to_delete)}")
        print()
        
        # Ask for confirmation (allow skipping with --yes flag)
        import sys
        skip_confirmation = '--yes' in sys.argv
        
        if not skip_confirmation:
            response = input("Are you sure you want to delete ALL objects? (yes/no): ")
            if response.lower() != 'yes':
                print("Cancelled.")
                return
        
        # Delete objects in batches (S3 allows up to 1000 per request)
        print()
        print("Deleting objects...")
        deleted_count = 0
        
        for i in range(0, len(objects_to_delete), 1000):
            batch = objects_to_delete[i:i+1000]
            response = s3_service.s3_client.delete_objects(
                Bucket=s3_service.bucket_name,
                Delete={
                    'Objects': batch,
                    'Quiet': True
                }
            )
            
            # Count deleted objects
            if 'Deleted' in response:
                deleted_count += len(response['Deleted'])
                print(f"  ✓ Deleted batch {i//1000 + 1} ({len(response['Deleted'])} objects)")
            
            # Check for errors
            if 'Errors' in response and response['Errors']:
                for error in response['Errors']:
                    print(f"  ✗ Error deleting {error['Key']}: {error['Message']}")
        
        print()
        print("=" * 50)
        print("✅ S3 cleanup completed!")
        print("=" * 50)
        print()
        print(f"Summary:")
        print(f"  Objects deleted: {deleted_count}")
        print(f"  Bucket: {s3_service.bucket_name}")
        
    except ClientError as e:
        print(f"\n❌ AWS Error: {e}")
        print(f"Error Code: {e.response['Error']['Code']}")
        print(f"Error Message: {e.response['Error']['Message']}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    clean_s3()

