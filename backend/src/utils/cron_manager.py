#!/usr/bin/env python3
"""
HOMESERVER Backup Cron Manager Utility
Copyright (C) 2024 HOMESERVER LLC

Utility for managing backup cron schedules.
"""

import os
from pathlib import Path
from typing import Optional
from .logger import get_logger


class CronManager:
    """Manages backup cron schedule operations."""
    
    def __init__(self, cron_file: str = "/etc/cron.d/homeserver-backup"):
        self.cron_file = Path(cron_file)
        self.logger = get_logger()
    
    def set_schedule(self, schedule: str) -> bool:
        """Set the backup cron schedule."""
        try:
            # Validate cron format (basic validation)
            parts = schedule.split()
            if len(parts) != 5:
                self.logger.error("Invalid cron format. Use: minute hour day month weekday")
                self.logger.error("Example: '0 2 * * *' for daily at 2 AM")
                return False
            
            # Create cron job content
            cron_content = f"""# HOMESERVER Backup Cron Job
# Schedule: {schedule}
{schedule} www-data sleep $((RANDOM % 3600)) && /usr/bin/python3 /var/www/homeserver/backup/src/service/backup_service.py --backup >> /var/log/homeserver/backup.log 2>&1
"""
            
            # Write to cron file
            with open(self.cron_file, 'w') as f:
                f.write(cron_content)
            
            self.logger.info(f"Backup schedule set to: {schedule}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to set backup schedule: {e}")
            return False
    
    def get_schedule(self) -> Optional[str]:
        """Get the current backup cron schedule."""
        try:
            if not self.cron_file.exists():
                self.logger.info("No backup schedule found")
                return None
            
            with open(self.cron_file, 'r') as f:
                lines = f.readlines()
            
            # Find the cron line (skip comments)
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split()
                    if len(parts) >= 6:  # cron + command
                        schedule = ' '.join(parts[:5])
                        self.logger.info(f"Current backup schedule: {schedule}")
                        return schedule
            
            self.logger.info("No valid cron schedule found")
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to get backup schedule: {e}")
            return None
    
    def disable_schedule(self) -> bool:
        """Disable the backup cron schedule."""
        try:
            if self.cron_file.exists():
                self.cron_file.unlink()
                self.logger.info("Backup schedule disabled")
                return True
            else:
                self.logger.info("No backup schedule found to disable")
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to disable backup schedule: {e}")
            return False
    
    def enable_schedule(self, schedule: str = "0 2 * * *") -> bool:
        """Enable the backup cron schedule with default daily at 2 AM."""
        return self.set_schedule(schedule)
    
    def is_schedule_enabled(self) -> bool:
        """Check if backup schedule is currently enabled."""
        return self.cron_file.exists() and self.get_schedule() is not None
