"""
Google Drive Provider
Copyright (C) 2024 HOMESERVER LLC

Provider for Google Drive storage.
"""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import io
from pathlib import Path
from typing import List, Dict, Any
from .base import BaseProvider

class GoogleDriveProvider(BaseProvider):
    """Google Drive provider."""
    
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.credentials_file = config.get('credentials_file')
        self.token_file = config.get('token_file', 'token.json')
        self.folder_id = config.get('folder_id')
        
        # Initialize Google Drive service
        self.service = self._get_service()
    
    def _get_service(self):
        """Get Google Drive service instance."""
        try:
            creds = None
            
            # Load existing token
            if Path(self.token_file).exists():
                creds = Credentials.from_authorized_user_file(self.token_file, self.SCOPES)
            
            # If no valid credentials, get new ones
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not self.credentials_file:
                        print("ERROR: Google Drive credentials file not specified")
                        return None
                    
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_file, self.SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save credentials for next run
                with open(self.token_file, 'w') as token:
                    token.write(creds.to_json())
            
            return build('drive', 'v3', credentials=creds)
        except Exception as e:
            print(f"ERROR: Failed to initialize Google Drive service: {e}")
            return None
    
    def upload(self, file_path: Path, remote_name: str) -> bool:
        """Upload file to Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return False
        
        try:
            file_metadata = {
                'name': remote_name,
                'parents': [self.folder_id] if self.folder_id else []
            }
            
            media = MediaFileUpload(str(file_path), resumable=True)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            return True
        except Exception as e:
            print(f"ERROR: Failed to upload {file_path} to Google Drive: {e}")
            return False
    
    def download(self, remote_name: str, local_path: Path) -> bool:
        """Download file from Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return False
        
        try:
            # Find file by name
            results = self.service.files().list(
                q=f"name='{remote_name}'",
                fields="files(id, name)"
            ).execute()
            
            files = results.get('files', [])
            if not files:
                print(f"ERROR: File not found in Google Drive: {remote_name}")
                return False
            
            file_id = files[0]['id']
            
            # Download file
            request = self.service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            
            done = False
            while done is False:
                status, done = downloader.next_chunk()
            
            # Write to local file
            with open(local_path, 'wb') as f:
                f.write(fh.getvalue())
            
            return True
        except Exception as e:
            print(f"ERROR: Failed to download {remote_name} from Google Drive: {e}")
            return False
    
    def list_files(self) -> List[Dict[str, Any]]:
        """List files in Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return []
        
        files = []
        try:
            query = f"parents in '{self.folder_id}'" if self.folder_id else ""
            
            results = self.service.files().list(
                q=query,
                fields="files(id, name, size, modifiedTime)"
            ).execute()
            
            for file in results.get('files', []):
                files.append({
                    'name': file['name'],
                    'size': int(file.get('size', 0)),
                    'mtime': file.get('modifiedTime', ''),
                    'id': file['id']
                })
        except Exception as e:
            print(f"ERROR: Failed to list files in Google Drive: {e}")
        
        return files
    
    def delete(self, remote_name: str) -> bool:
        """Delete file from Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return False
        
        try:
            # Find file by name
            results = self.service.files().list(
                q=f"name='{remote_name}'",
                fields="files(id)"
            ).execute()
            
            files = results.get('files', [])
            if not files:
                print(f"WARNING: File not found for deletion: {remote_name}")
                return False
            
            file_id = files[0]['id']
            self.service.files().delete(fileId=file_id).execute()
            return True
        except Exception as e:
            print(f"ERROR: Failed to delete {remote_name} from Google Drive: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test connection to Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return False
        
        try:
            # Try to list files (this will fail if no access)
            self.service.files().list(pageSize=1).execute()
            return True
        except Exception as e:
            print(f"ERROR: Google Drive connection test failed: {e}")
            return False
