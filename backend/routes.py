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
from .src.backup_manager import BackupManager

# Create blueprint
bp = Blueprint('backup', __name__, url_prefix='/api/backup')

# Initialize handlers
config_manager = BackupConfigManager()
provider_handler = ProviderHandler()
backup_handler = BackupHandler()
schedule_handler = ScheduleHandler()
# Use system config path to match BackupConfigManager behavior
backup_manager = BackupManager("/etc/backupTab/settings.json")

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
        'google_cloud_storage': 'Google Cloud Storage buckets (Coming Soon)',
        'aws_s3': 'Amazon S3 cloud storage (Coming Soon)'
    }
    return descriptions.get(provider_name, f'{provider_name.replace("_", " ").title()} storage')

def _get_provider_icon(provider_name: str) -> str:
    """Get emoji icon for provider"""
    icons = {
        'local': '💾',
        'backblaze': '☁️',
        'google_cloud_storage': '🗄️',
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
    
    # AWS S3 and Google Cloud Storage are temporarily disabled
    if provider_name in ['aws_s3', 'google_cloud_storage']:
        return False
    
    # Other providers are not yet implemented
    return False

def _is_provider_configured(provider_name: str, provider_config: dict) -> bool:
    """Check if provider has required credentials configured"""
    # Only allow the providers we want
    allowed_providers = ['local', 'backblaze', 'aws_s3', 'google_cloud_storage']
    if provider_name not in allowed_providers:
        return False
    
    if provider_name == 'local':
        # Local provider is always configured - it doesn't need credentials
        return True
    
    elif provider_name == 'backblaze':
        # Check if keyman integration is enabled
        if provider_config.get('keyman_integrated', False):
            keyman_service_name = provider_config.get('keyman_service_name', provider_name)
            try:
                return backup_manager.keyman.service_configured(keyman_service_name)
            except (FileNotFoundError, PermissionError) as e:
                # Key files don't exist or permission denied - treat as not configured
                get_logger().info(f"Keyman keys not accessible for {provider_name} (normal for new setup): {e}")
                return False
            except Exception as e:
                get_logger().warning(f"Keyman check failed for {provider_name}: {e}")
                return False
        else:
            # Fallback to traditional config-based credentials
            return bool(
                provider_config.get('application_key_id', '').strip() and
                provider_config.get('application_key', '').strip()
            )
    
    elif provider_name == 'google_cloud_storage':
        # Google Cloud Storage needs credentials_file and project_id
        return bool(
            provider_config.get('credentials_file', '').strip() and
            provider_config.get('project_id', '').strip()
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
        # Get the full config for additional metadata
        config = config_manager.get_safe_config()
        all_providers = config.get('providers', {})
        
        # Create simple status list for frontend iteration
        provider_status = []
        for provider_name, provider_config in all_providers.items():
            # Always show providers regardless of key file status
            is_available = _is_provider_available(provider_name)
            is_configured = _is_provider_configured(provider_name, provider_config)
            
            # Check keyman integration status - handle errors gracefully
            keyman_integrated = provider_config.get('keyman_integrated', False)
            keyman_configured = False
            if keyman_integrated:
                try:
                    keyman_service_name = provider_config.get('keyman_service_name', provider_name)
                    keyman_configured = backup_manager.keyman.service_configured(keyman_service_name)
                except (FileNotFoundError, PermissionError) as e:
                    # Key files don't exist yet - this is normal for new setups
                    get_logger().info(f"Keyman keys not found for {provider_name} (normal for new setup): {e}")
                    keyman_configured = False
                except Exception as e:
                    get_logger().warning(f"Keyman check failed for {provider_name}: {e}")
                    keyman_configured = False
            
            provider_status.append({
                'name': provider_name,
                'enabled': provider_config.get('enabled', False),
                'available': is_available,
                'configured': is_configured,
                'display_name': provider_name.replace('_', ' ').title(),
                'description': _get_provider_description(provider_name),
                'icon': _get_provider_icon(provider_name),
                'keyman_integration': {
                    'integrated': keyman_integrated,
                    'configured': keyman_configured,
                    'service_name': provider_config.get('keyman_service_name', provider_name) if keyman_integrated else None
                }
            })
        
        return create_response(True, {'providers': provider_status})
    except Exception as e:
        get_logger().error(f"Provider status retrieval failed: {e}")
        # Even if there's an error, return a basic provider list so UI doesn't break
        try:
            config = config_manager.get_safe_config()
            all_providers = config.get('providers', {})
            fallback_providers = []
            for provider_name, provider_config in all_providers.items():
                fallback_providers.append({
                    'name': provider_name,
                    'enabled': provider_config.get('enabled', False),
                    'available': _is_provider_available(provider_name),  # Use proper availability check
                    'configured': False,  # Mark as not configured if we can't check
                    'display_name': provider_name.replace('_', ' ').title(),
                    'description': _get_provider_description(provider_name),
                    'icon': _get_provider_icon(provider_name),
                    'keyman_integration': {
                        'integrated': provider_config.get('keyman_integrated', False),
                        'configured': False,
                        'service_name': provider_config.get('keyman_service_name', provider_name) if provider_config.get('keyman_integrated', False) else None
                    }
                })
            return create_response(True, {'providers': fallback_providers})
        except Exception as fallback_error:
            get_logger().error(f"Fallback provider status also failed: {fallback_error}")
            return create_response(False, error=str(e), status_code=500)

# Backup Operations Routes
@bp.route('/backup/run', methods=['POST'])
def run_backup():
    """Run backup for specified repositories"""
    try:
        data = request.get_json() or {}
        backup_type = data.get('type', 'daily')
        repositories = data.get('repositories', [])
        
        # Use BackupManager for backup operations
        result = backup_manager.create_backup(backup_type, repositories)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Backup execution failed: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/backup/sync-now', methods=['POST'])
def sync_now():
    """Run backup script directly (Sync Now button)"""
    logger = get_logger()
    logger.info("=== SYNC NOW REQUEST STARTED ===")
    
    try:
        # Path to the backup script
        backup_script = '/var/www/homeserver/premium/backupTab/backend/backup'
        logger.info(f"Backup script path: {backup_script}")
        
        # Check if script exists
        if not os.path.exists(backup_script):
            logger.error(f"Backup script not found at: {backup_script}")
            return create_response(False, error='Backup script not found', status_code=404)
        
        logger.info("Backup script exists, checking permissions...")
        
        # Make script executable
        os.chmod(backup_script, 0o755)
        logger.info("Made backup script executable")
        
        # Check current working directory
        cwd = '/var/www/homeserver/premium/backupTab/backend'
        logger.info(f"Working directory: {cwd}")
        logger.info(f"Directory exists: {os.path.exists(cwd)}")
        
        # List files in working directory
        try:
            files = os.listdir(cwd)
            logger.info(f"Files in working directory: {files}")
        except Exception as e:
            logger.warning(f"Could not list directory contents: {e}")
        
        # Check if settings.json exists
        settings_path = os.path.join(cwd, 'src/config/settings.json')
        logger.info(f"Settings file path: {settings_path}")
        logger.info(f"Settings file exists: {os.path.exists(settings_path)}")
        
        logger.info("Starting backup script execution...")
        
        # Run the backup script
        result = subprocess.run(
            [backup_script, 'create'],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            cwd=cwd
        )
        
        logger.info(f"Backup script completed with return code: {result.returncode}")
        logger.info(f"STDOUT: {result.stdout}")
        logger.info(f"STDERR: {result.stderr}")
        
        if result.returncode == 0:
            logger.info("Backup completed successfully")
            return create_response(True, {
                'message': 'Backup completed successfully',
                'output': result.stdout,
                'timestamp': create_backup_timestamp()
            })
        else:
            error_msg = f'Backup failed with return code {result.returncode}. STDOUT: {result.stdout}. STDERR: {result.stderr}'
            logger.error(error_msg)
            return create_response(False, error=error_msg, status_code=500)
            
    except subprocess.TimeoutExpired as e:
        logger.error(f"Backup script timed out after 300 seconds: {e}")
        return create_response(False, error='Backup timed out', status_code=408)
    except Exception as e:
        logger.error(f"Sync now failed with exception: {e}", exc_info=True)
        return create_response(False, error=f'Sync now failed: {str(e)}', status_code=500)
    finally:
        logger.info("=== SYNC NOW REQUEST COMPLETED ===")

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

@bp.route('/backup/list/<provider_name>', methods=['GET'])
def list_backups(provider_name):
    """List backups from a specific provider using BackupManager"""
    try:
        result = backup_manager.list_backups(provider_name)
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Backup listing failed for {provider_name}: {e}")
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
        
        # Use BackupManager for provider config updates
        success = backup_manager.update_provider_config(provider_name, data)
        if success:
            return create_response(True, {'message': f'Configuration updated for {provider_name}'})
        else:
            return create_response(False, error=f'Failed to update configuration for {provider_name}', status_code=500)
    except Exception as e:
        get_logger().error(f"Provider config update failed for {provider_name}: {e}")
        if "not found" in str(e).lower():
            return create_response(False, error=str(e), status_code=404)
        return create_response(False, error=str(e), status_code=500)

@bp.route('/providers/<provider_name>/test', methods=['POST'])
def test_provider_connection(provider_name):
    """Test connection to a specific provider"""
    try:
        # Use BackupManager for testing connections
        result = backup_manager.test_provider_connection(provider_name)
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

# Keyman Integration Routes
@bp.route('/keyman/services', methods=['GET'])
def get_keyman_services():
    """Get list of all configured keyman services"""
    try:
        services = backup_manager.get_keyman_services()
        return create_response(True, {'services': services})
    except Exception as e:
        get_logger().error(f"Error getting keyman services: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/keyman/credentials/<service_name>', methods=['GET'])
def get_keyman_credentials(service_name):
    """Get credentials for a specific keyman service"""
    try:
        credentials = backup_manager.keyman.get_service_credentials(service_name)
        if credentials:
            return create_response(True, {'credentials': credentials})
        else:
            return create_response(False, error='Service not configured or credentials not available', status_code=404)
    except Exception as e:
        get_logger().error(f"Error getting credentials for {service_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/keyman/credentials/<service_name>', methods=['POST'])
def create_keyman_credentials(service_name):
    """Create credentials for a keyman service"""
    try:
        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            return create_response(False, error='Username and password are required', status_code=400)
        
        success = backup_manager.keyman.create_service_credentials(
            service_name,
            data['username'],
            data['password']
        )
        
        if success:
            return create_response(True, {'message': f'Credentials created for {service_name}'})
        else:
            return create_response(False, error=f'Failed to create credentials for {service_name}', status_code=500)
            
    except Exception as e:
        get_logger().error(f"Error creating credentials for {service_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/keyman/credentials/<service_name>', methods=['PUT'])
def update_keyman_credentials(service_name):
    """Update credentials for a keyman service"""
    try:
        data = request.get_json()
        if not data or 'password' not in data:
            return create_response(False, error='Password is required', status_code=400)
        
        success = backup_manager.keyman.update_service_credentials(
            service_name,
            data['password'],
            data.get('username'),
            data.get('old_password')
        )
        
        if success:
            return create_response(True, {'message': f'Credentials updated for {service_name}'})
        else:
            return create_response(False, error=f'Failed to update credentials for {service_name}', status_code=500)
            
    except Exception as e:
        get_logger().error(f"Error updating credentials for {service_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/keyman/credentials/<service_name>', methods=['DELETE'])
def delete_keyman_credentials(service_name):
    """Delete credentials for a keyman service"""
    try:
        success = backup_manager.keyman.delete_service_credentials(service_name)
        
        if success:
            return create_response(True, {'message': f'Credentials deleted for {service_name}'})
        else:
            return create_response(False, error=f'Failed to delete credentials for {service_name}', status_code=500)
            
    except Exception as e:
        get_logger().error(f"Error deleting credentials for {service_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/keyman/check/<service_name>', methods=['GET'])
def check_keyman_service_configured(service_name):
    """Check if a keyman service is configured"""
    try:
        configured = backup_manager.keyman.service_configured(service_name)
        return create_response(True, {'configured': configured})
    except Exception as e:
        get_logger().error(f"Error checking keyman service {service_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/keyman/providers', methods=['GET'])
def get_keyman_providers():
    """Get list of providers that are keyman-configured"""
    try:
        providers = []
        config = config_manager.get_safe_config()
        configured_providers = config.get('providers', {})
        
        for provider_name, provider_config in configured_providers.items():
            if provider_config.get('keyman_integrated', False):
                try:
                    keyman_service_name = provider_config.get('keyman_service_name', provider_name)
                    is_configured = backup_manager.keyman.service_configured(keyman_service_name)
                except Exception as e:
                    get_logger().warning(f"Keyman check failed for {provider_name}: {e}")
                    is_configured = False
                
                providers.append({
                    'name': provider_name,
                    'keyman_service_name': keyman_service_name,
                    'configured': is_configured,
                    'enabled': provider_config.get('enabled', False)
                })
        
        return create_response(True, {'providers': providers})
    except Exception as e:
        get_logger().error(f"Error getting keyman providers: {e}")
        return create_response(False, error=str(e), status_code=500)

# Provider Management Routes using BackupManager
@bp.route('/providers/<provider_name>/enable', methods=['POST'])
def enable_provider(provider_name):
    """Enable a provider using BackupManager"""
    try:
        success = backup_manager.enable_provider(provider_name)
        if success:
            return create_response(True, {'message': f'Provider {provider_name} enabled successfully'})
        else:
            return create_response(False, error=f'Failed to enable provider {provider_name}', status_code=500)
    except Exception as e:
        get_logger().error(f"Error enabling provider {provider_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/providers/<provider_name>/disable', methods=['POST'])
def disable_provider(provider_name):
    """Disable a provider using BackupManager"""
    try:
        success = backup_manager.disable_provider(provider_name)
        if success:
            return create_response(True, {'message': f'Provider {provider_name} disabled successfully'})
        else:
            return create_response(False, error=f'Failed to disable provider {provider_name}', status_code=500)
    except Exception as e:
        get_logger().error(f"Error disabling provider {provider_name}: {e}")
        return create_response(False, error=str(e), status_code=500)

# Debug Routes
@bp.route('/debug/status', methods=['GET'])
def get_debug_status():
    """Get debug mode status from /tmp file"""
    try:
        debug_file = '/tmp/backupTab_debug.txt'
        debug_enabled = os.path.exists(debug_file)
        
        message = ""
        if debug_enabled:
            try:
                with open(debug_file, 'r') as f:
                    message = f.read().strip()
            except Exception as e:
                message = f"Debug enabled (file read error: {str(e)})"
        else:
            message = "Debug mode is OFF"
        
        return create_response(True, {
            'enabled': debug_enabled,
            'message': message
        })
    except Exception as e:
        get_logger().error(f"Error getting debug status: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/debug/toggle', methods=['POST'])
def toggle_debug():
    """Toggle debug mode by creating/removing /tmp file"""
    try:
        debug_file = '/tmp/backupTab_debug.txt'
        data = request.get_json()
        if not data or 'enabled' not in data:
            return create_response(False, error='Missing enabled field', status_code=400)
        
        enabled = bool(data['enabled'])
        
        if enabled:
            # Create debug file with timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            debug_content = f"BackupTab Debug Mode Enabled\nTimestamp: {timestamp}\nStatus: ACTIVE"
            
            with open(debug_file, 'w') as f:
                f.write(debug_content)
            
            message = f"Debug mode ENABLED at {timestamp}"
            get_logger().info(f"DEBUG MODE ENABLED - {message}")
        else:
            # Remove debug file
            if os.path.exists(debug_file):
                os.remove(debug_file)
            
            message = "Debug mode DISABLED"
            get_logger().info(f"DEBUG MODE DISABLED - {message}")
        
        return create_response(True, {
            'enabled': enabled,
            'message': message
        })
    except Exception as e:
        get_logger().error(f"Error toggling debug mode: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/key', methods=['POST'])
def set_backup_key():
    """Set backup encryption key using keyman integration"""
    try:
        data = request.get_json()
        if not data or 'password' not in data:
            return create_response(False, error='Password is required', status_code=400)
        
        password = data['password']
        if len(password) < 8:
            return create_response(False, error='Password must be at least 8 characters long', status_code=400)
        
        # Create backup key using keyman integration (same as backupTab2)
        success = backup_manager.keyman.create_service_credentials(
            'backup',
            'backup',
            password
        )
        
        if success:
            return create_response(True, {'message': 'Backup encryption key set successfully'})
        else:
            return create_response(False, error='Failed to set backup encryption key', status_code=500)
            
    except Exception as e:
        get_logger().error(f"Error setting backup key: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/header-stats', methods=['GET'])
def get_header_stats():
    """Get comprehensive header statistics for backup tab"""
    try:
        get_logger().info("Header stats endpoint called")
        
        # Import datetime for calculations
        from datetime import datetime, timedelta
        
        # Load config to get provider and item counts
        config = config_manager.get_safe_config()
        
        # Get backup status from status manager
        status = backup_handler.get_system_status()
        
        # Count enabled providers
        enabled_providers = 0
        if config.get('providers'):
            enabled_providers = sum(1 for provider in config['providers'].values() 
                                  if provider.get('enabled', False))
        
        # Count backup items
        backup_items_count = len(config.get('backup_items', []))
        
        # Get last backup time
        last_backup = status.get('last_backup')
        last_backup_display = last_backup or "Never"
        
        # Get next backup time from schedule handler (uses actual cron schedule)
        next_backup_display = "Not scheduled"
        try:
            schedule_status = schedule_handler.get_schedule_status()
            if schedule_status and schedule_status.get('next_run'):
                next_run = schedule_status['next_run']
                if next_run and next_run != 'Not scheduled':
                    # Format the ISO timestamp to American date format
                    try:
                        next_run_dt = datetime.fromisoformat(next_run.replace('Z', '+00:00'))
                        next_backup_display = next_run_dt.strftime('%B %d, %Y %H:%M')
                    except Exception as e:
                        get_logger().warning(f"Error formatting next run time: {e}")
                        next_backup_display = next_run
        except Exception as e:
            get_logger().warning(f"Error getting schedule status: {e}")
            next_backup_display = "Not scheduled"
        
        # Get backup size information
        backup_size_bytes = None
        if last_backup:
            # Try to get backup size from state or config
            try:
                # This would need to be implemented based on your backup system
                # For now, we'll set it to None
                backup_size_bytes = None
            except Exception as e:
                get_logger().warning(f"Error getting backup size: {e}")
        
        backup_size_display = "Unknown"
        if backup_size_bytes and isinstance(backup_size_bytes, (int, float)) and backup_size_bytes > 0:
            # Format size in human readable format
            units = ['B', 'KB', 'MB', 'GB', 'TB']
            unit_index = 0
            size_value = float(backup_size_bytes)
            
            while size_value >= 1024 and unit_index < len(units) - 1:
                size_value /= 1024
                unit_index += 1
            
            backup_size_display = f"{size_value:.1f} {units[unit_index]}"
        
        # Check if backup system is properly installed
        def check_backup_installation():
            """Check if backup system is properly installed"""
            # Check for system config file
            config_exists = os.path.exists("/etc/backupTab/settings.json")
            
            # Check for backup CLI script
            cli_exists = os.path.exists("/var/www/homeserver/premium/backup/backup")
            
            # Check for virtual environment
            venv_exists = os.path.exists("/var/www/homeserver/premium/backup/venv")
            
            # Check for cron job
            cron_exists = os.path.exists("/etc/cron.d/homeserver-backup")
            
            # System is considered installed if config exists AND CLI exists
            is_installed = config_exists and cli_exists
            
            return {
                "is_installed": is_installed,
                "config_exists": config_exists,
                "cli_exists": cli_exists,
                "venv_exists": venv_exists,
                "cron_exists": cron_exists
            }
        
        installation_check = check_backup_installation()
        is_configured = installation_check["is_installed"]
        
        # Create proper installation status for UI
        installation_status = {
            "installed": is_configured,
            "installation_timestamp": None,  # Could be enhanced to read from actual installation log
            "installation_method": "cli" if is_configured else None,
            "version": "1.0.0",  # Could be enhanced to read from actual version
            "installation_path": "/var/www/homeserver/premium/backup" if is_configured else None,
            "missing_components": [] if is_configured else ["config", "cli", "venv", "cron"],
            "can_install": not is_configured,
            "can_uninstall": is_configured
        }
        
        # Prepare comprehensive header stats with safe defaults
        header_stats = {
            "last_backup": last_backup_display,
            "last_backup_timestamp": last_backup,
            "next_backup": next_backup_display,
            "backup_items_count": backup_items_count,
            "last_backup_size": backup_size_display,
            "last_backup_size_bytes": backup_size_bytes if isinstance(backup_size_bytes, (int, float)) else None,
            "backup_in_progress": False,  # Would need to be implemented
            "key_exists": status.get('config_exists', False),
            "is_configured": is_configured,
            "installation_status": installation_status
        }
        
        get_logger().info(f"Header stats prepared: {header_stats}")
        
        return create_response(True, header_stats)
        
    except Exception as e:
        get_logger().error(f"Error getting header stats: {e}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/install', methods=['POST'])
def install_backup_system():
    """Install backup system using CLI installer"""
    try:
        get_logger().info("Backup system installation requested")
        
        # Import the CLI installer
        get_logger().info("Attempting to import BackupEnvironmentSetup")
        from .src.installer.setupEnvironment import BackupEnvironmentSetup
        get_logger().info("BackupEnvironmentSetup imported successfully")
        
        get_logger().info("Creating BackupEnvironmentSetup instance")
        setup = BackupEnvironmentSetup()
        get_logger().info("BackupEnvironmentSetup instance created successfully")
        
        get_logger().info("Starting installation process")
        success = setup.install()
        get_logger().info(f"Installation process completed with result: {success}")
        
        if success:
            return create_response(True, {
                'message': 'Backup system installed successfully',
                'installed': True
            })
        else:
            return create_response(False, error='Installation failed', status_code=500)
            
    except Exception as e:
        get_logger().error(f"Installation failed with exception: {e}")
        import traceback
        get_logger().error(f"Installation traceback: {traceback.format_exc()}")
        return create_response(False, error=str(e), status_code=500)

@bp.route('/uninstall', methods=['POST'])
def uninstall_backup_system():
    """Uninstall backup system using CLI uninstaller"""
    try:
        get_logger().info("Backup system uninstallation requested")
        
        # Import the CLI installer
        from .src.installer.setupEnvironment import BackupEnvironmentSetup
        
        get_logger().info("BackupEnvironmentSetup imported successfully")
        setup = BackupEnvironmentSetup()
        get_logger().info("BackupEnvironmentSetup instance created")
        
        success = setup.uninstall()
        get_logger().info(f"Uninstall method completed with result: {success}")
        
        if success:
            get_logger().info("Uninstall successful, returning success response")
            return create_response(True, {
                'message': 'Backup system uninstalled successfully',
                'installed': False
            })
        else:
            get_logger().error("Uninstall failed, returning error response")
            return create_response(False, error='Uninstallation failed', status_code=500)
            
    except Exception as e:
        get_logger().error(f"Uninstallation failed with exception: {e}")
        import traceback
        get_logger().error(f"Traceback: {traceback.format_exc()}")
        return create_response(False, error=str(e), status_code=500)

