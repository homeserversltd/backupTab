#!/usr/bin/env python3
"""
HOMESERVER Backup Tab Backend Routes
Professional backup system API endpoints
"""

import os
import json
import yaml
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from flask import Blueprint, request, jsonify, current_app

# Create blueprint
bp = Blueprint('backup', __name__, url_prefix='/api/backup')

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

@bp.route('/status', methods=['GET'])
def get_status():
    """Get backup system status and configuration"""
    try:
        status = {
            'system_status': 'unknown',
            'config_exists': False,
            'state_exists': False,
            'service_status': 'unknown',
            'last_backup': None,
            'repositories_count': 0,
            'cloud_providers': []
        }
        
        # Check if config file exists
        if os.path.exists(BACKUP_CONFIG_PATH):
            status['config_exists'] = True
            try:
                with open(BACKUP_CONFIG_PATH, 'r') as f:
                    config = yaml.safe_load(f)
                    status['repositories_count'] = len([r for r in config.get('repositories', []) if r.get('enabled', False)])
                    status['cloud_providers'] = [name for name, provider in config.get('cloud_providers', {}).items() if provider.get('enabled', False)]
            except Exception as e:
                get_logger().error(f"Failed to read config: {e}")
        
        # Check if state file exists
        if os.path.exists(BACKUP_STATE_PATH):
            status['state_exists'] = True
            try:
                with open(BACKUP_STATE_PATH, 'r') as f:
                    state = json.load(f)
                    status['last_backup'] = state.get('last_daily_backup')
            except Exception as e:
                get_logger().error(f"Failed to read state: {e}")
        
        # Check systemd service status
        try:
            result = subprocess.run(['systemctl', 'is-active', 'homeserver-backup.timer'], 
                                  capture_output=True, text=True, timeout=10)
            status['service_status'] = result.stdout.strip()
        except Exception as e:
            get_logger().error(f"Failed to check service status: {e}")
        
        # Determine overall system status
        if status['config_exists'] and status['state_exists']:
            status['system_status'] = 'configured'
        elif status['config_exists']:
            status['system_status'] = 'partial'
        else:
            status['system_status'] = 'not_configured'
        
        return jsonify({
            'success': True,
            'data': status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Status check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/repositories', methods=['GET'])
def get_repositories():
    """List available repositories for backup"""
    try:
        if not os.path.exists(BACKUP_CLI_PATH):
            return jsonify({
                'success': False,
                'error': 'Backup CLI not installed',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Run discovery command - use list-providers instead
        result = subprocess.run([
            'python3', 'backup', 'list-providers'
        ], cwd=BACKUP_CLI_PATH, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': f'Repository discovery failed: {result.stderr}',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        # Parse output - convert providers to repository-like format
        repositories = []
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if ' - ' in line and not line.startswith('Available providers:'):
                parts = line.split(' - ')
                if len(parts) >= 2:
                    provider_name = parts[0].strip()
                    status = parts[1].strip()
                    repositories.append({
                        'name': provider_name,
                        'status': 'enabled' if 'enabled' in status else 'disabled',
                        'type': 'provider',
                        'path': f'/backup/{provider_name}'
                    })
        
        return jsonify({
            'success': True,
            'data': repositories,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Repository listing failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/backup/run', methods=['POST'])
def run_backup():
    """Run backup for specified repositories"""
    try:
        data = request.get_json() or {}
        backup_type = data.get('type', 'daily')
        repositories = data.get('repositories', [])
        
        if not os.path.exists(BACKUP_CLI_PATH):
            return jsonify({
                'success': False,
                'error': 'Backup CLI not installed',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Build command - use create command
        cmd = ['python3', 'backup', 'create']
        
        # Run backup
        result = subprocess.run(cmd, cwd=BACKUP_CLI_PATH, capture_output=True, text=True, timeout=3600)  # 1 hour timeout
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'data': {
                    'backup_type': backup_type,
                    'repositories': repositories,
                    'output': result.stdout,
                    'completed_at': datetime.now().isoformat()
                },
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Backup failed: {result.stderr}',
                'output': result.stdout,
                'timestamp': datetime.now().isoformat()
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Backup operation timed out',
            'timestamp': datetime.now().isoformat()
        }), 408
    except Exception as e:
        get_logger().error(f"Backup execution failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/cloud/test', methods=['POST'])
def test_cloud_connections():
    """Test cloud provider connections"""
    try:
        if not os.path.exists(BACKUP_CLI_PATH):
            return jsonify({
                'success': False,
                'error': 'Backup CLI not installed',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Run connection test
        result = subprocess.run([
            'python3', 'backup', 'test-providers'
        ], cwd=BACKUP_CLI_PATH, capture_output=True, text=True, timeout=60)
        
        # Parse results (simplified)
        connections = {}
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if '✓' in line or '✗' in line:
                if '✓' in line:
                    provider = line.split('✓')[1].strip()
                    connections[provider] = True
                elif '✗' in line:
                    provider = line.split('✗')[1].strip()
                    connections[provider] = False
        
        return jsonify({
            'success': True,
            'data': {
                'connections': connections,
                'output': result.stdout,
                'tested_at': datetime.now().isoformat()
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Cloud connection test failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/config', methods=['GET'])
def get_config():
    """Get backup configuration"""
    try:
        # Check and update configuration if needed
        if not check_and_update_config():
            get_logger().warning("Configuration update check failed, continuing with existing config")
        
        if not os.path.exists(BACKUP_CONFIG_PATH):
            return jsonify({
                'success': False,
                'error': 'Configuration file not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        with open(BACKUP_CONFIG_PATH, 'r') as f:
            config = json.load(f)
        
        # Remove sensitive information
        safe_config = config.copy()
        for provider_name, provider_config in safe_config.get('providers', {}).items():
            if 'password' in provider_config:
                provider_config['password'] = '***REDACTED***'
            if 'application_key' in provider_config:
                provider_config['application_key'] = '***REDACTED***'
            if 'secret_key' in provider_config:
                provider_config['secret_key'] = '***REDACTED***'
        
        return jsonify({
            'success': True,
            'data': safe_config,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Config retrieval failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/config', methods=['POST'])
def update_config():
    """Update backup configuration"""
    try:
        # Check and update configuration if needed before processing
        if not check_and_update_config():
            get_logger().warning("Configuration update check failed, continuing with existing config")
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No configuration data provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Create backup of existing config
        if os.path.exists(BACKUP_CONFIG_PATH):
            backup_path = f"{BACKUP_CONFIG_PATH}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            subprocess.run(['cp', BACKUP_CONFIG_PATH, backup_path], check=True)
        
        # Write new config
        with open(BACKUP_CONFIG_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({
            'success': True,
            'data': {'message': 'Configuration updated successfully'},
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Config update failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/history', methods=['GET'])
def get_backup_history():
    """Get backup history and logs"""
    try:
        history = {
            'recent_backups': [],
            'log_entries': [],
            'state': {}
        }
        
        # Read state file
        if os.path.exists(BACKUP_STATE_PATH):
            with open(BACKUP_STATE_PATH, 'r') as f:
                state = json.load(f)
                history['state'] = state
                history['recent_backups'] = state.get('backup_history', [])[-10:]  # Last 10 backups
        
        # Read log file (last 50 lines)
        if os.path.exists(BACKUP_LOG_PATH):
            try:
                result = subprocess.run(['tail', '-50', BACKUP_LOG_PATH], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    history['log_entries'] = result.stdout.strip().split('\n')
            except Exception as e:
                get_logger().error(f"Failed to read log file: {e}")
        
        return jsonify({
            'success': True,
            'data': history,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"History retrieval failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/schedule', methods=['GET'])
def get_schedule():
    """Get backup schedule configuration"""
    try:
        schedule = {
            'timer_status': 'unknown',
            'next_run': None,
            'last_run': None,
            'schedule_config': {}
        }
        
        # Check timer status
        try:
            result = subprocess.run(['systemctl', 'is-active', 'homeserver-backup.timer'], 
                                  capture_output=True, text=True, timeout=10)
            schedule['timer_status'] = result.stdout.strip()
        except Exception:
            pass
        
        # Get next run time
        try:
            result = subprocess.run(['systemctl', 'list-timers', 'homeserver-backup.timer', '--no-pager'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if 'homeserver-backup.timer' in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            schedule['next_run'] = parts[0]
                            schedule['last_run'] = parts[1]
                        break
        except Exception:
            pass
        
        # Read schedule config from main config
        if os.path.exists(BACKUP_CONFIG_PATH):
            with open(BACKUP_CONFIG_PATH, 'r') as f:
                config = yaml.safe_load(f)
                schedule['schedule_config'] = config.get('schedule', {})
        
        return jsonify({
            'success': True,
            'data': schedule,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Schedule retrieval failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/schedule', methods=['POST'])
def update_schedule():
    """Update backup schedule"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No schedule data provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        action = data.get('action')
        
        if action == 'start':
            result = subprocess.run(['systemctl', 'start', 'homeserver-backup.timer'], 
                                  capture_output=True, text=True, timeout=10)
        elif action == 'stop':
            result = subprocess.run(['systemctl', 'stop', 'homeserver-backup.timer'], 
                                  capture_output=True, text=True, timeout=10)
        elif action == 'enable':
            result = subprocess.run(['systemctl', 'enable', 'homeserver-backup.timer'], 
                                  capture_output=True, text=True, timeout=10)
        elif action == 'disable':
            result = subprocess.run(['systemctl', 'disable', 'homeserver-backup.timer'], 
                                  capture_output=True, text=True, timeout=10)
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown action: {action}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'data': {'message': f'Schedule {action} successful'},
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Schedule {action} failed: {result.stderr}',
                'timestamp': datetime.now().isoformat()
            }), 500
            
    except Exception as e:
        get_logger().error(f"Schedule update failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/providers/schema', methods=['GET'])
def get_provider_schema():
    """Get comprehensive provider configuration schema for all available providers"""
    try:
        # Define the complete schema for all providers based on settings.json and provider implementations
        provider_schema = {
            'local': {
                'name': 'Local File System',
                'description': 'Store backups on the local file system',
                'status': 'available',
                'config_fields': {
                    'enabled': {
                        'type': 'boolean',
                        'description': 'Enable or disable the local provider',
                        'default': False,
                        'required': False
                    },
                    'path': {
                        'type': 'string',
                        'description': 'Local directory path for storing backups',
                        'default': '/var/backups/homeserver',
                        'required': True,
                        'validation': {
                            'pattern': '^/[a-zA-Z0-9_/.-]+$',
                            'message': 'Must be a valid absolute path'
                        }
                    }
                }
            },
            'backblaze': {
                'name': 'Backblaze B2',
                'description': 'Store backups on Backblaze B2 cloud storage',
                'status': 'available',
                'config_fields': {
                    'enabled': {
                        'type': 'boolean',
                        'description': 'Enable or disable the Backblaze provider',
                        'default': False,
                        'required': False
                    },
                    'application_key_id': {
                        'type': 'string',
                        'description': 'Backblaze B2 Application Key ID',
                        'default': '',
                        'required': True,
                        'validation': {
                            'pattern': '^K[0-9a-zA-Z]{19}$',
                            'message': 'Must be a valid Backblaze B2 Application Key ID (starts with K, 20 characters)'
                        }
                    },
                    'application_key': {
                        'type': 'string',
                        'description': 'Backblaze B2 Application Key',
                        'default': '',
                        'required': True,
                        'validation': {
                            'pattern': '^K[0-9a-zA-Z]{31}$',
                            'message': 'Must be a valid Backblaze B2 Application Key (starts with K, 32 characters)'
                        }
                    },
                    'container': {
                        'type': 'string',
                        'description': 'B2 bucket name for storing backups',
                        'default': 'homeserver-backups',
                        'required': True,
                        'validation': {
                            'pattern': '^[a-zA-Z0-9-]{3,63}$',
                            'message': 'Must be a valid B2 bucket name (3-63 characters, alphanumeric and hyphens)'
                        }
                    },
                    'container_type': {
                        'type': 'string',
                        'description': 'Container type (always bucket for B2)',
                        'default': 'bucket',
                        'required': False,
                        'readonly': True
                    },
                    'region': {
                        'type': 'string',
                        'description': 'B2 region identifier',
                        'default': 'us-west-000',
                        'required': False,
                        'options': ['us-west-000', 'us-west-001', 'us-west-002', 'us-east-000', 'us-east-001', 'eu-central-000']
                    },
                    'max_retries': {
                        'type': 'integer',
                        'description': 'Maximum number of retry attempts for failed operations',
                        'default': 3,
                        'required': False,
                        'validation': {
                            'min': 1,
                            'max': 10,
                            'message': 'Must be between 1 and 10'
                        }
                    },
                    'retry_delay': {
                        'type': 'number',
                        'description': 'Initial delay between retry attempts in seconds',
                        'default': 1.0,
                        'required': False,
                        'validation': {
                            'min': 0.1,
                            'max': 60.0,
                            'message': 'Must be between 0.1 and 60.0 seconds'
                        }
                    },
                    'timeout': {
                        'type': 'integer',
                        'description': 'Request timeout in seconds',
                        'default': 300,
                        'required': False,
                        'validation': {
                            'min': 30,
                            'max': 3600,
                            'message': 'Must be between 30 and 3600 seconds'
                        }
                    },
                    'max_bandwidth': {
                        'type': 'integer',
                        'description': 'Maximum bandwidth in bytes per second (null for unlimited)',
                        'default': None,
                        'required': False,
                        'validation': {
                            'min': 1024,
                            'message': 'Must be at least 1024 bytes per second'
                        }
                    },
                    'upload_chunk_size': {
                        'type': 'integer',
                        'description': 'Upload chunk size in bytes for large files',
                        'default': 104857600,
                        'required': False,
                        'validation': {
                            'min': 1048576,
                            'max': 1073741824,
                            'message': 'Must be between 1MB and 1GB'
                        }
                    },
                    'encryption_enabled': {
                        'type': 'boolean',
                        'description': 'Enable client-side encryption',
                        'default': False,
                        'required': False
                    },
                    'encryption_key': {
                        'type': 'string',
                        'description': 'Encryption key (auto-generated if not provided)',
                        'default': None,
                        'required': False
                    },
                    'encryption_salt': {
                        'type': 'string',
                        'description': 'Encryption salt (auto-generated if not provided)',
                        'default': None,
                        'required': False
                    },
                    'connection_pool_size': {
                        'type': 'integer',
                        'description': 'Maximum number of concurrent connections',
                        'default': 5,
                        'required': False,
                        'validation': {
                            'min': 1,
                            'max': 20,
                            'message': 'Must be between 1 and 20'
                        }
                    },
                    'username': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for B2)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    },
                    'password': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for B2)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    }
                }
            },
            'google_drive': {
                'name': 'Google Drive',
                'description': 'Store backups on Google Drive cloud storage',
                'status': 'future_development',
                'config_fields': {
                    'enabled': {
                        'type': 'boolean',
                        'description': 'Enable or disable the Google Drive provider',
                        'default': False,
                        'required': False
                    },
                    'credentials_file': {
                        'type': 'string',
                        'description': 'Path to Google OAuth2 credentials JSON file',
                        'default': 'credentials.json',
                        'required': True,
                        'validation': {
                            'pattern': '^[a-zA-Z0-9_/.-]+\\.json$',
                            'message': 'Must be a valid JSON file path'
                        }
                    },
                    'token_file': {
                        'type': 'string',
                        'description': 'Path to store OAuth2 tokens',
                        'default': 'token.json',
                        'required': False,
                        'validation': {
                            'pattern': '^[a-zA-Z0-9_/.-]+\\.json$',
                            'message': 'Must be a valid JSON file path'
                        }
                    },
                    'container': {
                        'type': 'string',
                        'description': 'Google Drive folder name for backups',
                        'default': 'HOMESERVER Backups',
                        'required': True
                    },
                    'container_type': {
                        'type': 'string',
                        'description': 'Container type (always folder for Google Drive)',
                        'default': 'folder',
                        'required': False,
                        'readonly': True
                    },
                    'folder_id': {
                        'type': 'string',
                        'description': 'Google Drive folder ID (auto-detected if not provided)',
                        'default': '',
                        'required': False
                    },
                    'max_retries': {
                        'type': 'integer',
                        'description': 'Maximum number of retry attempts',
                        'default': 3,
                        'required': False,
                        'validation': {
                            'min': 1,
                            'max': 10,
                            'message': 'Must be between 1 and 10'
                        }
                    },
                    'retry_delay': {
                        'type': 'number',
                        'description': 'Initial delay between retry attempts in seconds',
                        'default': 1.0,
                        'required': False,
                        'validation': {
                            'min': 0.1,
                            'max': 60.0,
                            'message': 'Must be between 0.1 and 60.0 seconds'
                        }
                    },
                    'timeout': {
                        'type': 'integer',
                        'description': 'Request timeout in seconds',
                        'default': 300,
                        'required': False,
                        'validation': {
                            'min': 30,
                            'max': 3600,
                            'message': 'Must be between 30 and 3600 seconds'
                        }
                    },
                    'username': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for Google Drive)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    },
                    'password': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for Google Drive)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    }
                }
            },
            'google_cloud_storage': {
                'name': 'Google Cloud Storage',
                'description': 'Store backups on Google Cloud Storage',
                'status': 'future_development',
                'config_fields': {
                    'enabled': {
                        'type': 'boolean',
                        'description': 'Enable or disable the Google Cloud Storage provider',
                        'default': False,
                        'required': False
                    },
                    'credentials_file': {
                        'type': 'string',
                        'description': 'Path to Google Cloud service account key JSON file',
                        'default': 'gcs_credentials.json',
                        'required': True,
                        'validation': {
                            'pattern': '^[a-zA-Z0-9_/.-]+\\.json$',
                            'message': 'Must be a valid JSON file path'
                        }
                    },
                    'container': {
                        'type': 'string',
                        'description': 'GCS bucket name for storing backups',
                        'default': 'homeserver-backups',
                        'required': True,
                        'validation': {
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9-]{2,61}[a-zA-Z0-9]$',
                            'message': 'Must be a valid GCS bucket name'
                        }
                    },
                    'container_type': {
                        'type': 'string',
                        'description': 'Container type (always bucket for GCS)',
                        'default': 'bucket',
                        'required': False,
                        'readonly': True
                    },
                    'bucket_name': {
                        'type': 'string',
                        'description': 'GCS bucket name (alias for container)',
                        'default': 'homeserver-backups',
                        'required': True
                    },
                    'project_id': {
                        'type': 'string',
                        'description': 'Google Cloud project ID',
                        'default': '',
                        'required': True,
                        'validation': {
                            'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]$',
                            'message': 'Must be a valid Google Cloud project ID'
                        }
                    },
                    'max_retries': {
                        'type': 'integer',
                        'description': 'Maximum number of retry attempts',
                        'default': 3,
                        'required': False,
                        'validation': {
                            'min': 1,
                            'max': 10,
                            'message': 'Must be between 1 and 10'
                        }
                    },
                    'retry_delay': {
                        'type': 'number',
                        'description': 'Initial delay between retry attempts in seconds',
                        'default': 1.0,
                        'required': False,
                        'validation': {
                            'min': 0.1,
                            'max': 60.0,
                            'message': 'Must be between 0.1 and 60.0 seconds'
                        }
                    },
                    'timeout': {
                        'type': 'integer',
                        'description': 'Request timeout in seconds',
                        'default': 300,
                        'required': False,
                        'validation': {
                            'min': 30,
                            'max': 3600,
                            'message': 'Must be between 30 and 3600 seconds'
                        }
                    },
                    'username': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for GCS)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    },
                    'password': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for GCS)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    }
                }
            },
            'dropbox': {
                'name': 'Dropbox',
                'description': 'Store backups on Dropbox cloud storage',
                'status': 'future_development',
                'config_fields': {
                    'enabled': {
                        'type': 'boolean',
                        'description': 'Enable or disable the Dropbox provider',
                        'default': False,
                        'required': False
                    },
                    'container': {
                        'type': 'string',
                        'description': 'Dropbox folder path for backups',
                        'default': '/HOMESERVER Backups',
                        'required': True,
                        'validation': {
                            'pattern': '^/[a-zA-Z0-9_/.-]*$',
                            'message': 'Must be a valid Dropbox folder path starting with /'
                        }
                    },
                    'container_type': {
                        'type': 'string',
                        'description': 'Container type (always folder for Dropbox)',
                        'default': 'folder',
                        'required': False,
                        'readonly': True
                    },
                    'username': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for Dropbox)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    },
                    'password': {
                        'type': 'string',
                        'description': 'Legacy field for compatibility (not used for Dropbox)',
                        'default': '',
                        'required': False,
                        'deprecated': True
                    }
                }
            }
        }
        
        # Add global configuration schema
        global_schema = {
            'backup_items': {
                'type': 'array',
                'description': 'List of files and directories to backup',
                'default': ['/tmp/test.txt'],
                'required': True,
                'validation': {
                    'min_items': 1,
                    'message': 'At least one backup item must be specified'
                }
            },
            'retention_days': {
                'type': 'integer',
                'description': 'Number of days to retain backups',
                'default': 30,
                'required': False,
                'validation': {
                    'min': 1,
                    'max': 3650,
                    'message': 'Must be between 1 and 3650 days'
                }
            },
            'encryption_enabled': {
                'type': 'boolean',
                'description': 'Enable global encryption for backup packages',
                'default': True,
                'required': False
            },
            'logging': {
                'type': 'object',
                'description': 'Logging configuration',
                'required': False,
                'properties': {
                    'enabled': {
                        'type': 'boolean',
                        'description': 'Enable logging',
                        'default': True
                    },
                    'log_file': {
                        'type': 'string',
                        'description': 'Path to log file',
                        'default': '/var/log/homeserver/backup.log'
                    },
                    'log_level': {
                        'type': 'string',
                        'description': 'Logging level',
                        'default': 'INFO',
                        'options': ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
                    },
                    'max_file_size_mb': {
                        'type': 'integer',
                        'description': 'Maximum log file size in MB',
                        'default': 10,
                        'validation': {
                            'min': 1,
                            'max': 1000,
                            'message': 'Must be between 1 and 1000 MB'
                        }
                    },
                    'backup_count': {
                        'type': 'integer',
                        'description': 'Number of backup log files to keep',
                        'default': 5,
                        'validation': {
                            'min': 1,
                            'max': 50,
                            'message': 'Must be between 1 and 50'
                        }
                    },
                    'format': {
                        'type': 'string',
                        'description': 'Log message format',
                        'default': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                    }
                }
            }
        }
        
        return jsonify({
            'success': True,
            'data': {
                'providers': provider_schema,
                'global_config': global_schema,
                'provider_status_legend': {
                    'available': 'Fully functional and ready to use',
                    'future_development': 'Planned for future releases, currently disabled'
                },
                'field_types': {
                    'boolean': 'True/false value',
                    'string': 'Text value',
                    'integer': 'Whole number',
                    'number': 'Decimal number',
                    'array': 'List of values',
                    'object': 'Nested configuration object'
                },
                'validation_types': {
                    'pattern': 'Regular expression validation',
                    'min': 'Minimum value',
                    'max': 'Maximum value',
                    'min_items': 'Minimum number of items in array',
                    'options': 'List of allowed values'
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Provider schema retrieval failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/providers/<provider_name>/config', methods=['GET'])
def get_provider_config(provider_name):
    """Get current configuration for a specific provider"""
    try:
        if not os.path.exists(BACKUP_CONFIG_PATH):
            return jsonify({
                'success': False,
                'error': 'Configuration file not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        with open(BACKUP_CONFIG_PATH, 'r') as f:
            config = json.load(f)
        
        # Get provider config
        providers = config.get('providers', {})
        if provider_name not in providers:
            return jsonify({
                'success': False,
                'error': f'Provider {provider_name} not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        provider_config = providers[provider_name].copy()
        
        # Redact sensitive information
        sensitive_fields = ['password', 'application_key', 'secret_key', 'encryption_key', 'encryption_salt']
        for field in sensitive_fields:
            if field in provider_config and provider_config[field]:
                provider_config[field] = '***REDACTED***'
        
        return jsonify({
            'success': True,
            'data': {
                'provider_name': provider_name,
                'config': provider_config,
                'is_configured': bool(provider_config.get('enabled', False))
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Provider config retrieval failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/providers/<provider_name>/config', methods=['POST'])
def update_provider_config(provider_name):
    """Update configuration for a specific provider"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No configuration data provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Check and update configuration if needed
        if not check_and_update_config():
            get_logger().warning("Configuration update check failed, continuing with existing config")
        
        if not os.path.exists(BACKUP_CONFIG_PATH):
            return jsonify({
                'success': False,
                'error': 'Configuration file not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Load current config
        with open(BACKUP_CONFIG_PATH, 'r') as f:
            config = json.load(f)
        
        # Validate provider exists
        if 'providers' not in config:
            config['providers'] = {}
        
        if provider_name not in config['providers']:
            return jsonify({
                'success': False,
                'error': f'Provider {provider_name} not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Create backup of existing config
        backup_path = f"{BACKUP_CONFIG_PATH}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        subprocess.run(['cp', BACKUP_CONFIG_PATH, backup_path], check=True)
        
        # Update provider config
        config['providers'][provider_name].update(data)
        
        # Write updated config
        with open(BACKUP_CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=2)
        
        return jsonify({
            'success': True,
            'data': {
                'message': f'Configuration updated for provider {provider_name}',
                'provider_name': provider_name,
                'updated_fields': list(data.keys())
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Provider config update failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@bp.route('/providers/<provider_name>/test', methods=['POST'])
def test_provider_connection(provider_name):
    """Test connection to a specific provider"""
    try:
        if not os.path.exists(BACKUP_CLI_PATH):
            return jsonify({
                'success': False,
                'error': 'Backup CLI not installed',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Run provider-specific connection test
        result = subprocess.run([
            'python3', 'backup', 'test-providers'
        ], cwd=BACKUP_CLI_PATH, capture_output=True, text=True, timeout=60)
        
        # Parse results to find specific provider
        provider_result = None
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if provider_name in line:
                if '✓' in line:
                    provider_result = True
                elif '✗' in line:
                    provider_result = False
                break
        
        return jsonify({
            'success': True,
            'data': {
                'provider_name': provider_name,
                'connection_successful': provider_result,
                'output': result.stdout,
                'tested_at': datetime.now().isoformat()
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        get_logger().error(f"Provider connection test failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
