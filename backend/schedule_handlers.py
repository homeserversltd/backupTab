#!/usr/bin/env python3
"""
HOMESERVER Backup Tab Schedule Handlers
Handles backup schedule management and systemd timer operations
"""

import os
import subprocess
import yaml
from datetime import datetime
from typing import Dict, Any, Optional
from .utils import (
    BACKUP_CONFIG_PATH,
    get_logger,
    run_cli_command,
    get_systemd_service_status,
    validate_file_path
)
from .config_manager import BackupConfigManager

class ScheduleHandler:
    """Handles backup schedule management"""
    
    def __init__(self):
        self.logger = get_logger()
        self.config_manager = BackupConfigManager()
        self.timer_name = 'homeserver-backup.timer'
    
    def get_schedule_status(self) -> Dict[str, Any]:
        """Get backup schedule configuration and status"""
        try:
            schedule = {
                'timer_status': 'unknown',
                'next_run': None,
                'last_run': None,
                'schedule_config': {}
            }
            
            # Check timer status
            schedule['timer_status'] = get_systemd_service_status(self.timer_name)
            
            # Get next run time
            try:
                result = subprocess.run(['/bin/systemctl', 'list-timers', self.timer_name, '--no-pager'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if self.timer_name in line:
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
            
            return schedule
        
        except Exception as e:
            self.logger.error(f"Schedule retrieval failed: {e}")
            raise
    
    def update_schedule(self, action: str) -> Dict[str, Any]:
        """Update backup schedule"""
        try:
            valid_actions = ['start', 'stop', 'enable', 'disable']
            if action not in valid_actions:
                raise ValueError(f'Unknown action: {action}. Valid actions: {valid_actions}')
            
            # Execute systemd command
            result = subprocess.run(['/bin/systemctl', action, self.timer_name], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                raise RuntimeError(f'Schedule {action} failed: {result.stderr}')
            
            # Get updated status
            updated_status = self.get_schedule_status()
            
            return {
                'message': f'Schedule {action} successful',
                'action': action,
                'timer_status': updated_status['timer_status'],
                'next_run': updated_status['next_run'],
                'last_run': updated_status['last_run']
            }
        
        except Exception as e:
            self.logger.error(f"Schedule update failed: {e}")
            raise
    
    def set_schedule_config(self, schedule_config: Dict[str, Any]) -> Dict[str, Any]:
        """Set backup schedule configuration"""
        try:
            # Validate schedule configuration
            if not self._validate_schedule_config(schedule_config):
                raise ValueError("Invalid schedule configuration")
            
            # Update configuration file
            config = self.config_manager.get_config()
            config['schedule'] = schedule_config
            
            success = self.config_manager.update_config(config)
            if not success:
                raise RuntimeError("Failed to update schedule configuration")
            
            # Reload systemd if timer is enabled
            timer_status = get_systemd_service_status(self.timer_name)
            if timer_status == 'active':
                try:
                    subprocess.run(['/bin/systemctl', 'daemon-reload'], 
                                  capture_output=True, text=True, timeout=10)
                    subprocess.run(['/bin/systemctl', 'restart', self.timer_name], 
                                  capture_output=True, text=True, timeout=10)
                except Exception as e:
                    self.logger.warning(f"Failed to reload systemd configuration: {e}")
            
            return {
                'message': 'Schedule configuration updated successfully',
                'schedule_config': schedule_config,
                'updated_at': datetime.now().isoformat()
            }
        
        except Exception as e:
            self.logger.error(f"Schedule configuration update failed: {e}")
            raise
    
    def get_schedule_history(self) -> Dict[str, Any]:
        """Get schedule execution history"""
        try:
            history = {
                'recent_executions': [],
                'failed_executions': [],
                'success_rate': 0.0
            }
            
            # Get journalctl output for the timer
            try:
                result = subprocess.run([
                    'journalctl', 
                    '-u', self.timer_name,
                    '--since', '30 days ago',
                    '--no-pager',
                    '-o', 'json'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    executions = []
                    
                    for line in lines:
                        try:
                            entry = eval(line)  # JSON-like output from journalctl
                            if 'MESSAGE' in entry:
                                executions.append({
                                    'timestamp': entry.get('__REALTIME_TIMESTAMP', ''),
                                    'message': entry.get('MESSAGE', ''),
                                    'priority': entry.get('PRIORITY', 0)
                                })
                        except Exception:
                            continue
                    
                    history['recent_executions'] = executions[-20:]  # Last 20 executions
                    
                    # Calculate success rate
                    total_executions = len(executions)
                    successful_executions = len([e for e in executions if 'successfully' in e.get('message', '').lower()])
                    
                    if total_executions > 0:
                        history['success_rate'] = (successful_executions / total_executions) * 100
            
            except Exception as e:
                self.logger.warning(f"Failed to get schedule history: {e}")
            
            return history
        
        except Exception as e:
            self.logger.error(f"Schedule history retrieval failed: {e}")
            raise
    
    def test_schedule(self) -> Dict[str, Any]:
        """Test the backup schedule by running it manually"""
        try:
            # Trigger the timer manually
            result = subprocess.run(['/bin/systemctl', 'start', self.timer_name], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                raise RuntimeError(f'Failed to trigger schedule test: {result.stderr}')
            
            # Wait a moment and check status
            import time
            time.sleep(2)
            
            current_status = self.get_schedule_status()
            
            return {
                'message': 'Schedule test triggered successfully',
                'timer_status': current_status['timer_status'],
                'tested_at': datetime.now().isoformat()
            }
        
        except Exception as e:
            self.logger.error(f"Schedule test failed: {e}")
            raise
    
    def _validate_schedule_config(self, schedule_config: Dict[str, Any]) -> bool:
        """Validate schedule configuration"""
        try:
            # Basic validation
            required_fields = ['frequency', 'time']
            for field in required_fields:
                if field not in schedule_config:
                    return False
            
            # Validate frequency
            valid_frequencies = ['daily', 'weekly', 'monthly', 'custom']
            if schedule_config['frequency'] not in valid_frequencies:
                return False
            
            # Validate time format (HH:MM)
            time_str = schedule_config['time']
            try:
                hour, minute = map(int, time_str.split(':'))
                if not (0 <= hour <= 23 and 0 <= minute <= 59):
                    return False
            except ValueError:
                return False
            
            # Validate custom cron expression if frequency is custom
            if schedule_config['frequency'] == 'custom':
                if 'cron_expression' not in schedule_config:
                    return False
                # Basic cron validation (5 fields)
                cron_parts = schedule_config['cron_expression'].split()
                if len(cron_parts) != 5:
                    return False
            
            return True
        
        except Exception:
            return False
    
    def get_available_schedules(self) -> Dict[str, Any]:
        """Get available schedule templates and options"""
        try:
            return {
                'frequencies': [
                    {'value': 'daily', 'label': 'Daily', 'description': 'Run backup every day'},
                    {'value': 'weekly', 'label': 'Weekly', 'description': 'Run backup once per week'},
                    {'value': 'monthly', 'label': 'Monthly', 'description': 'Run backup once per month'},
                    {'value': 'custom', 'label': 'Custom Cron', 'description': 'Use custom cron expression'}
                ],
                'time_slots': [
                    {'value': '00:00', 'label': 'Midnight'},
                    {'value': '01:00', 'label': '1:00 AM'},
                    {'value': '02:00', 'label': '2:00 AM'},
                    {'value': '03:00', 'label': '3:00 AM'},
                    {'value': '04:00', 'label': '4:00 AM'},
                    {'value': '05:00', 'label': '5:00 AM'},
                    {'value': '06:00', 'label': '6:00 AM'}
                ],
                'weekdays': [
                    {'value': '0', 'label': 'Sunday'},
                    {'value': '1', 'label': 'Monday'},
                    {'value': '2', 'label': 'Tuesday'},
                    {'value': '3', 'label': 'Wednesday'},
                    {'value': '4', 'label': 'Thursday'},
                    {'value': '5', 'label': 'Friday'},
                    {'value': '6', 'label': 'Saturday'}
                ],
                'cron_examples': {
                    'daily_at_2am': '0 2 * * *',
                    'weekly_monday_3am': '0 3 * * 1',
                    'monthly_first_4am': '0 4 1 * *',
                    'every_6_hours': '0 */6 * * *'
                }
            }
        
        except Exception as e:
            self.logger.error(f"Failed to get available schedules: {e}")
            raise
