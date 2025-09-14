#!/usr/bin/env python3
"""
HOMESERVER Backup Tab Backend Routes
Professional backup system API endpoints - Refactored version
"""

import os
import subprocess
from datetime import datetime
from flask import Blueprint, request, jsonify
from .utils import get_logger, create_backup_timestamp
from .config_manager import BackupConfigManager
from .provider_handlers import ProviderHandler
from .backup_handlers import BackupHandler
from .schedule_handlers import ScheduleHandler

# Create blueprint
bp = Blueprint('backup', __name__, url_prefix='/api/backup')

# Initialize handlers
config_manager = BackupConfigManager()
provider_handler = ProviderHandler()
backup_handler = BackupHandler()
schedule_handler = ScheduleHandler()

def create_response(success: bool, data: dict = None, error: str = None, status_code: int = 200):
    """Create standardized API response"""
    response_data = {
        'success': success,
        'timestamp': create_backup_timestamp()
    }
    
    if success:
        if data is not None:
            response_data['data'] = data
    else:
        if error:
            response_data['error'] = error
    
    return jsonify(response_data), status_code if not success else 200

def _get_provider_description(provider_name: str) -> str:
    """Get human-readable description for provider"""
    descriptions = {
        'local': 'Store backups on local disk',
        'backblaze': 'Cloud storage with competitive pricing',
        'google_drive': 'Google Drive cloud storage',
        'google_cloud_storage': 'Google Cloud Storage buckets',
        'dropbox': 'Dropbox cloud storage',
        'aws_s3': 'Amazon S3 cloud storage'
    }
    return descriptions.get(provider_name, f'{provider_name.replace("_", " ").title()} storage')

def _get_provider_icon(provider_name: str) -> str:
    """Get emoji icon for provider"""
    icons = {
        'local': '💾',
        'backblaze': '☁️',
        'google_drive': '📁',
        'google_cloud_storage': '🗄️',
        'dropbox': '📦',
        'aws_s3': '☁️'
    }
    return icons.get(provider_name, '💿')

def _is_provider_available(provider_name: str) -> bool:
    """Check if provider is available to be configured (not necessarily fully configured)"""
    # Local is always available
    if provider_name == 'local':
        return True
    
    # Backblaze is hardcoded as available
    if provider_name == 'backblaze':
        return True
    
    # Other providers are not yet implemented
    return False

def _is_provider_configured(provider_name: str, provider_config: dict) -> bool:
    """Check if provider has required credentials configured"""
    if provider_name == 'local':
        # Local provider is always configured - it doesn't need credentials
        return True
    
    elif provider_name == 'backblaze':
        # Backblaze needs application_key_id and application_key
        return bool(
            provider_config.get('application_key_id', '').strip() and
            provider_config.get('application_key', '').strip()
        )
    
    elif provider_name == 'google_drive':
        # Google Drive needs credentials_file and token_file
        return bool(
            provider_config.get('credentials_file', '').strip() and
            provider_config.get('token_file', '').strip()
        )
    
    elif provider_name == 'google_cloud_storage':
        # Google Cloud Storage needs credentials_file and project_id
        return bool(
            provider_config.get('credentials_file', '').strip() and
            provider_config.get('project_id', '').strip()
        )
    
    elif provider_name == 'dropbox':
        # Dropbox needs username and password (or access token)
        return bool(
            provider_config.get('username', '').strip() and
            provider_config.get('password', '').strip()
        )
    
    elif provider_name == 'aws_s3':
        # AWS S3 needs access_key_id and secret_access_key
        return bool(
            provider_config.get('access_key_id', '').strip() and
            provider_config.get('secret_access_key', '').strip()
        )
    
    # Default to False for unknown providers
    return False

