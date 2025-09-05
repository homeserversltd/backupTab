"""
Local File System Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for local file system storage.
"""

import shutil
from pathlib import Path
from typing import List, Dict, Any
from .base import BaseProvider

class LocalProvider(BaseProvider):
    """Local file system provider."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.storage_path = Path(config.get('path', '/var/www/homeserver/backup'))
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def upload(self, file_path: Path, remote_name: str) -> bool:
        """Upload file to local storage."""
        try:
            dest_path = self.storage_path / remote_name
            shutil.copy2(file_path, dest_path)
            return True
        except Exception as e:
            print(f"ERROR: Failed to upload {file_path} to local storage: {e}")
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
    
    def test_connection(self) -> bool:
        """Test connection to local storage."""
        try:
            # Try to create a test file
            test_file = self.storage_path / '.test_connection'
            test_file.touch()
            test_file.unlink()
            return True
        except Exception as e:
            print(f"ERROR: Local storage test failed: {e}")
            return False
