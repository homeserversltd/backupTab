# AWS S3 Provider

**HOMESERVER Backup System - AWS S3 Integration**

## Overview

The AWS S3 provider offers enterprise-grade cloud storage integration for the HOMESERVER backup system. It provides reliable, cost-effective cloud storage with advanced features including encryption, bandwidth throttling, connection pooling, multipart uploads, lifecycle management, and comprehensive error handling.

## Features

### Core Functionality
- **File Upload/Download**: Reliable file transfer with retry logic
- **File Management**: List, delete, and manage files in S3 buckets
- **Connection Testing**: Comprehensive connectivity validation
- **Error Handling**: Robust error handling with exponential backoff

### Advanced Features
- **Encryption**: Client-side encryption using Fernet (AES-256) and server-side encryption options
- **Bandwidth Throttling**: Rate limiting to respect network constraints
- **Connection Pooling**: Efficient connection management
- **Multipart Uploads**: Automatic handling of large files with configurable thresholds
- **Progress Tracking**: Real-time upload/download progress
- **Retry Logic**: Configurable retry attempts with exponential backoff

### Enterprise Features
- **Account Information**: Detailed account and usage statistics
- **Bucket Management**: Comprehensive bucket information and metadata
- **Lifecycle Management**: File lifecycle and retention policies with automatic archiving
- **Storage Analytics**: Usage statistics and monitoring
- **Security**: IAM-based access controls and encryption options
- **Storage Classes**: Support for STANDARD, STANDARD_IA, GLACIER, DEEP_ARCHIVE

## Configuration

### Required Settings

```json
{
  "aws_s3": {
    "enabled": true,
    "bucket": "homeserver-backups",
    "region": "us-east-1"
  }
}
```

### Optional Settings

```json
{
  "aws_s3": {
    "access_key": "AKIAIOSFODNN7EXAMPLE",
    "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "max_retries": 3,
    "retry_delay": 1.0,
    "timeout": 300,
    "max_bandwidth": null,
    "upload_chunk_size": 104857600,
    "multipart_threshold": 67108864,
    "encryption_enabled": false,
    "encryption_key": null,
    "encryption_salt": null,
    "connection_pool_size": 5,
    "server_side_encryption": "AES256",
    "storage_class": "STANDARD",
    "canned_acl": "private"
  }
}
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | false | Enable/disable the provider |
| `bucket` | string | homeserver-backups | S3 bucket name |
| `region` | string | us-east-1 | AWS region |
| `access_key` | string | - | AWS access key ID (optional if using IAM roles) |
| `secret_key` | string | - | AWS secret access key (optional if using IAM roles) |
| `max_retries` | integer | 3 | Maximum retry attempts |
| `retry_delay` | float | 1.0 | Base delay between retries (seconds) |
| `timeout` | integer | 300 | Request timeout (seconds) |
| `max_bandwidth` | integer | null | Bandwidth limit (bytes/second) |
| `upload_chunk_size` | integer | 104857600 | Chunk size for multipart uploads (bytes) |
| `multipart_threshold` | integer | 67108864 | File size threshold for multipart uploads (bytes) |
| `encryption_enabled` | boolean | false | Enable client-side encryption |
| `encryption_key` | string | null | Encryption key (auto-generated if null) |
| `encryption_salt` | string | null | Encryption salt (auto-generated if null) |
| `connection_pool_size` | integer | 5 | Maximum connections in pool |
| `server_side_encryption` | string | null | Server-side encryption (AES256, aws:kms, etc.) |
| `storage_class` | string | STANDARD | Storage class (STANDARD, STANDARD_IA, GLACIER, etc.) |
| `canned_acl` | string | null | Canned ACL (private, public-read, etc.) |

## Setup Instructions

### 1. Create AWS Account and S3 Bucket

1. Visit [AWS Console](https://aws.amazon.com/console/)
2. Sign up for an AWS account
3. Navigate to S3 service
4. Create a new bucket for HOMESERVER backups
5. Configure bucket settings (region, versioning, etc.)

### 2. Set Up IAM User or Role

#### Option A: IAM User (Recommended for Development)
1. Navigate to **IAM** in AWS Console
2. Create a new user: `HOMESERVER-Backup`
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Generate access keys and save them securely

#### Option B: IAM Role (Recommended for Production)
1. Create an IAM role with S3 permissions
2. Attach the role to your EC2 instance or use assume role
3. No access keys needed - uses instance metadata

### 3. Configure HOMESERVER

Use the backup CLI to configure credentials:

```bash
# Set AWS S3 credentials (if using access keys)
./backup-venv set-credentials aws_s3 \
  --username "AKIAIOSFODNN7EXAMPLE" \
  --password "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Enable the provider
