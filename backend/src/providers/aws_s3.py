"""
AWS S3 Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for AWS S3 storage with enhanced features for enterprise backup.
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, EndpointConnectionError
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
import time
import logging
import hashlib
import hmac
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from .base import BaseProvider

class AWSS3Provider(BaseProvider):
    """AWS S3 provider with enhanced enterprise features."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.logger = logging.getLogger(f'homeserver_backup.aws_s3')
        
        # Configuration with validation
        self.bucket_name = config.get('bucket', 'homeserver-backups')
        self.region = config.get('region', 'us-east-1')
        self.access_key = config.get('access_key')
        self.secret_key = config.get('secret_key')
        
        # Retry configuration
        self.max_retries = config.get('max_retries', 3)
        self.retry_delay = config.get('retry_delay', 1.0)
        self.timeout = config.get('timeout', 300)  # 5 minutes default
        
        # Bandwidth control
        self.max_bandwidth = config.get('max_bandwidth', None)  # bytes per second
        self.upload_chunk_size = config.get('upload_chunk_size', 100 * 1024 * 1024)  # 100MB
        self.multipart_threshold = config.get('multipart_threshold', 64 * 1024 * 1024)  # 64MB
        self._last_transfer_time = 0
        self._bytes_transferred = 0
        
        # Encryption configuration
        self.encryption_enabled = config.get('encryption_enabled', False)
        self.encryption_key = config.get('encryption_key', None)
        self.encryption_salt = config.get('encryption_salt', None)
        self._fernet = None
        
        # Initialize encryption if enabled
        if self.encryption_enabled:
            self._initialize_encryption()
        
        # Connection pooling
        self.connection_pool_size = config.get('connection_pool_size', 5)
        self._connection_pool = []
        self._pool_lock = None
        
        # S3-specific configuration
        self.server_side_encryption = config.get('server_side_encryption', None)  # AES256, aws:kms, etc.
        self.storage_class = config.get('storage_class', 'STANDARD')  # STANDARD, STANDARD_IA, GLACIER, etc.
        self.canned_acl = config.get('canned_acl', None)  # private, public-read, etc.
        
        # Validate configuration
        if not self._validate_config():
            self.s3_client = None
            return
        
        # Initialize S3 client with retry logic
        self._initialize_client()
    
    def _validate_config(self) -> bool:
        """Validate AWS S3 configuration."""
        if not self.bucket_name:
            self.logger.error("Missing bucket name in AWS S3 configuration")
            return False
        
        # AWS credentials are optional if using IAM roles, environment variables, etc.
        if not self.access_key and not self.secret_key:
            self.logger.info("No AWS credentials provided, using default credential chain")
        
        self.logger.info(f"AWS S3 configuration validated for bucket: {self.bucket_name}")
        return True
    
    def _initialize_client(self) -> None:
        """Initialize S3 client with retry logic."""
        for attempt in range(self.max_retries):
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
                
                # Test the client with a simple operation
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                self.logger.info(f"Successfully initialized S3 client (attempt {attempt + 1})")
                return
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                if error_code == '404':
                    self.logger.error(f"S3 bucket '{self.bucket_name}' not found")
                    self.s3_client = None
                    return
                elif error_code == '403':
                    self.logger.error(f"Access denied to S3 bucket '{self.bucket_name}'")
                    self.s3_client = None
                    return
                else:
                    self.logger.warning(f"S3 client error (attempt {attempt + 1}/{self.max_retries}): {e}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (2 ** attempt))
                    else:
                        self.logger.error("Failed to initialize S3 client after all retries")
                        self.s3_client = None
            except EndpointConnectionError as e:
                self.logger.warning(f"S3 endpoint connection error (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self.logger.error("Failed to connect to S3 endpoint after all retries")
                    self.s3_client = None
            except NoCredentialsError:
                self.logger.error("AWS credentials not found")
                self.s3_client = None
                return
            except Exception as e:
                self.logger.error(f"Unexpected error initializing S3 client: {e}")
                self.s3_client = None
                return
    
    def upload(self, file_path: Path, remote_name: str, progress_callback: Optional[Callable] = None) -> bool:
        """Upload file to AWS S3 with retry logic and progress tracking."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        if not file_path.exists():
            self.logger.error(f"File not found: {file_path}")
            return False
        
        file_size = file_path.stat().st_size
        self.logger.info(f"Starting upload of {file_path} ({file_size} bytes) to {remote_name}")
        
        # Use multipart upload for large files
        if file_size > self.multipart_threshold:
            return self._upload_large_file(file_path, remote_name, progress_callback)
        
        # Standard upload for smaller files
        return self._upload_with_retry(file_path, remote_name, progress_callback)
    
    def _upload_with_retry(self, file_path: Path, remote_name: str, progress_callback: Optional[Callable] = None) -> bool:
        """Upload file with retry logic."""
        extra_args = {}
        
        # Add server-side encryption if configured
        if self.server_side_encryption:
            extra_args['ServerSideEncryption'] = self.server_side_encryption
        
        # Add storage class if configured
        if self.storage_class:
            extra_args['StorageClass'] = self.storage_class
        
        # Add ACL if configured
        if self.canned_acl:
            extra_args['ACL'] = self.canned_acl
        
        for attempt in range(self.max_retries):
            try:
                # Set up progress tracking if callback provided
                if progress_callback:
                    progress_callback(0, file_path.stat().st_size)
                
                self.s3_client.upload_file(
                    str(file_path),
                    self.bucket_name,
                    remote_name,
                    ExtraArgs=extra_args,
                    Callback=progress_callback
                )
                
                self.logger.info(f"Successfully uploaded {file_path} to {remote_name}")
                return True
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                self.logger.warning(f"Client error during upload (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1 and error_code not in ['403', '404']:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self.logger.error(f"Failed to upload {file_path} after all retries")
                    return False
                    
            except EndpointConnectionError as e:
                self.logger.warning(f"Endpoint connection error during upload (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self.logger.error(f"Upload connection error for {file_path} after all retries")
                    return False
                    
            except NoCredentialsError:
                self.logger.error("AWS credentials not found during upload")
                return False
                
            except Exception as e:
                self.logger.error(f"Unexpected error during upload: {e}")
                return False
        
        return False
    
    def _upload_large_file(self, file_path: Path, remote_name: str, progress_callback: Optional[Callable] = None) -> bool:
        """Upload large file using multipart upload."""
        try:
            file_size = file_path.stat().st_size
            self.logger.info(f"Using multipart upload for large file: {file_size} bytes")
            
            extra_args = {}
            
            # Add server-side encryption if configured
            if self.server_side_encryption:
                extra_args['ServerSideEncryption'] = self.server_side_encryption
            
            # Add storage class if configured
            if self.storage_class:
                extra_args['StorageClass'] = self.storage_class
            
            # Add ACL if configured
            if self.canned_acl:
                extra_args['ACL'] = self.canned_acl
            
            config = boto3.s3.transfer.TransferConfig(
                multipart_threshold=self.multipart_threshold,
                max_concurrency=10,
                multipart_chunksize=self.upload_chunk_size,
                use_threads=True
            )
            
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                remote_name,
                ExtraArgs=extra_args,
                Config=config,
                Callback=progress_callback
            )
            
            self.logger.info(f"Successfully uploaded large file {file_path} to {remote_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to upload large file {file_path}: {e}")
            return False
    
    def download(self, remote_name: str, local_path: Path, progress_callback: Optional[Callable] = None) -> bool:
        """Download file from AWS S3 with retry logic and progress tracking."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        # Ensure local directory exists
        local_path.parent.mkdir(parents=True, exist_ok=True)
        
        for attempt in range(self.max_retries):
            try:
                # Check if file exists first
                try:
                    response = self.s3_client.head_object(Bucket=self.bucket_name, Key=remote_name)
                    file_size = response['ContentLength']
                    self.logger.info(f"Starting download of {remote_name} ({file_size} bytes)")
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        self.logger.error(f"File not found in S3: {remote_name}")
                        return False
                    else:
                        raise
                
                self.s3_client.download_file(
                    self.bucket_name,
                    remote_name,
                    str(local_path),
                    Callback=progress_callback
                )
                
                self.logger.info(f"Successfully downloaded {remote_name} to {local_path}")
                return True
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                self.logger.warning(f"Client error during download (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1 and error_code not in ['403', '404']:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self.logger.error(f"Failed to download {remote_name} after all retries")
                    return False
                    
            except EndpointConnectionError as e:
                self.logger.warning(f"Endpoint connection error during download (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self.logger.error(f"Download connection error for {remote_name} after all retries")
                    return False
                    
            except NoCredentialsError:
                self.logger.error("AWS credentials not found during download")
                return False
                
            except Exception as e:
                self.logger.error(f"Unexpected error during download: {e}")
                return False
        
        return False
    
    def list_files(self, prefix: str = "", max_files: int = 1000) -> List[Dict[str, Any]]:
        """List files in AWS S3 bucket with filtering and pagination."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return []
        
        files = []
        try:
            self.logger.info(f"Listing files with prefix '{prefix}' (max: {max_files})")
            
            paginator = self.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=prefix,
                PaginationConfig={'MaxItems': max_files}
            )
            
            for page in page_iterator:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        files.append({
                            'name': obj['Key'],
                            'size': obj['Size'],
                            'mtime': obj['LastModified'].timestamp(),
                            'etag': obj['ETag'].strip('"'),
                            'storage_class': obj.get('StorageClass', 'STANDARD'),
                            'owner': obj.get('Owner', {}),
                            'content_type': obj.get('ContentType', 'application/octet-stream')
                        })
            
            self.logger.info(f"Found {len(files)} files in bucket")
            
        except ClientError as e:
            self.logger.error(f"Client error listing files: {e}")
        except NoCredentialsError:
            self.logger.error("AWS credentials not found while listing files")
        except Exception as e:
            self.logger.error(f"Unexpected error listing files: {e}")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from AWS S3 with retry logic."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        for attempt in range(self.max_retries):
            try:
                # Check if file exists first
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=remote_name)
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        self.logger.warning(f"File not found for deletion: {remote_name}")
                        return False
                    else:
                        raise
                
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=remote_name
                )
                self.logger.info(f"Successfully deleted {remote_name} from S3")
                return True
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                self.logger.warning(f"Client error during deletion (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1 and error_code not in ['403', '404']:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self.logger.error(f"Failed to delete {remote_name} after all retries")
                    return False
                    
            except NoCredentialsError:
                self.logger.error("AWS credentials not found during deletion")
                return False
                
            except Exception as e:
                self.logger.error(f"Unexpected error during deletion: {e}")
                return False
        
        return False
    
    def test_connection(self) -> bool:
        """Test connection to AWS S3 with comprehensive validation."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        try:
            # Test basic connectivity by checking bucket access
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            
            # Test list operation to ensure we can actually access objects
            response = self.s3_client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=1)
            
            self.logger.info(f"Connection test successful. Bucket: {self.bucket_name}, Region: {self.region}")
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == '404':
                self.logger.error(f"S3 bucket '{self.bucket_name}' not found")
            elif error_code == '403':
                self.logger.error(f"Access denied to S3 bucket '{self.bucket_name}'")
            else:
                self.logger.error(f"S3 connection test failed: {e}")
            return False
        except NoCredentialsError:
            self.logger.error("AWS credentials not found")
            return False
        except EndpointConnectionError as e:
            self.logger.error(f"S3 endpoint connection test failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"S3 connection test failed - unexpected error: {e}")
            return False
    
    def get_bucket_info(self) -> Optional[Dict[str, Any]]:
        """Get detailed bucket information."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return None
        
        try:
            # Get bucket location
            location_response = self.s3_client.get_bucket_location(Bucket=self.bucket_name)
            location = location_response.get('LocationConstraint', 'us-east-1')
            if location is None:
                location = 'us-east-1'  # us-east-1 returns None
            
            # Get bucket versioning
            try:
                versioning_response = self.s3_client.get_bucket_versioning(Bucket=self.bucket_name)
                versioning = versioning_response.get('Status', 'Disabled')
            except ClientError:
                versioning = 'Disabled'
            
            # Get bucket lifecycle configuration
            try:
                lifecycle_response = self.s3_client.get_bucket_lifecycle_configuration(Bucket=self.bucket_name)
                lifecycle_rules = lifecycle_response.get('Rules', [])
            except ClientError:
                lifecycle_rules = []
            
            return {
                'name': self.bucket_name,
                'region': location,
                'versioning': versioning,
                'lifecycle_rules': lifecycle_rules,
                'creation_date': None  # Would need additional API call
            }
        except Exception as e:
            self.logger.error(f"Failed to get bucket info: {e}")
            return None
    
    def get_account_info(self) -> Optional[Dict[str, Any]]:
        """Get account information and usage statistics."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return None
        
        try:
            # Get caller identity
            sts_client = boto3.client('sts', region_name=self.region)
            identity = sts_client.get_caller_identity()
            
            return {
                'account_id': identity.get('Account'),
                'user_id': identity.get('UserId'),
                'arn': identity.get('Arn'),
                'region': self.region
            }
        except Exception as e:
            self.logger.error(f"Failed to get account info: {e}")
            return None
    
    def get_storage_usage(self) -> Optional[Dict[str, Any]]:
        """Get storage usage statistics."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return None
        
        try:
            files = self.list_files()
            total_size = sum(file_info.get('size', 0) for file_info in files)
            file_count = len(files)
            
            return {
                'total_files': file_count,
                'total_size_bytes': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'total_size_gb': round(total_size / (1024 * 1024 * 1024), 2)
            }
        except Exception as e:
            self.logger.error(f"Failed to get storage usage: {e}")
            return None
    
    def set_file_metadata(self, remote_name: str, metadata: Dict[str, str]) -> bool:
        """Set custom metadata for a file."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        try:
            # Copy object with new metadata
            copy_source = {
                'Bucket': self.bucket_name,
                'Key': remote_name
            }
            
            # Prepare metadata with proper prefix
            metadata_dict = {}
            for key, value in metadata.items():
                metadata_dict[f'x-amz-meta-{key}'] = value
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=remote_name,
                Metadata=metadata,
                MetadataDirective='REPLACE'
            )
            
            self.logger.info(f"Successfully set metadata for {remote_name}")
            return True
            
        except ClientError as e:
            self.logger.error(f"Failed to set metadata for {remote_name}: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error setting metadata for {remote_name}: {e}")
            return False
    
    def get_file_metadata(self, remote_name: str) -> Optional[Dict[str, Any]]:
        """Get file metadata."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return None
        
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=remote_name)
            
            return {
                'name': remote_name,
                'size': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'etag': response.get('ETag', '').strip('"'),
                'last_modified': response.get('LastModified'),
                'storage_class': response.get('StorageClass', 'STANDARD'),
                'metadata': response.get('Metadata', {}),
                'server_side_encryption': response.get('ServerSideEncryption'),
                'encryption_key_id': response.get('SSEKMSKeyId')
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                self.logger.error(f"File not found: {remote_name}")
            else:
                self.logger.error(f"Failed to get metadata for {remote_name}: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Unexpected error getting metadata for {remote_name}: {e}")
            return None
    
    def _throttle_bandwidth(self, bytes_transferred: int) -> None:
        """Throttle bandwidth to respect rate limits."""
        if not self.max_bandwidth:
            return
        
        current_time = time.time()
        
        # Reset counters if more than 1 second has passed
        if current_time - self._last_transfer_time >= 1.0:
            self._bytes_transferred = 0
            self._last_transfer_time = current_time
        
        self._bytes_transferred += bytes_transferred
        
        # Calculate how long we should wait to respect bandwidth limit
        if self._bytes_transferred > self.max_bandwidth:
            sleep_time = (self._bytes_transferred - self.max_bandwidth) / self.max_bandwidth
            if sleep_time > 0:
                self.logger.debug(f"Throttling bandwidth: sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
                self._bytes_transferred = 0
                self._last_transfer_time = time.time()
    
    def set_bandwidth_limit(self, bytes_per_second: Optional[int]) -> None:
        """Set bandwidth limit for transfers."""
        self.max_bandwidth = bytes_per_second
        if bytes_per_second:
            self.logger.info(f"Bandwidth limit set to {bytes_per_second} bytes/second")
        else:
            self.logger.info("Bandwidth limit removed")
    
    def get_bandwidth_usage(self) -> Dict[str, Any]:
        """Get current bandwidth usage statistics."""
        current_time = time.time()
        if current_time - self._last_transfer_time >= 1.0:
            return {
                'current_rate': 0,
                'bytes_transferred': 0,
                'time_window': 0
            }
        
        time_window = current_time - self._last_transfer_time
        current_rate = self._bytes_transferred / time_window if time_window > 0 else 0
        
        return {
            'current_rate': current_rate,
            'bytes_transferred': self._bytes_transferred,
            'time_window': time_window,
            'limit': self.max_bandwidth,
            'utilization': (current_rate / self.max_bandwidth * 100) if self.max_bandwidth else 0
        }
    
    def set_lifecycle_rule(self, rule: Dict[str, Any]) -> bool:
        """Set lifecycle rule for the bucket."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        try:
            # Get existing rules
            try:
                response = self.s3_client.get_bucket_lifecycle_configuration(Bucket=self.bucket_name)
                existing_rules = response.get('Rules', [])
            except ClientError:
                existing_rules = []
            
            # Add new rule
            existing_rules.append(rule)
            
            # Set updated rules
            self.s3_client.put_bucket_lifecycle_configuration(
                Bucket=self.bucket_name,
                LifecycleConfiguration={'Rules': existing_rules}
            )
            
            self.logger.info(f"Successfully set lifecycle rule for bucket {self.bucket_name}")
            return True
            
        except ClientError as e:
            self.logger.error(f"Failed to set lifecycle rule: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error setting lifecycle rule: {e}")
            return False
    
    def get_lifecycle_rules(self) -> List[Dict[str, Any]]:
        """Get current lifecycle rules for the bucket."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return []
        
        try:
            response = self.s3_client.get_bucket_lifecycle_configuration(Bucket=self.bucket_name)
            return response.get('Rules', [])
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchLifecycleConfiguration':
                return []
            self.logger.error(f"Failed to get lifecycle rules: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Unexpected error getting lifecycle rules: {e}")
            return []
    
    def archive_file(self, remote_name: str, storage_class: str = 'GLACIER') -> bool:
        """Archive a file (transition to cheaper storage)."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        try:
            # Copy object with new storage class
            copy_source = {
                'Bucket': self.bucket_name,
                'Key': remote_name
            }
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=remote_name,
                StorageClass=storage_class,
                MetadataDirective='COPY'
            )
            
            self.logger.info(f"Successfully archived {remote_name} to {storage_class}")
            return True
            
        except ClientError as e:
            self.logger.error(f"Failed to archive file {remote_name}: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error archiving file {remote_name}: {e}")
            return False
    
    def restore_file(self, remote_name: str, days: int = 1) -> bool:
        """Restore an archived file."""
        if not self.s3_client:
            self.logger.error("S3 client not initialized")
            return False
        
        try:
            # Check if file is archived
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=remote_name)
            storage_class = response.get('StorageClass', 'STANDARD')
            
            if storage_class not in ['GLACIER', 'DEEP_ARCHIVE']:
                self.logger.info(f"File {remote_name} is not archived (storage class: {storage_class})")
                return True
            
            # Initiate restore request
            self.s3_client.restore_object(
                Bucket=self.bucket_name,
                Key=remote_name,
                RestoreRequest={
                    'Days': days,
                    'GlacierJobParameters': {
                        'Tier': 'Standard'
                    }
                }
            )
            
            self.logger.info(f"Successfully initiated restore for {remote_name} ({days} days)")
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'RestoreAlreadyInProgress':
                self.logger.info(f"Restore already in progress for {remote_name}")
                return True
            else:
                self.logger.error(f"Failed to restore file {remote_name}: {e}")
                return False
        except Exception as e:
            self.logger.error(f"Unexpected error restoring file {remote_name}: {e}")
            return False
    
    def _initialize_encryption(self) -> None:
        """Initialize encryption with the provided key."""
        try:
            if not self.encryption_key:
                # Generate a new key if none provided
                self.encryption_key = Fernet.generate_key()
                self.logger.warning("No encryption key provided, generated new key")
            
            if not self.encryption_salt:
                # Generate a new salt if none provided
                self.encryption_salt = os.urandom(16)
                self.logger.warning("No encryption salt provided, generated new salt")
            
            # Derive key from password and salt
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=self.encryption_salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.encryption_key))
            self._fernet = Fernet(key)
            
            self.logger.info("Client-side encryption initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize encryption: {e}")
            self.encryption_enabled = False
            self._fernet = None
    
    def _encrypt_data(self, data: bytes) -> bytes:
        """Encrypt data using Fernet encryption."""
        if not self._fernet:
            return data
        
        try:
            return self._fernet.encrypt(data)
        except Exception as e:
            self.logger.error(f"Failed to encrypt data: {e}")
            raise
    
    def _decrypt_data(self, encrypted_data: bytes) -> bytes:
        """Decrypt data using Fernet encryption."""
        if not self._fernet:
            return encrypted_data
        
        try:
            return self._fernet.decrypt(encrypted_data)
        except Exception as e:
            self.logger.error(f"Failed to decrypt data: {e}")
            raise
    
    def upload_encrypted(self, file_path: Path, remote_name: str, progress_callback: Optional[Callable] = None) -> bool:
        """Upload file with client-side encryption."""
        if not self.encryption_enabled:
            self.logger.warning("Encryption not enabled, using standard upload")
            return self.upload(file_path, remote_name, progress_callback)
        
        if not self._fernet:
            self.logger.error("Encryption not properly initialized")
            return False
        
        try:
            # Read and encrypt file
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            encrypted_data = self._encrypt_data(file_data)
            
            # Create temporary encrypted file
            temp_file = Path(f"/tmp/{remote_name}.encrypted")
            with open(temp_file, 'wb') as f:
                f.write(encrypted_data)
            
            # Upload encrypted file
            encrypted_remote_name = f"{remote_name}.encrypted"
            success = self.upload(temp_file, encrypted_remote_name, progress_callback)
            
            # Clean up temporary file
            temp_file.unlink(missing_ok=True)
            
            if success:
                self.logger.info(f"Successfully uploaded encrypted file: {remote_name}")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to upload encrypted file {file_path}: {e}")
            return False
    
    def download_encrypted(self, remote_name: str, local_path: Path, progress_callback: Optional[Callable] = None) -> bool:
        """Download and decrypt file."""
        if not self.encryption_enabled:
            self.logger.warning("Encryption not enabled, using standard download")
            return self.download(remote_name, local_path, progress_callback)
        
        if not self._fernet:
            self.logger.error("Encryption not properly initialized")
            return False
        
        try:
            # Download encrypted file
            encrypted_remote_name = f"{remote_name}.encrypted"
            temp_file = Path(f"/tmp/{remote_name}.encrypted")
            
            success = self.download(encrypted_remote_name, temp_file, progress_callback)
            if not success:
                return False
            
            # Decrypt file
            with open(temp_file, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self._decrypt_data(encrypted_data)
            
            # Write decrypted file
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, 'wb') as f:
                f.write(decrypted_data)
            
            # Clean up temporary file
            temp_file.unlink(missing_ok=True)
            
            self.logger.info(f"Successfully downloaded and decrypted file: {remote_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to download encrypted file {remote_name}: {e}")
            return False
    
    def get_encryption_info(self) -> Dict[str, Any]:
        """Get encryption configuration information."""
        return {
            'enabled': self.encryption_enabled,
            'has_key': bool(self.encryption_key),
            'has_salt': bool(self.encryption_salt),
            'fernet_initialized': bool(self._fernet),
            'server_side_encryption': self.server_side_encryption
        }
    
    def _get_connection_from_pool(self) -> Optional[Any]:
        """Get a connection from the pool."""
        if not self._connection_pool:
            return None
        
        try:
            return self._connection_pool.pop()
        except IndexError:
            return None
    
    def _return_connection_to_pool(self, connection: Any) -> None:
        """Return a connection to the pool."""
        if len(self._connection_pool) < self.connection_pool_size:
            self._connection_pool.append(connection)
    
    def _create_new_connection(self) -> Optional[Any]:
        """Create a new S3 client connection."""
        try:
            if self.access_key and self.secret_key:
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
            else:
                s3_client = boto3.client('s3', region_name=self.region)
            return s3_client
        except Exception as e:
            self.logger.error(f"Failed to create new S3 connection: {e}")
            return None
    
    def get_connection_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status information."""
        return {
            'pool_size': len(self._connection_pool),
            'max_pool_size': self.connection_pool_size,
            'utilization': (len(self._connection_pool) / self.connection_pool_size * 100) if self.connection_pool_size > 0 else 0
        }
    
    def close_all_connections(self) -> None:
        """Close all connections in the pool."""
        self._connection_pool.clear()
        self.logger.info("All connections closed")
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get comprehensive provider status information."""
        return {
            'name': self.name,
            'bucket_name': self.bucket_name,
            'region': self.region,
            'client_initialized': bool(self.s3_client),
            'encryption': self.get_encryption_info(),
            'bandwidth': self.get_bandwidth_usage(),
            'connection_pool': self.get_connection_pool_status(),
            'retry_config': {
                'max_retries': self.max_retries,
                'retry_delay': self.retry_delay,
                'timeout': self.timeout
            },
            's3_config': {
                'server_side_encryption': self.server_side_encryption,
                'storage_class': self.storage_class,
                'canned_acl': self.canned_acl,
                'multipart_threshold': self.multipart_threshold,
                'upload_chunk_size': self.upload_chunk_size
            }
        }
