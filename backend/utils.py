#!/usr/bin/env python3
"""
HOMESERVER Backup Tab Backend Utilities
Shared functions, constants, and helper utilities
"""

import os
import json
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Configuration paths
BACKUP_CONFIG_PATH = "/etc/backupTab/settings.json"
BACKUP_STATE_PATH = "/opt/homeserver-backup/backup_state.json"
BACKUP_LOG_PATH = "/var/log/homeserver-backup/backup.log"
BACKUP_CLI_PATH = "/var/www/homeserver/premium/backupTab/backend"

def get_logger():
    """Get logger for backup operations"""
    return logging.getLogger(__name__)

def check_and_update_config():
    """Check if configuration needs updating and run update script if needed."""
    try:
        # Check if system config exists
        if not os.path.exists(BACKUP_CONFIG_PATH):
            get_logger().info("System config not found, creating from template")
            return True
        
        # Check if update script exists
        update_script = "/usr/local/bin/homeserver-backup-update-settings"
        if not os.path.exists(update_script):
            get_logger().warning("Settings update script not found")
            return False
        
        # Run update script in dry-run mode to check for differences
        result = subprocess.run([
            update_script, "--dry-run"
        ], capture_output=True, text=True, timeout=30)
        
        # If there are differences, run the actual update
        if result.returncode == 0 and "New fields that would be added:" in result.stdout:
            get_logger().info("Configuration update needed, running update script")
            
            # Run actual update
            update_result = subprocess.run([
                update_script
            ], capture_output=True, text=True, timeout=60)
            
            if update_result.returncode == 0:
                get_logger().info("Configuration updated successfully")
                return True
            else:
                get_logger().error(f"Configuration update failed: {update_result.stderr}")
                return False
        
        return True
        
    except subprocess.TimeoutExpired:
        get_logger().error("Configuration update timed out")
        return False
    except Exception as e:
        get_logger().error(f"Error checking/updating configuration: {e}")
        return False

def create_backup_timestamp() -> str:
    """Create a timestamp string for backup operations"""
    return datetime.now().isoformat()

def create_config_backup(config_path: str) -> str:
    """Create a backup of the configuration file"""
    backup_path = f"{config_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    subprocess.run(['/usr/bin/sudo', '/bin/cp', config_path, backup_path], check=True)
    return backup_path

def redact_sensitive_fields(config: Dict[str, Any]) -> Dict[str, Any]:
    """Redact sensitive fields from configuration"""
    sensitive_fields = ['password', 'application_key', 'secret_key', 'encryption_key', 'encryption_salt']
    
    if isinstance(config, dict):
        redacted_config = config.copy()
        for field in sensitive_fields:
            if field in redacted_config and redacted_config[field]:
                redacted_config[field] = '***REDACTED***'
        return redacted_config
    
    return config

def run_cli_command(command: list, timeout: int = 60) -> tuple[bool, str, str]:
    """Run a CLI command and return success status, stdout, and stderr"""
    try:
        result = subprocess.run(
            command, 
            cwd=BACKUP_CLI_PATH, 
            capture_output=True, 
            text=True, 
            timeout=timeout
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def validate_file_path(path: str) -> bool:
    """Validate that a file path exists and is readable"""
    try:
        return os.path.exists(path) and os.access(path, os.R_OK)
    except Exception:
        return False

def get_systemd_service_status(service_name: str) -> str:
    """Get systemd service status"""
    try:
        result = subprocess.run(
            ['/bin/systemctl', 'is-active', service_name], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        return result.stdout.strip() if result.returncode == 0 else 'unknown'
    except Exception:
        return 'unknown'

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"

def parse_backup_output(output: str) -> Dict[str, Any]:
    """Parse backup CLI output for structured information"""
    parsed = {
        'files_found': [],
        'errors': [],
        'warnings': [],
        'success': True
    }
    
    lines = output.strip().split('\n')
    for line in lines:
        if '✓' in line:
            parsed['files_found'].append(line)
        elif '✗' in line or 'ERROR' in line:
            parsed['errors'].append(line)
            parsed['success'] = False
        elif 'WARNING' in line or 'WARN' in line:
            parsed['warnings'].append(line)
    
    return parsed

def get_provider_status_from_output(output: str, provider_name: str) -> Optional[bool]:
    """Extract provider status from CLI output"""
    lines = output.strip().split('\n')
    for line in lines:
        if provider_name in line:
            if '✓' in line:
                return True
            elif '✗' in line:
                return False
    return None

def validate_config_schema(config: Dict[str, Any], schema: Dict[str, Any]) -> tuple[bool, list]:
    """Validate configuration against schema"""
    errors = []
    
    for field_name, field_config in schema.items():
        if field_config.get('required', False) and field_name not in config:
            errors.append(f"Required field '{field_name}' is missing")
            continue
        
        if field_name in config:
            value = config[field_name]
            field_type = field_config.get('type')
            
            # Type validation
            if field_type == 'boolean' and not isinstance(value, bool):
                errors.append(f"Field '{field_name}' must be a boolean")
            elif field_type == 'integer' and not isinstance(value, int):
                errors.append(f"Field '{field_name}' must be an integer")
            elif field_type == 'number' and not isinstance(value, (int, float)):
                errors.append(f"Field '{field_name}' must be a number")
            elif field_type == 'string' and not isinstance(value, str):
                errors.append(f"Field '{field_name}' must be a string")
            elif field_type == 'array' and not isinstance(value, list):
                errors.append(f"Field '{field_name}' must be an array")
            elif field_type == 'object' and not isinstance(value, dict):
                errors.append(f"Field '{field_name}' must be an object")
            
            # Validation rules
            validation = field_config.get('validation', {})
            if 'min' in validation and value < validation['min']:
                errors.append(f"Field '{field_name}' must be at least {validation['min']}")
            if 'max' in validation and value > validation['max']:
                errors.append(f"Field '{field_name}' must be at most {validation['max']}")
            if 'min_items' in validation and len(value) < validation['min_items']:
                errors.append(f"Field '{field_name}' must have at least {validation['min_items']} items")
            if 'pattern' in validation:
                import re
                if not re.match(validation['pattern'], str(value)):
                    message = validation.get('message', f"Field '{field_name}' format is invalid")
                    errors.append(message)
    
    return len(errors) == 0, errors
