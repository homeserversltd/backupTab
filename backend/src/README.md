# HOMESERVER Backup System
*Professional backup solution with modular provider architecture*

## Overview

The HOMESERVER Backup System is a comprehensive, enterprise-grade backup solution designed for the HOMESERVER platform. It provides automated backup functionality with multiple storage providers, FAK-based encryption, and systemd integration.

## Architecture

### Core Components

- **EnhancedBackupCLI** (`backup`) - Main CLI utility with full provider support
- **BackupService** (`src/service/backup_service.py`) - Systemd service integration
- **Provider System** (`src/providers/`) - Modular storage provider architecture
- **Installer** (`src/installer/install_backup_service.py`) - Automated service management

### Provider Architecture

- **BaseProvider** - Abstract base class defining provider interface
- **LocalProvider** - Filesystem storage with full CRUD operations
- **Cloud Providers** - AWS S3, Google Drive, Dropbox, Backblaze B2
- **Provider Registry** - Dynamic loading and graceful degradation

## Features

### Core Functionality
- **Multiple Storage Providers** - Local filesystem + 4 cloud providers
- **FAK Encryption** - Factory Access Key encryption using `/root/key/skeleton.key`
- **Configurable Compression** - Adjustable compression levels (1-9)
- **Timestamp-based Naming** - Automatic backup naming with timestamps
- **Metadata Extraction** - Comprehensive backup metadata and verification
- **Retention Management** - Automated cleanup based on configurable policies

### Security Features
- **FAK Encryption** - PBKDF2 key derivation from skeleton.key
- **Systemd Security** - Restricted permissions and sandboxing
- **Comprehensive Logging** - Detailed audit trail in `/var/log/homeserver/backup.log`
- **Random Delay** - Load distribution via random cron delays

### Service Integration
- **Systemd Service** - `homeserver-backup.service` with proper user context
- **Cron Scheduling** - Daily backups with random delay (0-3600 seconds)
- **Automated Installation** - One-command service setup and configuration
- **Graceful Degradation** - Continues operation when optional dependencies unavailable

## Installation

### Quick Install
```bash
# Copy to target location
cp -r backup src/ /usr/local/lib/backup/
chmod +x /usr/local/lib/backup/backup

# Install service
cd /usr/local/lib/backup
python3 src/installer/install_backup_service.py
```

### Manual Installation
```bash
# Create directories
mkdir -p /var/www/homeserver/backup
mkdir -p /var/log/homeserver

# Copy files
cp backup /var/www/homeserver/backup/
cp -r src/ /var/www/homeserver/backup/

# Set permissions
chmod +x /var/www/homeserver/backup/backup
chown -R www-data:www-data /var/www/homeserver/backup

# Install systemd service
cp src/config/homeserver-backup.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable homeserver-backup.service

# Install cron job
echo "0 2 * * * www-data sleep \$((RANDOM % 3600)) && /usr/bin/python3 /var/www/homeserver/backup/src/service/backup_service.py --backup >> /var/log/homeserver/backup.log 2>&1" > /etc/cron.d/homeserver-backup
```

## Usage

### CLI Commands

#### Create Backup
```bash
# Create backup with default items
python3 backup create

# Create backup with specific items
python3 backup create --items /var/www/homeserver/src /etc/homeserver

# Create backup with custom config
python3 backup create --config /path/to/config.json
```

#### List Backups
```bash
# List all backups
python3 backup list

# List backups from specific provider
python3 backup list --provider local
```

#### Test Providers
```bash
# Test all enabled providers
python3 backup test-providers
```

#### Download Backup
```bash
# Download backup from provider
python3 backup download backup_name --provider local --to /path/to/save
```

#### Test Complete Cycle
```bash
# Test create, upload, download, verify cycle
python3 backup test-cycle
```

#### List Available Providers
```bash
# Show all providers and their status
python3 backup list-providers
```

### Service Commands

#### Create Backup via Service
```bash
# Run backup service
python3 src/service/backup_service.py --backup

# Test provider connections
python3 src/service/backup_service.py --test

# List available backups
python3 src/service/backup_service.py --list

# Clean up old backups
python3 src/service/backup_service.py --cleanup
```

## Configuration

### Default Configuration
```json
{
  "backup_items": [
    "/var/www/homeserver/src",
    "/var/lib/gogs",
    "/etc/homeserver"
  ],
  "providers": {
    "local": {
      "enabled": true,
      "path": "/var/www/homeserver/backup"
    },
    "aws_s3": {
      "enabled": false,
      "bucket": "homeserver-backups",
      "region": "us-east-1",
      "access_key": "",
      "secret_key": ""
    },
    "google_drive": {
      "enabled": false,
      "credentials_file": "",
      "token_file": "token.json",
      "folder_id": ""
    },
    "dropbox": {
      "enabled": false,
      "access_token": "",
      "folder_path": "/HOMESERVER Backups"
    },
    "backblaze": {
      "enabled": false,
      "application_key_id": "",
      "application_key": "",
      "bucket": "homeserver-backups"
    }
  },
  "encryption": {
    "enabled": true,
    "fak_path": "/root/key/skeleton.key"
  },
  "compression": {
    "enabled": true,
    "level": 6
  },
  "retention": {
    "days": 30,
    "max_backups": 10
  },
  "timestamp_chains": {
    "enabled": true,
    "format": "%Y%m%d_%H%M%S"
  }
}
```

