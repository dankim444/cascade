"""
AWS S3 service for storing datasets and SQLite databases
"""
import boto3
import os
from typing import Optional
from botocore.exceptions import ClientError
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class S3Service:
    """Service for interacting with AWS S3"""
    
    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "cascade-datasets")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        if not aws_access_key or not aws_secret_key:
            raise ValueError("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in environment variables")
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=self.region
        )
    
    def upload_file(self, file_content: bytes, s3_key: str, content_type: str = "application/octet-stream") -> bool:
        """Upload a file to S3"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type
            )
            return True
        except ClientError as e:
            print(f"Error uploading to S3: {e}")
            return False
    
    def download_file(self, s3_key: str) -> Optional[bytes]:
        """Download a file from S3"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['Body'].read()
        except ClientError as e:
            print(f"Error downloading from S3: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            print(f"Error deleting from S3: {e}")
            return False
    
    def get_presigned_url(
        self,
        s3_key: str,
        expiration: int = 3600,
        response_content_disposition: Optional[str] = None,
    ) -> Optional[str]:
        """Generate a presigned URL for temporary GET access (optional Content-Disposition for downloads)."""
        try:
            params: dict = {"Bucket": self.bucket_name, "Key": s3_key}
            if response_content_disposition:
                params["ResponseContentDisposition"] = response_content_disposition
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None
    
    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists in S3"""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError:
            return False

# Global instance - will be initialized on first use
_s3_service_instance = None

def get_s3_service():
    """Get S3 service instance, creating it if needed"""
    global _s3_service_instance
    if _s3_service_instance is None:
        _s3_service_instance = S3Service()
    return _s3_service_instance

# Proxy object for backward compatibility
class S3ServiceProxy:
    def upload_file(self, *args, **kwargs):
        return get_s3_service().upload_file(*args, **kwargs)
    def download_file(self, *args, **kwargs):
        return get_s3_service().download_file(*args, **kwargs)
    def delete_file(self, *args, **kwargs):
        return get_s3_service().delete_file(*args, **kwargs)
    def get_presigned_url(self, *args, **kwargs):
        return get_s3_service().get_presigned_url(*args, **kwargs)
    def file_exists(self, *args, **kwargs):
        return get_s3_service().file_exists(*args, **kwargs)

s3_service = S3ServiceProxy()

