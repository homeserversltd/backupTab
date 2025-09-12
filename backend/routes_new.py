#!/usr/bin/env python3
"""
HOMESERVER Backup Tab Backend Routes
Professional backup system API endpoints - Refactored version
"""

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
        
        result = schedule_handler.update_schedule(action)
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
        stats = backup_handler.get_backup_statistics()
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

@bp.route('/schedule/test', methods=['POST'])
def test_schedule():
    """Test the backup schedule by running it manually"""
    try:
        result = schedule_handler.test_schedule()
        return create_response(True, result)
    except Exception as e:
        get_logger().error(f"Schedule test failed: {e}")
        return create_response(False, error=str(e), status_code=500)