### Provider Configuration

#### Local Provider
```json
{
  "enabled": true,
  "path": "/var/www/homeserver/backup"
}
```

#### AWS S3 Provider
```json
{
  "enabled": true,
  "bucket": "homeserver-backups",
  "region": "us-east-1",
  "access_key": "AKIA...",
  "secret_key": "..."
}
```

#### Google Drive Provider
```json
{
  "enabled": true,
  "credentials_file": "/path/to/credentials.json",
  "token_file": "token.json",
  "folder_id": "1ABC..."
}
```

#### Dropbox Provider
```json
{
  "enabled": true,
  "access_token": "sl.B...",
  "folder_path": "/HOMESERVER Backups"
}
```

#### Backblaze B2 Provider
```json
{
  "enabled": true,
  "application_key_id": "K...",
  "application_key": "K...",
  "bucket": "homeserver-backups"
}
```

## Dependencies

### Required
- Python 3.7+
- `cryptography` - FAK encryption
- `pathlib` - Path handling
- `tarfile` - Archive creation
- `json` - Configuration management

### Optional (Cloud Providers)
- `boto3` - AWS S3 support
- `google-auth` - Google Drive support
- `google-auth-oauthlib` - Google OAuth
- `google-api-python-client` - Google API client
- `dropbox` - Dropbox support
- `b2sdk` - Backblaze B2 support

## File Structure

```
backup/                          # Main CLI script
src/
├── __init__.py                  # Module initialization
├── providers/                   # Provider system
│   ├── __init__.py
│   ├── base.py                  # BaseProvider abstract class
│   ├── local.py                 # Local filesystem provider
│   ├── aws_s3.py                # AWS S3 provider
│   ├── google_drive.py          # Google Drive provider
│   ├── dropbox.py               # Dropbox provider
│   └── backblaze.py             # Backblaze B2 provider
├── service/                     # Service integration
│   ├── __init__.py
│   ├── backup_service.py        # Main service class
│   └── homeserver-backup.cron   # Cron job template
├── installer/                   # Installation utilities
│   ├── __init__.py
│   └── install_backup_service.py
└── config/                      # Configuration files
    ├── __init__.py
    ├── homeserver-backup.service # Systemd service file
    └── settings.json            # Default settings
```

## Security Considerations

### FAK Encryption
- Uses `/root/key/skeleton.key` as master key
- PBKDF2 key derivation with 100,000 iterations
- Fernet symmetric encryption for backup packages
- Salt-based key derivation for additional security

### Systemd Security
- Runs as `www-data` user with restricted permissions
- `NoNewPrivileges=true` prevents privilege escalation
- `PrivateTmp=true` isolates temporary files
- `ProtectSystem=strict` limits filesystem access
- `ReadWritePaths` explicitly defines writable locations

### Logging
- Comprehensive audit trail in `/var/log/homeserver/backup.log`
- Structured logging with timestamps and severity levels
- Error tracking and debugging information
- Service integration with systemd journal

## Troubleshooting

### Common Issues

#### Import Errors
```bash
# Check Python path
python3 -c "import sys; print(sys.path)"

# Verify module structure
ls -la /usr/local/lib/backup/src/
```

#### Provider Connection Failures
```bash
# Test specific provider
python3 backup test-providers

# Check provider configuration
python3 -c "import json; print(json.load(open('backup_config.json')))"
```

#### Permission Issues
```bash
# Fix ownership
chown -R www-data:www-data /var/www/homeserver/backup

# Fix permissions
chmod +x /var/www/homeserver/backup/backup
```

#### Service Issues
```bash
# Check service status
systemctl status homeserver-backup.service

# View service logs
journalctl -u homeserver-backup.service

# Check cron job
cat /etc/cron.d/homeserver-backup
```

### Debug Mode
```bash
# Enable verbose logging
python3 backup create --verbose

# Test with debug output
python3 src/service/backup_service.py --test
```

## Development

### Adding New Providers
1. Create new provider class inheriting from `BaseProvider`
2. Implement required methods: `upload`, `download`, `list_files`, `delete`, `test_connection`
3. Add provider to `PROVIDERS` registry in `src/providers/__init__.py`
4. Update configuration schema in service classes

### Testing
```bash
# Test complete backup cycle
python3 backup test-cycle

# Test specific provider
python3 -c "from src.providers.local import LocalProvider; p = LocalProvider({'path': '/tmp'}); print(p.test_connection())"
```

## License

Copyright (C) 2024 HOMESERVER LLC

## Support

For technical support and documentation, visit the HOMESERVER documentation portal.
