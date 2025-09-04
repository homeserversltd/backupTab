# HOMESERVER Backup Tab

Professional-grade 3-2-1 backup system with encryption and cloud upload for HOMESERVER infrastructure.

## Overview

This premium tab provides a comprehensive web interface for managing the HOMESERVER backup system. It integrates with the backup CLI backend to provide:

- **Repository Management**: Discover and select repositories for backup
- **Backup Operations**: Run manual backups with different retention policies
- **Cloud Integration**: Test and manage cloud provider connections
- **Schedule Management**: Control automated backup scheduling
- **History & Monitoring**: View backup history and system status
- **Configuration**: Manage backup settings and policies

## Features

### Repository Management
- Automatic discovery of Gogs repositories
- Repository status monitoring (active/inactive)
- Selective backup targeting
- Repository metadata display (size, last commit)

### Backup Operations
- Manual backup execution (daily, weekly, monthly, yearly)
- Real-time backup progress monitoring
- Backup result tracking and error reporting
- Integration with retention policies

### Cloud Provider Integration
- Connection testing for all configured providers
- Support for Nextcloud, Proton Drive, Backblaze B2
- Upload status monitoring
- Provider-specific configuration management

### Schedule Management
- Systemd timer integration
- Start/stop/enable/disable schedule controls
- Next run and last run time display
- Schedule configuration viewing

### System Monitoring
- Overall system status (configured/partial/not_configured)
- Service status monitoring
- Configuration validation
- Log file access and display

## Architecture

### Backend Components
- **Routes**: RESTful API endpoints for all backup operations
- **Integration**: Direct integration with backup CLI service
- **Security**: Proper permission management and input validation
- **Error Handling**: Comprehensive error reporting and logging

### Frontend Components
- **React Interface**: Modern, responsive web interface
- **Real-time Updates**: Live status and progress monitoring
- **Professional UI**: Clean, system administrator-focused design
- **Mobile Responsive**: Works on all device sizes

### Integration Points
- **Backup CLI**: Direct integration with `homeserver_backup_service.py`
- **Systemd Services**: Timer and service management
- **Configuration Files**: YAML-based configuration management
- **Log Files**: Structured logging and log viewing

## Installation

This tab integrates with the existing HOMESERVER backup system:

1. **Backend Installation**: The backup CLI must be installed at `/opt/homeserver-backup/`
2. **Service Setup**: Systemd timer service must be configured
3. **Permissions**: Proper sudo permissions for backup operations
4. **Configuration**: Valid configuration file at `/opt/homeserver-backup/config.yaml`

## Configuration

### Required Configuration
- **Backup Directory**: `/opt/homeserver-backup/`
- **Config File**: `/opt/homeserver-backup/config.yaml`
- **State File**: `/opt/homeserver-backup/backup_state.json`
- **Log File**: `/var/log/homeserver-backup/backup.log`

### API Endpoints
- `GET /api/backup/status` - System status and configuration
- `GET /api/backup/repositories` - List available repositories
- `POST /api/backup/backup/run` - Execute backup operation
- `POST /api/backup/cloud/test` - Test cloud connections
- `GET /api/backup/config` - Get configuration
- `POST /api/backup/config` - Update configuration
- `GET /api/backup/history` - Get backup history
- `GET /api/backup/schedule` - Get schedule information
- `POST /api/backup/schedule` - Update schedule

## Security

### Permission Management
- Dedicated sudo permissions for backup operations
- Restricted access to system commands
- Secure configuration file handling
- No direct file system access from web interface

### Data Protection
- All sensitive data (passwords, keys) redacted in API responses
- Secure configuration file backup before updates
- Proper error handling without information leakage
- Input validation and sanitization

## Usage

### Basic Operations
1. **System Overview**: Check system status and configuration
2. **Repository Selection**: Choose repositories for backup
3. **Backup Execution**: Run manual backups with selected repositories
4. **Cloud Testing**: Verify cloud provider connections
5. **Schedule Management**: Control automated backup scheduling

### Advanced Features
- **Configuration Management**: Update backup settings via web interface
- **History Monitoring**: View detailed backup history and logs
- **Error Diagnostics**: Comprehensive error reporting and troubleshooting
- **Status Monitoring**: Real-time system and service status

## Professional Features

### System Administrator Focus
- No hand-holding or "easy mode" interfaces
- Comprehensive error handling and reporting
- Detailed logging and monitoring capabilities
- Professional-grade security and permissions

### HOMESERVER Integration
- Designed for self-hosted infrastructure
- Integrates with existing Gogs setup
- Respects network boundaries and security policies
- Never exposes unencrypted data

### Enterprise-Grade Reliability
- Atomic operations and transaction-like behavior
- Comprehensive state tracking and management
- Automatic cleanup and maintenance
- Professional monitoring and alerting

## Troubleshooting

### Common Issues
1. **Service Not Running**: Check systemd timer status
2. **Configuration Missing**: Verify config file exists and is valid
3. **Permission Denied**: Check sudo permissions for backup operations
4. **Cloud Connection Failed**: Verify provider credentials and network access

### Debug Information
- System status provides comprehensive diagnostic information
- Log files accessible through the web interface
- Error messages include specific failure details
- Configuration validation with detailed feedback

## License

This tool is designed for system administrators who understand the value of digital sovereignty. Use responsibly and maintain your own security practices.

---

*"18 fewer backdoors for corporations to exploit"* - HOMESERVER Backup Tab