./backup-venv enable-provider aws_s3

# Test the connection
./backup-venv test-providers
```

## Usage Examples

### Basic Operations

```bash
# Create a backup
./backup-venv create

# List available backups
./backup-venv list

# Download a backup
./backup-venv download homeserver_backup_20250911_100606.tar.encrypted

# Test provider connection
./backup-venv test-providers
```

### Advanced Configuration

```bash
# Set bandwidth limit (1 MB/s)
./backup-venv set-config aws_s3 max_bandwidth 1048576

# Enable client-side encryption
./backup-venv set-config aws_s3 encryption_enabled true

# Set server-side encryption
./backup-venv set-config aws_s3 server_side_encryption AES256

# Configure storage class
./backup-venv set-config aws_s3 storage_class STANDARD_IA

# Set custom retry settings
./backup-venv set-config aws_s3 max_retries 5
./backup-venv set-config aws_s3 retry_delay 2.0
```

## API Reference

### Core Methods

#### `upload(file_path, remote_name, progress_callback=None)`
Upload a file to AWS S3.

**Parameters:**
- `file_path` (Path): Local file path to upload
- `remote_name` (str): Remote filename in S3
- `progress_callback` (callable, optional): Progress callback function

**Returns:** `bool` - Success status

#### `download(remote_name, local_path, progress_callback=None)`
Download a file from AWS S3.

**Parameters:**
- `remote_name` (str): Remote filename in S3
- `local_path` (Path): Local destination path
- `progress_callback` (callable, optional): Progress callback function

**Returns:** `bool` - Success status

#### `list_files(prefix="", max_files=1000)`
List files in the S3 bucket.

**Parameters:**
- `prefix` (str): File name prefix filter
- `max_files` (int): Maximum number of files to return

**Returns:** `List[Dict[str, Any]]` - List of file information

#### `delete(remote_name)`
Delete a file from AWS S3.

**Parameters:**
- `remote_name` (str): Remote filename to delete

**Returns:** `bool` - Success status

#### `test_connection()`
Test connection to AWS S3.

**Returns:** `bool` - Connection status

### Advanced Methods

#### `get_bucket_info()`
Get detailed bucket information.

**Returns:** `Dict[str, Any]` - Bucket metadata

#### `get_account_info()`
Get account information and capabilities.

**Returns:** `Dict[str, Any]` - Account details

#### `get_storage_usage()`
Get storage usage statistics.

**Returns:** `Dict[str, Any]` - Usage metrics

#### `set_bandwidth_limit(bytes_per_second)`
Set bandwidth limit for transfers.

**Parameters:**
- `bytes_per_second` (int): Bandwidth limit in bytes per second

#### `get_bandwidth_usage()`
Get current bandwidth usage statistics.

**Returns:** `Dict[str, Any]` - Bandwidth metrics

#### `set_lifecycle_rule(rule)`
Set lifecycle rule for the bucket.

**Parameters:**
- `rule` (Dict[str, Any]): Lifecycle rule configuration

#### `archive_file(remote_name, storage_class='GLACIER')`
Archive a file to cheaper storage class.

**Parameters:**
- `remote_name` (str): Remote filename to archive
- `storage_class` (str): Target storage class

#### `restore_file(remote_name, days=1)`
Restore an archived file.

**Parameters:**
- `remote_name` (str): Remote filename to restore
- `days` (int): Number of days to keep restored file

## Error Handling

The provider includes comprehensive error handling:

### Connection Errors
- **ClientError**: AWS API-specific errors
- **NoCredentialsError**: Missing AWS credentials
- **EndpointConnectionError**: Network connectivity issues

### Retry Logic
- Configurable retry attempts (default: 3)
- Exponential backoff delay
- Automatic reconnection on failures

### Error Recovery
- Automatic client reinitialization
- Connection pool management
- Graceful degradation on failures

## Security Features

### Authentication
- IAM user/role-based authentication
- Access key-based authentication (development)
- Instance metadata authentication (production)

### Encryption
- Client-side encryption using Fernet (AES-256)
- Server-side encryption (AES256, aws:kms)
- PBKDF2 key derivation
- Configurable encryption keys and salts

### Access Control
- Bucket-level access restrictions
- IAM policy-based permissions
- File-level permissions via ACLs

## Performance Optimization

### Bandwidth Management
- Configurable bandwidth limits
- Real-time rate monitoring
- Automatic throttling

### Connection Pooling
- Reusable connections
- Configurable pool size
- Connection lifecycle management

### Large File Handling
- Automatic multipart uploads
- Configurable chunk sizes
- Parallel upload threads
- Progress tracking

### Storage Optimization
- Multiple storage classes
- Lifecycle management
- Automatic archiving
- Cost optimization

## Monitoring and Logging

### Logging Levels
- **INFO**: General operations and status
- **WARNING**: Non-critical issues and retries
- **ERROR**: Failures and critical issues
- **DEBUG**: Detailed operation information

### Metrics Available
- Upload/download success rates
- Bandwidth utilization
- Connection pool status
- Retry attempt statistics
- Storage usage metrics
- Lifecycle rule compliance

## Troubleshooting

### Common Issues

#### Authentication Failures
```
ERROR: AWS credentials not found
```
**Solution**: Ensure AWS credentials are properly configured via IAM user, role, or environment variables.

#### Bucket Access Denied
```
ERROR: Access denied to S3 bucket 'homeserver-backups'
```
**Solution**: Verify IAM permissions include S3 access to the specified bucket.

#### Connection Timeouts
```
ERROR: S3 endpoint connection test failed
```
**Solution**: Check network connectivity and increase timeout settings.

#### File Not Found
```
ERROR: File not found in S3: backup_file.tar.encrypted
```
**Solution**: Verify the file exists and check the bucket name configuration.

### Debug Mode

Enable debug logging for detailed troubleshooting:

```python
import logging
logging.getLogger('homeserver_backup.aws_s3').setLevel(logging.DEBUG)
```

### Health Checks

```bash
# Test provider connection
./backup-venv test-providers

