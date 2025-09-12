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
backup_bp = Blueprint('backup', __name__, url_prefix='/backup')

# Configuration paths
BACKUP_CONFIG_PATH = "/etc/backupTab/settings.json"
BACKUP_STATE_PATH = "/opt/homeserver-backup/backup_state.json"
BACKUP_LOG_PATH = "/var/log/homeserver-backup/backup.log"
BACKUP_CLI_PATH = "/opt/homeserver-backup/homeserver_backup_service.py"

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

@backup_bp.route('/status', methods=['GET'])
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

@backup_bp.route('/repositories', methods=['GET'])
def get_repositories():
    """List available repositories for backup"""
    try:
        if not os.path.exists(BACKUP_CLI_PATH):
            return jsonify({
                'success': False,
                'error': 'Backup CLI not installed',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Run discovery command
        result = subprocess.run([
            'python3', BACKUP_CLI_PATH, '--discover-repos'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': f'Repository discovery failed: {result.stderr}',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        # Parse output (simplified - would need proper parsing in production)
        repositories = []
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if ' - ' in line:
                parts = line.split(' - ')
                if len(parts) >= 2:
                    repo_name = parts[0].strip()
                    status = parts[1].strip()
                    repositories.append({
                        'name': repo_name,
                        'status': 'active' if 'active' in status else 'inactive',
                        'path': f'/var/lib/gogs/repositories/{repo_name.replace("/", "/")}.git'
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

@backup_bp.route('/backup/run', methods=['POST'])
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
        
        # Build command
        cmd = ['python3', BACKUP_CLI_PATH, '--backup-type', backup_type]
        
        # Run backup
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)  # 1 hour timeout
        
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

@backup_bp.route('/cloud/test', methods=['POST'])
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
            'python3', BACKUP_CLI_PATH, '--test-connections'
        ], capture_output=True, text=True, timeout=60)
        
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

@backup_bp.route('/config', methods=['GET'])
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

@backup_bp.route('/config', methods=['POST'])
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

@backup_bp.route('/history', methods=['GET'])
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

@backup_bp.route('/schedule', methods=['GET'])
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

@backup_bp.route('/schedule', methods=['POST'])
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
