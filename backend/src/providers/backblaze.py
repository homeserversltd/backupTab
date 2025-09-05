"""
Backblaze B2 Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for Backblaze B2 storage.
"""

import b2sdk
from b2sdk.v1 import InMemoryAccountInfo, B2Api
from b2sdk.v1.exception import B2Error
from pathlib import Path
from typing import List, Dict, Any
from .base import BaseProvider

class BackblazeProvider(BaseProvider):
    """Backblaze B2 provider."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.application_key_id = config.get('application_key_id')
        self.application_key = config.get('application_key')
        self.bucket_name = config.get('bucket', 'homeserver-backups')
        
        # Initialize B2 API
        try:
            info = InMemoryAccountInfo()
            self.b2_api = B2Api(info)
            self.b2_api.authorize_account(
                "production",
                self.application_key_id,
                self.application_key
            )
            self.bucket = self.b2_api.get_bucket_by_name(self.bucket_name)
        except Exception as e:
            print(f"ERROR: Failed to initialize B2 API: {e}")
            self.b2_api = None
            self.bucket = None
    
    def upload(self, file_path: Path, remote_name: str) -> bool:
        """Upload file to Backblaze B2."""
        if not self.b2_api or not self.bucket:
            print("ERROR: B2 API not initialized")
            return False
        
        try:
            self.bucket.upload_local_file(
                str(file_path),
                remote_name
            )
            return True
        except B2Error as e:
            print(f"ERROR: Failed to upload {file_path} to B2: {e}")
            return False
    
    def download(self, remote_name: str, local_path: Path) -> bool:
        """Download file from Backblaze B2."""
        if not self.b2_api or not self.bucket:
            print("ERROR: B2 API not initialized")
            return False
        
        try:
            file_info = self.bucket.get_file_info_by_name(remote_name)
            if not file_info:
                print(f"ERROR: File not found in B2: {remote_name}")
                return False
            
            download_dest = b2sdk.v1.DownloadDestLocalFile(str(local_path))
            self.bucket.download_file_by_name(remote_name, download_dest)
            return True
        except B2Error as e:
            print(f"ERROR: Failed to download {remote_name} from B2: {e}")
            return False
    
    def list_files(self) -> List[Dict[str, Any]]:
        """List files in Backblaze B2 bucket."""
        if not self.b2_api or not self.bucket:
            print("ERROR: B2 API not initialized")
            return []
        
        files = []
        try:
            for file_info in self.bucket.ls():
                files.append({
                    'name': file_info.file_name,
                    'size': file_info.size,
                    'mtime': file_info.upload_timestamp / 1000,  # Convert to seconds
                    'id': file_info.id_
                })
        except B2Error as e:
            print(f"ERROR: Failed to list files in B2: {e}")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from Backblaze B2."""
        if not self.b2_api or not self.bucket:
            print("ERROR: B2 API not initialized")
            return False
        
        try:
            file_info = self.bucket.get_file_info_by_name(remote_name)
            if not file_info:
                print(f"WARNING: File not found for deletion: {remote_name}")
                return False
            
            self.bucket.delete_file_version(file_info.id_, file_info.file_name)
            return True
        except B2Error as e:
            print(f"ERROR: Failed to delete {remote_name} from B2: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test connection to Backblaze B2."""
        if not self.b2_api or not self.bucket:
            print("ERROR: B2 API not initialized")
            return False
        
        try:
            # Try to list files (this will fail if no access)
            list(self.bucket.ls(limit=1))
            return True
        except B2Error as e:
            print(f"ERROR: B2 connection test failed: {e}")
            return False