# Check provider status
./backup-venv get-provider-status aws_s3

# List files to verify connectivity
./backup-venv list
```

## Best Practices

### Security
1. Use IAM roles instead of access keys when possible
2. Enable server-side encryption for sensitive data
3. Use least-privilege IAM policies
4. Regularly rotate access keys
5. Monitor access logs for suspicious activity

### Performance
1. Set appropriate bandwidth limits based on network capacity
2. Use connection pooling for high-volume operations
3. Configure multipart thresholds for large files
4. Monitor storage usage and implement lifecycle policies
5. Test with realistic file sizes and volumes

### Cost Optimization
1. Use appropriate storage classes (STANDARD_IA, GLACIER)
2. Implement lifecycle rules for automatic archiving
3. Monitor storage usage and costs
4. Use compression for backup files
5. Clean up old backup files regularly

### Reliability
1. Configure appropriate retry settings for your network
2. Monitor error rates and adjust timeouts accordingly
3. Implement backup verification procedures
4. Test disaster recovery scenarios regularly
5. Use multiple AWS regions for redundancy

## AWS-Specific Features

### Storage Classes
- **STANDARD**: General-purpose storage
- **STANDARD_IA**: Infrequently accessed data
- **GLACIER**: Long-term archival
- **DEEP_ARCHIVE**: Lowest-cost long-term archival

### Lifecycle Management
- Automatic transitions between storage classes
- Object expiration policies
- Cost optimization rules
- Compliance retention policies

### Server-Side Encryption
- **AES256**: AWS-managed encryption
- **aws:kms**: AWS KMS encryption
- **aws:kms:dsse**: KMS dual-layer encryption

### Access Control
- Bucket policies
- IAM policies
- ACLs (Access Control Lists)
- Presigned URLs

## Support

For issues specific to the AWS S3 provider:

1. Check the troubleshooting section above
2. Review AWS S3 documentation
3. Enable debug logging for detailed error information
4. Check AWS CloudTrail for API call logs
5. Contact HOMESERVER support with specific error messages

## Changelog

### Version 1.0.0
- Initial implementation with core functionality
- Support for file upload/download/list/delete
- Basic error handling and retry logic
- Configuration management

### Version 1.1.0
- Added encryption support (client-side and server-side)
- Implemented bandwidth throttling
- Added connection pooling
- Enhanced error handling

### Version 1.2.0
- Added multipart upload support
- Implemented lifecycle management
- Added storage class support
- Enhanced monitoring and logging

### Version 1.3.0
- Added archive/restore functionality
- Implemented comprehensive status reporting
- Enhanced security features
- Improved performance optimization

---

**Copyright (C) 2024 HOMESERVER LLC - All rights reserved.**
