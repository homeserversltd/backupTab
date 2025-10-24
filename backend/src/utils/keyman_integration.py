"""
Keyman Integration Utilities
Copyright (C) 2024 HOMESERVER LLC

Utilities for integrating with the keyman credential management system.
"""

import os
import subprocess
import logging
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

class KeymanIntegration:
    """Integration with keyman credential management system."""
    
    def __init__(self):
        self.logger = logging.getLogger(f'homeserver_backup.keyman')
        self.vault_dir = Path('/vault/.keys')
        self.keyman_dir = Path('/vault/keyman')
        self.temp_dir = Path('/mnt/keyexchange')
    
    def service_configured(self, service_name: str) -> bool:
        """Check if a service is configured by looking for its key file."""
        self.logger.info(f"Checking if service '{service_name}' is configured")
        
        key_file = self.vault_dir / f"{service_name}.key"
        self.logger.info(f"Looking for key file at: {key_file}")
        self.logger.info(f"Vault directory: {self.vault_dir}")
        
        try:
            # Use sudo test -f to check file existence (required for permission-restricted files)
            result = subprocess.run(
                ['/usr/bin/sudo', 'test', '-f', str(key_file)],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            file_exists = result.returncode == 0
            self.logger.info(f"Key file exists (sudo test): {file_exists}")
            
            if result.returncode != 0:
                self.logger.info(f"Sudo test failed with return code: {result.returncode}")
                if result.stderr:
                    self.logger.info(f"Sudo test stderr: {result.stderr}")
            
            if file_exists:
                # Get file info using sudo stat
                try:
                    stat_result = subprocess.run(
                        ['/usr/bin/sudo', '/usr/bin/stat', str(key_file)],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if stat_result.returncode == 0:
                        self.logger.info(f"File stat successful: {stat_result.stdout.strip()}")
                    else:
                        self.logger.warning(f"File stat failed: {stat_result.stderr}")
                        
                except Exception as e:
                    self.logger.warning(f"Error getting file stat: {e}")
            
            return file_exists
            
        except subprocess.TimeoutExpired:
            self.logger.error(f"Timeout while checking key file existence for {service_name}")
            return False
        except Exception as e:
            self.logger.error(f"Error checking key file existence for {service_name}: {e}")
            return False
    
    def get_service_credentials(self, service_name: str) -> Optional[Dict[str, str]]:
        """
        Get decrypted credentials for a service using keyman.
        Returns dict with 'username' and 'password' keys.
        """
        if not self.service_configured(service_name):
            self.logger.warning(f"Service {service_name} not configured (no key file found)")
            return None
        
        try:
            # Use exportkey.sh to get decrypted credentials
            result = subprocess.run(
                [str(self.keyman_dir / 'exportkey.sh'), service_name],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                self.logger.error(f"Failed to export credentials for {service_name}: {result.stderr}")
                return None
            
            # Wait for ramdisk to be created and credentials file to exist
            cred_file = self.temp_dir / service_name
            max_wait_time = 10  # seconds
            wait_interval = 0.1  # seconds
            waited = 0
            
            while not cred_file.exists() and waited < max_wait_time:
                import time
                time.sleep(wait_interval)
                waited += wait_interval
            
            if not cred_file.exists():
                self.logger.error(f"Credentials file not found at {cred_file} after waiting {max_wait_time}s")
                return None
            
            # Parse credentials file (format: username="user" password="pass")
            credentials = {}
            with open(cred_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes from value
                        value = value.strip('"')
                        credentials[key.strip()] = value
            
            if 'username' not in credentials or 'password' not in credentials:
                self.logger.error(f"Invalid credentials format for {service_name}")
                return None
            
            self.logger.info(f"Successfully retrieved credentials for {service_name}")
            return credentials
            
        except subprocess.TimeoutExpired:
            self.logger.error(f"Timeout while exporting credentials for {service_name}")
            return None
        except Exception as e:
            self.logger.error(f"Error getting credentials for {service_name}: {e}")
            return None
    
    def create_service_credentials(self, service_name: str, username: str, password: str) -> bool:
        """
        Create new service credentials using keyman.
        """
        try:
            # Use newkey.sh to create credentials
            result = subprocess.run(
                [str(self.keyman_dir / 'newkey.sh'), service_name, username, password],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                self.logger.error(f"Failed to create credentials for {service_name}: {result.stderr}")
                return False
            
            self.logger.info(f"Successfully created credentials for {service_name}")
            return True
            
        except subprocess.TimeoutExpired:
            self.logger.error(f"Timeout while creating credentials for {service_name}")
            return False
        except Exception as e:
            self.logger.error(f"Error creating credentials for {service_name}: {e}")
            return False
    
    def update_service_credentials(self, service_name: str, new_password: str, username: str = None, old_password: str = None) -> bool:
        """
        Update existing service credentials using keyman.
        """
        try:
            # Use change_key.sh to update credentials
            cmd = [str(self.keyman_dir / 'change_key.sh'), service_name, new_password]
            if username:
                cmd.append(username)
            if old_password:
                cmd.append(old_password)
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                self.logger.error(f"Failed to update credentials for {service_name}: {result.stderr}")
                return False
            
            self.logger.info(f"Successfully updated credentials for {service_name}")
            return True
            
        except subprocess.TimeoutExpired:
            self.logger.error(f"Timeout while updating credentials for {service_name}")
            return False
        except Exception as e:
            self.logger.error(f"Error updating credentials for {service_name}: {e}")
            return False
    
    def delete_service_credentials(self, service_name: str) -> bool:
        """
        Delete service credentials using keyman.
        Note: This requires interactive input, so it's not fully automated.
        """
        try:
            # Use deletekey.sh to remove credentials
            result = subprocess.run(
                [str(self.keyman_dir / 'deletekey.sh')],
                input=f"{service_name}\ny\n",  # Select service and confirm
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                self.logger.error(f"Failed to delete credentials for {service_name}: {result.stderr}")
                return False
            
            self.logger.info(f"Successfully deleted credentials for {service_name}")
            return True
            
        except subprocess.TimeoutExpired:
            self.logger.error(f"Timeout while deleting credentials for {service_name}")
            return False
        except Exception as e:
            self.logger.error(f"Error deleting credentials for {service_name}: {e}")
            return False
    
    def get_configured_services(self) -> list:
        """Get list of all configured services (those with key files)."""
        configured_services = []
        
        if not self.vault_dir.exists():
            return configured_services
        
        for key_file in self.vault_dir.glob('*.key'):
            service_name = key_file.stem
            # Skip system keys
            if service_name not in ['service_suite', 'nas']:
                configured_services.append(service_name)
        
        return configured_services
    
    def validate_credentials_format(self, credentials: Dict[str, str]) -> bool:
        """Validate that credentials have the required format."""
        required_keys = ['username', 'password']
        return all(key in credentials for key in required_keys)
    
    def get_provider_config_from_keyman(self, provider_name: str, additional_config: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """
        Get provider configuration by combining keyman credentials with additional config.
        """
        credentials = self.get_service_credentials(provider_name)
        if not credentials:
            return None
        
        # Start with additional config or empty dict
        config = additional_config or {}
        
        # Add credentials
        config.update(credentials)
        
        # Add keyman integration flag
        config['keyman_integrated'] = True
        
        return config
