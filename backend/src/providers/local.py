"""
Local Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for local file system storage.
"""

import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
import logging
import os
from .base import BaseProvider

class LocalProvider(BaseProvider):
    """Local file system provider."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.logger = logging.getLogger(f'homeserver_backup.local')
        
        # Configuration - support both 'container' and 'path' for compatibility
        self.container = config.get('container') or config.get('path', '/mnt/nas/backups/homeserver')
        self.base_path = Path(self.container)
        
        # Ensure base path exists
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        self.logger.info(f"Local provider initialized with base path: {self.base_path}")
    
    def upload(self, file_path: Path, remote_name: str, progress_callback: Optional[Callable] = None) -> bool:
        """Upload file to local storage."""
        try:
            if not file_path.exists():
                self.logger.error(f"Source file not found: {file_path}")
                return False
            
            # Create destination path
            dest_path = self.base_path / remote_name
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            if progress_callback:
                progress_callback(0, file_path.stat().st_size)
            
            shutil.copy2(file_path, dest_path)
            
            if progress_callback:
                progress_callback(file_path.stat().st_size, file_path.stat().st_size)
            
            self.logger.info(f"Successfully uploaded {file_path} to {dest_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to upload {file_path}: {e}")
            return False
    
    def download(self, remote_name: str, local_path: Path, progress_callback: Optional[Callable] = None) -> bool:
        """Download file from local storage."""
        try:
            source_path = self.base_path / remote_name
            
            if not source_path.exists():
                self.logger.error(f"File not found: {source_path}")
                return False
            
            # Ensure local directory exists
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            if progress_callback:
                progress_callback(0, source_path.stat().st_size)
            
            shutil.copy2(source_path, local_path)
            
            if progress_callback:
                progress_callback(source_path.stat().st_size, source_path.stat().st_size)
            
            self.logger.info(f"Successfully downloaded {source_path} to {local_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to download {remote_name}: {e}")
            return False
    
    def list_files(self, prefix: str = "", max_files: int = 1000) -> List[Dict[str, Any]]:
        """List files in local storage."""
        files = []
        
        try:
            for file_path in self.base_path.rglob('*'):
                if file_path.is_file():
                    # Apply prefix filtering
                    relative_path = file_path.relative_to(self.base_path)
                    if prefix and not str(relative_path).startswith(prefix):
                        continue
                    
                    # Apply max_files limit
                    if len(files) >= max_files:
                        break
                    
                    stat = file_path.stat()
                    files.append({
                        'name': str(relative_path),
                        'size': stat.st_size,
                        'mtime': stat.st_mtime,
                        'path': str(file_path)
                    })
            
            self.logger.info(f"Found {len(files)} files in local storage")
            
        except Exception as e:
            self.logger.error(f"Error listing files: {e}")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from local storage."""
        try:
            file_path = self.base_path / remote_name
            
            if not file_path.exists():
                self.logger.warning(f"File not found for deletion: {file_path}")
                return False
            
            file_path.unlink()
            self.logger.info(f"Successfully deleted {file_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete {remote_name}: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test connection to local storage."""
        try:
            # Test if we can read and write to the base path
            test_file = self.base_path / '.test_connection'
            
            # Test write
            test_file.write_text('test')
            
            # Test read
            content = test_file.read_text()
            if content != 'test':
                return False
            
            # Clean up
            test_file.unlink()
            
            self.logger.info("Local storage connection test successful")
            return True
            
        except Exception as e:
            self.logger.error(f"Local storage connection test failed: {e}")
            return False
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get storage information."""
        try:
            # Get disk usage
            statvfs = os.statvfs(self.base_path)
            
            # Calculate sizes
            total_bytes = statvfs.f_frsize * statvfs.f_blocks
            free_bytes = statvfs.f_frsize * statvfs.f_available
            used_bytes = total_bytes - free_bytes
            
            return {
                'total_bytes': total_bytes,
                'used_bytes': used_bytes,
                'free_bytes': free_bytes,
                'total_gb': round(total_bytes / (1024**3), 2),
                'used_gb': round(used_bytes / (1024**3), 2),
                'free_gb': round(free_bytes / (1024**3), 2),
                'usage_percent': round((used_bytes / total_bytes) * 100, 2)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get storage info: {e}")
            return {}
    
    def create_backup(self, backup_items: List[str], timestamp: str) -> Optional[Path]:
        """Create a compressed backup tarball of the specified items (no encryption)."""
        try:
            backup_name = f"homeserver_backup_{timestamp}.tar.gz"
            backup_path = self.base_path / backup_name
            
            # Ensure base path exists
            self.base_path.mkdir(parents=True, exist_ok=True)
            
            # Create compressed tarball (no encryption - handled by main script)
            import tarfile
            with tarfile.open(backup_path, "w:gz", compresslevel=6) as tar:
                for item in backup_items:
                    item_path = Path(item)
                    if item_path.exists():
                        tar.add(item, arcname=item_path.name)
                        self.logger.info(f"Added to backup: {item}")
                    else:
                        self.logger.warning(f"Item not found: {item}")
            
            self.logger.info(f"Created local backup: {backup_path}")
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            return None

    def get_provider_status(self) -> Dict[str, Any]:
        """Get comprehensive provider status information."""
        storage_info = self.get_storage_info()
        
        return {
            'name': self.name,
            'base_path': str(self.base_path),
            'path_exists': self.base_path.exists(),
            'path_writable': os.access(self.base_path, os.W_OK),
            'storage_info': storage_info,
            'connection_test': self.test_connection()
        }