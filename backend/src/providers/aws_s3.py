"""
AWS S3 Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for AWS S3 storage.
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from pathlib import Path
from typing import List, Dict, Any
from .base import BaseProvider

class AWSS3Provider(BaseProvider):
    """AWS S3 provider."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.bucket_name = config.get('bucket', 'homeserver-backups')
        self.region = config.get('region', 'us-east-1')
        self.access_key = config.get('access_key')
        self.secret_key = config.get('secret_key')
        
        # Initialize S3 client
        try:
            if self.access_key and self.secret_key:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
            else:
                # Use default credentials (IAM role, environment variables, etc.)
                self.s3_client = boto3.client('s3', region_name=self.region)
        except Exception as e:
            print(f"ERROR: Failed to initialize S3 client: {e}")
            self.s3_client = None
    
    def upload(self, file_path: Path, remote_name: str) -> bool:
        """Upload file to S3."""
        if not self.s3_client:
            print("ERROR: S3 client not initialized")
            return False
        
        try:
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                remote_name
            )
            return True
        except ClientError as e:
            print(f"ERROR: Failed to upload {file_path} to S3: {e}")
            return False
        except NoCredentialsError:
            print("ERROR: AWS credentials not found")
            return False
    
    def download(self, remote_name: str, local_path: Path) -> bool:
        """Download file from S3."""
        if not self.s3_client:
            print("ERROR: S3 client not initialized")
            return False
        
        try:
            self.s3_client.download_file(
                self.bucket_name,
                remote_name,
                str(local_path)
            )
            return True
        except ClientError as e:
            print(f"ERROR: Failed to download {remote_name} from S3: {e}")
            return False
        except NoCredentialsError:
            print("ERROR: AWS credentials not found")
            return False
    
    def list_files(self) -> List[Dict[str, Any]]:
        """List files in S3 bucket."""
        if not self.s3_client:
            print("ERROR: S3 client not initialized")
            return []
        
        files = []
        try:
            response = self.s3_client.list_objects_v2(Bucket=self.bucket_name)
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        'name': obj['Key'],
                        'size': obj['Size'],
                        'mtime': obj['LastModified'].timestamp(),
                        'etag': obj['ETag']
                    })
        except ClientError as e:
            print(f"ERROR: Failed to list files in S3: {e}")
        except NoCredentialsError:
            print("ERROR: AWS credentials not found")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from S3."""
        if not self.s3_client:
            print("ERROR: S3 client not initialized")
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=remote_name
            )
            return True
        except ClientError as e:
            print(f"ERROR: Failed to delete {remote_name} from S3: {e}")
            return False
        except NoCredentialsError:
            print("ERROR: AWS credentials not found")
            return False
    
    def test_connection(self) -> bool:
        """Test connection to S3."""
        if not self.s3_client:
            print("ERROR: S3 client not initialized")
            return False
        
        try:
            # Try to list objects (this will fail if bucket doesn't exist or no access)
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"ERROR: S3 bucket '{self.bucket_name}' not found")
            elif error_code == '403':
                print(f"ERROR: Access denied to S3 bucket '{self.bucket_name}'")
            else:
                print(f"ERROR: S3 connection test failed: {e}")
            return False
        except NoCredentialsError:
            print("ERROR: AWS credentials not found")
            return False
