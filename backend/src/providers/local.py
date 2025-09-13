"""
Local File System Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for local file system storage with tarball creation and encryption.
"""

import os
import shutil
import tarfile
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional
from .base import BaseProvider

class LocalProvider(BaseProvider):
    """Local file system provider with tarball creation and encryption."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        # Use 'container' field for NAS path (matches CloudProvider type)
        self.storage_path = Path(config.get('container', '/mnt/nas/backups/homeserver'))
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.temp_dir = Path(tempfile.gettempdir()) / "homeserver-local-backup"
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup_tarball(self, backup_items: List[str], timestamp: str) -> Optional[Path]:
        """Create encrypted tarball from backup items."""
        try:
            tarball_name = f"homeserver_backup_{timestamp}.tar.gz"
            tarball_path = self.temp_dir / tarball_name
            
            print(f"Creating backup tarball: {tarball_name}")
            
            # Create tar.gz archive with maximum compression
            with tarfile.open(tarball_path, "w:gz", compresslevel=9) as tar:
                for item in backup_items:
                    item_path = Path(item)
                    if item_path.exists():
                        # Add with relative path to avoid absolute paths in archive
                        arcname = item_path.name if item_path.is_file() else item_path.name
                        tar.add(item, arcname=arcname)
                        print(f"  Added: {item}")
                    else:
                        print(f"  WARNING: Item not found: {item}")
            
            print(f"Created tarball: {tarball_path}")
            return tarball_path
            
        except Exception as e:
            print(f"ERROR: Failed to create backup tarball: {e}")
            return None
    
    def encrypt_tarball(self, tarball_path: Path) -> Optional[Path]:
        """Encrypt the tarball using FAK encryption."""
        try:
            # Import encryption manager
            from ..utils import EncryptionManager
            
            encryption_manager = EncryptionManager()
            
            if not encryption_manager.is_encryption_available():
                print("WARNING: FAK key not available, storing unencrypted tarball")
                return tarball_path
            
            print("Encrypting backup tarball...")
            encrypted_path = encryption_manager.encrypt_file(tarball_path)
            
            if encrypted_path:
                # Clean up unencrypted tarball
                tarball_path.unlink()
                print(f"Encrypted tarball: {encrypted_path}")
                return encrypted_path
            else:
                print("ERROR: Failed to encrypt tarball")
                return None
                
        except Exception as e:
            print(f"ERROR: Failed to encrypt tarball: {e}")
            return None
    
    def upload(self, file_path: Path, remote_name: str) -> bool:
        """Upload file to local NAS storage."""
        try:
            dest_path = self.storage_path / remote_name
            shutil.copy2(file_path, dest_path)
            print(f"Uploaded to NAS: {dest_path}")
            return True
        except Exception as e:
            print(f"ERROR: Failed to upload {file_path} to NAS storage: {e}")
            return False
    
    def download(self, remote_name: str, local_path: Path) -> bool:
        """Download file from local storage."""
        try:
            source_path = self.storage_path / remote_name
            if not source_path.exists():
                print(f"ERROR: File not found in local storage: {remote_name}")
                return False
            
            shutil.copy2(source_path, local_path)
            return True
        except Exception as e:
            print(f"ERROR: Failed to download {remote_name} from local storage: {e}")
            return False
    
    def list_files(self) -> List[Dict[str, Any]]:
        """List files in local storage."""
        files = []
        try:
            for file_path in self.storage_path.iterdir():
                if file_path.is_file():
                    stat = file_path.stat()
                    files.append({
                        'name': file_path.name,
                        'size': stat.st_size,
                        'mtime': stat.st_mtime,
                        'path': str(file_path)
                    })
        except Exception as e:
            print(f"ERROR: Failed to list files in local storage: {e}")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from local storage."""
        try:
            file_path = self.storage_path / remote_name
            if file_path.exists():
                file_path.unlink()
                return True
            else:
                print(f"WARNING: File not found for deletion: {remote_name}")
                return False
        except Exception as e:
            print(f"ERROR: Failed to delete {remote_name} from local storage: {e}")
            return False
    
    def create_backup(self, backup_items: List[str], timestamp: str) -> Optional[Path]:
        """Create complete backup: tarball + encrypt + upload to NAS."""
        try:
            # Step 1: Create tarball from backup items
            tarball_path = self.create_backup_tarball(backup_items, timestamp)
            if not tarball_path:
                return None
            
            # Step 2: Encrypt tarball
            encrypted_path = self.encrypt_tarball(tarball_path)
            if not encrypted_path:
                return None
            
            # Step 3: Upload to NAS
            remote_name = encrypted_path.name
            if self.upload(encrypted_path, remote_name):
                # Clean up temp file
                encrypted_path.unlink()
                return self.storage_path / remote_name
            else:
                return None
                
        except Exception as e:
            print(f"ERROR: Failed to create backup: {e}")
            return None
    
    def test_connection(self) -> bool:
        """Test connection to NAS storage."""
        try:
            # Test NAS directory access
            test_file = self.storage_path / '.test_connection'
            test_file.touch()
            test_file.unlink()
            
            # Test temp directory access
            temp_test = self.temp_dir / '.test_connection'
            temp_test.touch()
            temp_test.unlink()
            
            print(f"✓ NAS storage test successful: {self.storage_path}")
            return True
        except Exception as e:
            print(f"ERROR: NAS storage test failed: {e}")
            return False