# System Status Routes
@bp.route('/status', methods=['GET'])
def get_status():
    """Get backup system status and configuration"""
    try:
        status = backup_handler.get_system_status()
        return create_response(True, status)
    except Exception as e:
        get_logger().error(f"Status check failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Repository/Provider Routes
@bp.route('/repositories', methods=['GET'])
def get_repositories():
    """List available repositories for backup"""
    try:
        repositories = provider_handler.list_providers()
        return create_response(True, repositories)
    except Exception as e:
        get_logger().error(f"Repository listing failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/providers/status', methods=['GET'])
def get_providers_status():
    """Get status of all providers in a simple, iterable format"""
    try:
        # Get the full config
        config = config_manager.get_safe_config()
        providers = config.get('providers', {})
        
        # Create simple status list for frontend iteration
        provider_status = []
        for provider_name, provider_config in providers.items():
            is_available = _is_provider_available(provider_name)
            is_configured = _is_provider_configured(provider_name, provider_config)
            provider_status.append({
                'name': provider_name,
                'enabled': provider_config.get('enabled', False),
                'available': is_available,
                'configured': is_configured,
                'display_name': provider_name.replace('_', ' ').title(),
                'description': _get_provider_description(provider_name),
                'icon': _get_provider_icon(provider_name)
            })
        
        return create_response(True, {'providers': provider_status})
    except Exception as e:
        get_logger().error(f"Provider status retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Backup Operations Routes
@bp.route('/backup/run', methods=['POST'])
def run_backup():
    """Run backup for specified repositories"""
    try:
        data = request.get_json() or {}
        backup_type = data.get('type', 'daily')
        repositories = data.get('repositories', [])
        
        result = backup_handler.run_backup(backup_type, repositories)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Backup execution failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/backup/sync-now', methods=['POST'])
def sync_now():
    """Run backup script directly (Sync Now button)"""
    try:
        # Path to the backup script
        backup_script = '/var/www/homeserver/premium/backupTab/backend/backup'
        
        # Check if script exists
        if not os.path.exists(backup_script):
            return create_response(False, error='Backup script not found', status_code=404)
        
        # Make script executable
        os.chmod(backup_script, 0o755)
        
        # Run the backup script
        result = subprocess.run(
            [backup_script, 'create'],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            cwd='/var/www/homeserver/premium/backupTab/backend'
        )
        
        if result.returncode == 0:
            return create_response(True, {
                'message': 'Backup completed successfully',
                'output': result.stdout,
                'timestamp': create_backup_timestamp()
            })
        else:
            return create_response(False, error=f'Backup failed: {result.stderr}', status_code=500)
            
    except subprocess.TimeoutExpired:
        get_logger().error("Backup script timed out")
        return create_response(False, error='Backup timed out', status_code=408)
    except Exception as e:
        get_logger().error(f"Sync now failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/cloud/test', methods=['POST'])
def test_cloud_connections():
    """Test cloud provider connections"""
    try:
        connections = provider_handler.test_all_providers()
        return create_response(True, {'connections': connections})
    except Exception as e:
        get_logger().error(f"Cloud connection test failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Configuration Routes
@bp.route('/config', methods=['GET'])
def get_config():
    """Get backup configuration"""
    try:
        config = config_manager.get_safe_config()
        # Ensure backup_count is included
        if 'backup_count' not in config:
            config['backup_count'] = 0
        return create_response(True, config)
    except Exception as e:
        get_logger().error(f"Config retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/config', methods=['POST'])
def update_config():
    """Update backup configuration"""
    try:
        data = request.get_json()
        if not data:
            return create_response(False, error='No configuration data provided', status_code=400)
        
        success = config_manager.update_config(data)
        if success:
            return create_response(True, {'message': 'Configuration updated successfully'})
        else:
            return create_response(False, error='Failed to update configuration', status_code=500)
    except Exception as e:
        get_logger().error(f"Config update failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# History Routes
@bp.route('/history', methods=['GET'])
def get_backup_history():
    """Get backup history and logs"""
    try:
        history = backup_handler.get_backup_history()
        return create_response(True, history)
    except Exception as e:
        get_logger().error(f"History retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Schedule Routes
@bp.route('/schedule', methods=['GET'])
def get_schedule():
    """Get backup schedule configuration"""
    try:
        schedule = schedule_handler.get_schedule_status()
        return create_response(True, schedule)
    except Exception as e:
        get_logger().error(f"Schedule retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/schedule', methods=['POST'])
def update_schedule():
    """Update backup schedule"""
    try:
        data = request.get_json()
        if not data:
            return create_response(False, error='No schedule data provided', status_code=400)
        
        action = data.get('action')
        if not action:
            return create_response(False, error='No action specified', status_code=400)
        
        # Get schedule from data if provided
        schedule = data.get('schedule')
        
        result = schedule_handler.update_schedule(action, schedule)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Schedule update failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Provider Schema Routes
@bp.route('/providers/schema', methods=['GET'])
def get_provider_schema():
    """Get comprehensive provider configuration schema for all available providers"""
    try:
        schema = provider_handler.get_provider_schema()
        return create_response(True, schema)
    except Exception as e:
        get_logger().error(f"Provider schema retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Individual Provider Routes
@bp.route('/providers/<provider_name>/config', methods=['GET'])
def get_provider_config(provider_name):
    """Get current configuration for a specific provider"""
    try:
        config = provider_handler.get_provider_config(provider_name)
        return create_response(True, config)
    except Exception as e:
        get_logger().error(f"Provider config retrieval failed for {provider_name}: {e}")
        if "not found" in str(e).lower():
            return create_response(False, error=str(e), status_code=404)
        return create_response(False, error=str(e), status_code=500)

@bp.route('/providers/<provider_name>/config', methods=['POST'])
def update_provider_config(provider_name):
    """Update configuration for a specific provider"""
    try:
        data = request.get_json()
        if not data:
            return create_response(False, error='No configuration data provided', status_code=400)
        
        result = provider_handler.update_provider_config(provider_name, data)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Provider config update failed for {provider_name}: {e}")
        if "not found" in str(e).lower():
            return create_response(False, error=str(e), status_code=404)
        return create_response(False, error=str(e), status_code=500)

@bp.route('/providers/<provider_name>/test', methods=['POST'])
def test_provider_connection(provider_name):
    """Test connection to a specific provider"""
    try:
        result = provider_handler.test_provider_connection(provider_name)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Provider connection test failed for {provider_name}: {e}")
        if "not found" in str(e).lower():
            return create_response(False, error=str(e), status_code=404)
        return create_response(False, error=str(e), status_code=500)

# Additional Utility Routes
@bp.route('/providers/<provider_name>/info', methods=['GET'])
def get_provider_info(provider_name):
    """Get detailed information about a provider"""
    try:
        info = provider_handler.get_provider_info(provider_name)
        return create_response(True, info)
    except Exception as e:
        get_logger().error(f"Provider info retrieval failed for {provider_name}: {e}")
        if "not found" in str(e).lower():
            return create_response(False, error=str(e), status_code=404)
        return create_response(False, error=str(e), status_code=500)

@bp.route('/statistics', methods=['GET'])
def get_backup_statistics():
    """Get backup statistics and metrics"""
    try:
        # Get basic stats from backup handler
        stats = backup_handler.get_backup_statistics()
        
        # Add backup count from config
        config = config_manager.get_safe_config()
        stats['backup_count'] = config.get('backup_count', 0)
        
        # Add backup type from schedule configuration
        schedule_config = config.get('schedule', {})
        backup_type = schedule_config.get('backupType', 'incremental')
        stats['backup_type'] = backup_type
        
        # Add human-readable backup type description
        backup_type_descriptions = {
            'full': 'Complete system backup',
            'incremental': 'Only changed files since last backup',
            'differential': 'All changes since last full backup'
        }
        stats['backup_type_description'] = backup_type_descriptions.get(backup_type, 'Unknown backup type')
        
        return create_response(True, stats)
    except Exception as e:
        get_logger().error(f"Statistics retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/test/cycle', methods=['POST'])
def test_backup_cycle():
    """Test complete backup cycle"""
    try:
        data = request.get_json() or {}
        items = data.get('items')
        
        result = backup_handler.test_backup_cycle(items)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Backup cycle test failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/cleanup', methods=['POST'])
def cleanup_old_backups():
    """Clean up old backups based on retention policy"""
    try:
        data = request.get_json() or {}
        retention_days = data.get('retention_days')
        
        result = backup_handler.cleanup_old_backups(retention_days)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Backup cleanup failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/schedule/config', methods=['POST'])
def set_schedule_config():
    """Set backup schedule configuration"""
    try:
        data = request.get_json()
        if not data:
            return create_response(False, error='No schedule configuration provided', status_code=400)
        
        result = schedule_handler.set_schedule_config(data)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Schedule configuration update failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/schedule/history', methods=['GET'])
def get_schedule_history():
    """Get schedule execution history"""
    try:
        history = schedule_handler.get_schedule_history()
        return create_response(True, history)
    except Exception as e:
        get_logger().error(f"Schedule history retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/schedule/templates', methods=['GET'])
def get_schedule_templates():
    """Get available schedule templates and options"""
    try:
        templates = schedule_handler.get_available_schedules()
        return create_response(True, templates)
    except Exception as e:
        get_logger().error(f"Schedule templates retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/schedule/cron/available', methods=['GET'])
def get_available_cron_schedules():
    """Get available cron schedule presets"""
    try:
        from .src.service.backup_service import BackupService
        service = BackupService()
        result = service.get_available_schedules()
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Available cron schedules retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/schedule/test', methods=['POST'])
def test_schedule():
    """Test the backup schedule by running it manually"""
    try:
        result = schedule_handler.test_schedule()
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Schedule test failed: {e}")
        return create_response(False, error=str(e), status_code=500)

# Version and System Info Routes
@bp.route('/version', methods=['GET'])
def get_version():
    """Get backup tab version information"""
    try:
        # Read version from VERSION file
        version_file = os.path.join(os.path.dirname(__file__), '..', 'VERSION')
        version = "1.0.0"  # Default fallback
        
        if os.path.exists(version_file):
            with open(version_file, 'r') as f:
                version = f.read().strip()
        
        return create_response(True, {
            'version': version,
            'tab_name': 'backupTab',
            'description': 'HOMESERVER Professional Backup System',
            'last_updated': datetime.now().isoformat()
        })
    except Exception as e:
        get_logger().error(f"Version retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/auto-update/status', methods=['GET'])
def get_auto_update_status():
    """Get current auto-update status for the backup tab"""
    try:
        # Check if auto-update is enabled in config
        config = config_manager.get_safe_config()
        auto_update_enabled = config.get('auto_update_enabled', False)
        
        return create_response(True, {
            'enabled': auto_update_enabled,
            'tab_name': 'backupTab',
            'last_check': config.get('last_update_check'),
            'update_available': config.get('update_available', False)
        })
    except Exception as e:
        get_logger().error(f"Auto-update status retrieval failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/auto-update/toggle', methods=['POST'])
def toggle_auto_update():
    """Toggle auto-update setting for the backup tab"""
    try:
        data = request.get_json()
        if not data or 'enabled' not in data:
            return create_response(False, error='Missing enabled field', status_code=400)
        
        enabled = bool(data['enabled'])
        
        # Update config with auto-update setting
        config = config_manager.get_safe_config()
        config['auto_update_enabled'] = enabled
        config['last_update_check'] = datetime.now().isoformat()
        
        success = config_manager.update_config(config)
        if not success:
            return create_response(False, error='Failed to update auto-update setting', status_code=500)
        
        # If enabling auto-update, trigger a check for updates
        if enabled:
            try:
                # This would integrate with the main update system
                # For now, we'll just log that auto-update was enabled
                get_logger().info(f"Auto-update enabled for backupTab")
            except Exception as check_error:
                get_logger().warning(f"Failed to check for updates after enabling auto-update: {check_error}")
        
        return create_response(True, {
            'enabled': enabled,
            'tab_name': 'backupTab',
            'message': f'Auto-update {"enabled" if enabled else "disabled"} successfully'
        })
    except Exception as e:
        get_logger().error(f"Auto-update toggle failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/auto-update/check', methods=['POST'])
def check_for_updates():
    """Manually check for updates for the backup tab"""
    try:
        # This would integrate with the main update system
        # For now, we'll simulate a check
        config = config_manager.get_safe_config()
        config['last_update_check'] = datetime.now().isoformat()
        config['update_available'] = False  # This would be determined by the update system
        
        config_manager.update_config(config)
        
        return create_response(True, {
            'update_available': False,
            'tab_name': 'backupTab',
            'last_check': config['last_update_check'],
            'message': 'Update check completed'
        })
    except Exception as e:
        get_logger().error(f"Update check failed: {e}")
        return create_response(False, error=str(e), status_code=500)
