#!/usr/bin/env python3
"""
HOMESERVER Backup Service
Copyright (C) 2024 HOMESERVER LLC

Service integration for the backup system.
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Add src to path for imports (for CLI import)
sys.path.append(str(Path(__file__).parent.parent))

from ..providers import get_provider, PROVIDERS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/homeserver/backup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('homeserver_backup')

class BackupService:
    """HOMESERVER Backup Service."""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or "/var/www/homeserver/backup/backup_config.json"
        self.config = self._load_config()
        self.providers = {}
        self._initialize_providers()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load backup configuration."""
        default_config = {
            "backup_items": [
                "/var/www/homeserver/src",
                "/var/lib/gogs",
                "/etc/homeserver"
            ],
            "providers": {
                "local": {
                    "enabled": True,
                    "path": "/var/www/homeserver/backup"
                },
                "aws_s3": {
                    "enabled": False,
                    "bucket": "homeserver-backups",
                    "region": "us-east-1",
                    "access_key": "",
                    "secret_key": ""
                },
                "google_drive": {
                    "enabled": False,
                    "credentials_file": "",
                    "token_file": "token.json",
                    "folder_id": ""
                },
                "dropbox": {
                    "enabled": False,
                    "access_token": "",
                    "folder_path": "/HOMESERVER Backups"
                },
                "backblaze": {
                    "enabled": False,
                    "application_key_id": "",
                    "application_key": "",
                    "bucket": "homeserver-backups"
                }
            },
            "encryption": {
                "enabled": True,
                "fak_path": "/root/key/skeleton.key"
            },
            "compression": {
                "enabled": True,
                "level": 6
            },
            "retention": {
                "days": 30,
                "max_backups": 10
            }
        }
        
        if Path(self.config_file).exists():
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                # Merge with defaults
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
            except Exception as e:
                logger.warning(f"Failed to load config, using defaults: {e}")
        
        # Create default config file
        config_dir = Path(self.config_file).parent
        config_dir.mkdir(parents=True, exist_ok=True)
        
        with open(self.config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        logger.info(f"Created default config file: {self.config_file}")
        return default_config
    
    def _initialize_providers(self):
        """Initialize enabled providers."""
        for provider_name, provider_config in self.config["providers"].items():
            if provider_config.get("enabled", False):
                try:
                    provider = get_provider(provider_name, provider_config)
                    self.providers[provider_name] = provider
                    logger.info(f"Initialized provider: {provider_name}")
                except Exception as e:
                    logger.error(f"Failed to initialize provider {provider_name}: {e}")
    
    def test_connection(self) -> bool:
        """Test connection to all enabled providers."""
        logger.info("Testing provider connections...")
        
        all_success = True
        for provider_name, provider in self.providers.items():
            try:
                success = provider.test_connection()
                if success:
                    logger.info(f"✓ {provider_name} connection successful")
                else:
                    logger.error(f"✗ {provider_name} connection failed")
                    all_success = False
            except Exception as e:
                logger.error(f"✗ {provider_name} connection error: {e}")
                all_success = False
        
        return all_success
    
    def create_backup(self) -> bool:
        """Create a new backup."""
        logger.info("Starting backup creation...")
        
        try:
            # Import the CLI class
            from ...backup import EnhancedBackupCLI
            
            # Create CLI instance with service config
            cli = EnhancedBackupCLI(self.config_file)
            
            # Create backup
            backup_path = cli.create_backup()
            
            if backup_path:
                logger.info(f"Backup created successfully: {backup_path}")
                return True
            else:
                logger.error("Failed to create backup")
                return False
                
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return False
    
    def list_backups(self) -> list:
        """List available backups."""
        try:
            from ...backup import EnhancedBackupCLI
            cli = EnhancedBackupCLI(self.config_file)
            return cli.list_backups()
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []
    
    def cleanup_old_backups(self) -> bool:
        """Clean up old backups based on retention policy."""
        logger.info("Cleaning up old backups...")
        
        try:
            backups = self.list_backups()
            retention_days = self.config["retention"]["days"]
            max_backups = self.config["retention"]["max_backups"]
            
            # Sort by modification time (newest first)
            backups.sort(key=lambda x: x.get('mtime', 0), reverse=True)
            
            # Keep only the most recent backups
            if len(backups) > max_backups:
                backups_to_remove = backups[max_backups:]
                for backup in backups_to_remove:
                    provider_name = backup.get('provider', 'local')
                    if provider_name in self.providers:
                        provider = self.providers[provider_name]
                        if provider.delete(backup['name']):
                            logger.info(f"Removed old backup: {backup['name']}")
                        else:
                            logger.warning(f"Failed to remove backup: {backup['name']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            return False

def main():
    """Main service entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="HOMESERVER Backup Service")
    parser.add_argument("--config", "-c", help="Configuration file path")
    parser.add_argument("--test", action="store_true", help="Test provider connections")
    parser.add_argument("--backup", action="store_true", help="Create backup")
    parser.add_argument("--list", action="store_true", help="List backups")
    parser.add_argument("--cleanup", action="store_true", help="Clean up old backups")
    
    args = parser.parse_args()
    
    # Initialize service
    service = BackupService(args.config)
    
    success = True
    
    if args.test:
        success = service.test_connection()
    elif args.backup:
        success = service.create_backup()
    elif args.list:
        backups = service.list_backups()
        if backups:
            print("Available backups:")
            for backup in backups:
                print(f"  {backup['name']} - {backup.get('size', 0)} bytes - {backup.get('provider', 'unknown')}")
        else:
            print("No backups found")
    elif args.cleanup:
        success = service.cleanup_old_backups()
    else:
        # Default: create backup
        success = service.create_backup()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
