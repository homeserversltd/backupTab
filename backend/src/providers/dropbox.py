"""
Dropbox Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for Dropbox storage.
"""

import dropbox
from dropbox.exceptions import ApiError, AuthError
from pathlib import Path
from typing import List, Dict, Any
from .base import BaseProvider

class DropboxProvider(BaseProvider):
    """Dropbox provider."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.access_token = config.get('access_token')
        self.folder_path = config.get('folder_path', '/HOMESERVER Backups')
        
        # Initialize Dropbox client
        if self.access_token:
            self.dbx = dropbox.Dropbox(self.access_token)
        else:
            print("ERROR: Dropbox access token not provided")
            self.dbx = None
    
    def upload(self, file_path: Path, remote_name: str) -> bool:
        """Upload file to Dropbox."""
        if not self.dbx:
            print("ERROR: Dropbox client not initialized")
            return False
        
        try:
            remote_path = f"{self.folder_path}/{remote_name}"
            
            with open(file_path, 'rb') as f:
                self.dbx.files_upload(
                    f.read(),
                    remote_path,
                    mode=dropbox.files.WriteMode.overwrite
                )
            return True
        except ApiError as e:
            print(f"ERROR: Failed to upload {file_path} to Dropbox: {e}")
            return False
        except AuthError:
            print("ERROR: Dropbox authentication failed")
            return False
    
    def download(self, remote_name: str, local_path: Path) -> bool:
        """Download file from Dropbox."""
        if not self.dbx:
            print("ERROR: Dropbox client not initialized")
            return False
        
        try:
            remote_path = f"{self.folder_path}/{remote_name}"
            
            metadata, response = self.dbx.files_download(remote_path)
            
            with open(local_path, 'wb') as f:
                f.write(response.content)
            
            return True
        except ApiError as e:
            print(f"ERROR: Failed to download {remote_name} from Dropbox: {e}")
            return False
        except AuthError:
            print("ERROR: Dropbox authentication failed")
            return False
    
    def list_files(self) -> List[Dict[str, Any]]:
        """List files in Dropbox folder."""
        if not self.dbx:
            print("ERROR: Dropbox client not initialized")
            return []
        
        files = []
        try:
            result = self.dbx.files_list_folder(self.folder_path)
            
            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    files.append({
                        'name': entry.name,
                        'size': entry.size,
                        'mtime': entry.server_modified.timestamp(),
                        'path': entry.path_display
                    })
        except ApiError as e:
            print(f"ERROR: Failed to list files in Dropbox: {e}")
        except AuthError:
            print("ERROR: Dropbox authentication failed")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from Dropbox."""
        if not self.dbx:
            print("ERROR: Dropbox client not initialized")
            return False
        
        try:
            remote_path = f"{self.folder_path}/{remote_name}"
            self.dbx.files_delete_v2(remote_path)
            return True
        except ApiError as e:
            print(f"ERROR: Failed to delete {remote_name} from Dropbox: {e}")
            return False
        except AuthError:
            print("ERROR: Dropbox authentication failed")
            return False
    
    def test_connection(self) -> bool:
        """Test connection to Dropbox."""
        if not self.dbx:
            print("ERROR: Dropbox client not initialized")
            return False
        
        try:
            # Try to get account info
            self.dbx.users_get_current_account()
            return True
        except ApiError as e:
            print(f"ERROR: Dropbox connection test failed: {e}")
            return False
        except AuthError:
            print("ERROR: Dropbox authentication failed")
            return False
