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
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from .base import BaseProvider

class GoogleDriveProvider(BaseProvider):
    """Google Drive provider implementation."""
    
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.credentials_file = config.get('credentials_file', 'credentials.json')
        self.token_file = config.get('token_file', 'token.json')
        self.folder_id = config.get('folder_id')
        self.container = config.get('container', 'HOMESERVER Backups')
        self.max_retries = config.get('max_retries', 3)
        self.retry_delay = config.get('retry_delay', 1.0)
        self.timeout = config.get('timeout', 300)
        
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
                    if not self.credentials_file or not Path(self.credentials_file).exists():
                        print("ERROR: Google Drive credentials file not found")
                        print(f"Expected: {self.credentials_file}")
                        print("Please download credentials.json from Google Cloud Console")
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
    
    def _ensure_folder_exists(self) -> Optional[str]:
        """Ensure the backup folder exists in Google Drive."""
        if not self.service:
            return None
        
        try:
            # Check if folder already exists
            if self.folder_id:
                try:
                    folder = self.service.files().get(fileId=self.folder_id).execute()
                    if folder.get('mimeType') == 'application/vnd.google-apps.folder':
                        return self.folder_id
                except:
                    pass  # Folder doesn't exist or no access
            
            # Search for existing folder
            results = self.service.files().list(
                q=f"name='{self.container}' and mimeType='application/vnd.google-apps.folder'",
                fields="files(id, name)"
            ).execute()
            
            files = results.get('files', [])
            if files:
                self.folder_id = files[0]['id']
                return self.folder_id
            
            # Create folder if it doesn't exist
            folder_metadata = {
                'name': self.container,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            folder = self.service.files().create(
                body=folder_metadata,
                fields='id'
            ).execute()
            
            self.folder_id = folder.get('id')
            print(f"Created Google Drive folder: {self.container} (ID: {self.folder_id})")
            return self.folder_id
            
        except Exception as e:
            print(f"ERROR: Failed to ensure folder exists: {e}")
            return None
    
    def upload(self, file_path: Path, remote_name: str, progress_callback: Optional[Callable] = None) -> bool:
        """Upload file to Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return False
        
        # Ensure folder exists
        if not self._ensure_folder_exists():
            print("ERROR: Failed to create or access backup folder")
            return False
        
        for attempt in range(self.max_retries):
            try:
                if progress_callback:
                    progress_callback(0, file_path.stat().st_size)
                
                file_metadata = {
                    'name': remote_name,
                    'parents': [self.folder_id] if self.folder_id else []
                }
                
                media = MediaFileUpload(str(file_path), resumable=True)
                request = self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                )
                
                # Execute with progress tracking
                response = None
                while response is None:
                    status, response = request.next_chunk()
                    if status and progress_callback:
                        progress = int(status.progress() * file_path.stat().st_size)
                        progress_callback(progress, file_path.stat().st_size)
                
                if progress_callback:
                    progress_callback(file_path.stat().st_size, file_path.stat().st_size)
                
                print(f"Successfully uploaded {remote_name} to Google Drive")
                return True
                
            except Exception as e:
                if attempt < self.max_retries - 1:
                    print(f"Upload attempt {attempt + 1} failed: {e}")
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    print(f"ERROR: Failed to upload {file_path} to Google Drive after {self.max_retries} attempts: {e}")
                    return False
        
        return False
    
    def download(self, remote_name: str, local_path: Path, progress_callback: Optional[Callable] = None) -> bool:
        """Download file from Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return False
        
        for attempt in range(self.max_retries):
            try:
                # Find file by name
                query = f"name='{remote_name}'"
                if self.folder_id:
                    query += f" and parents in '{self.folder_id}'"
                
                results = self.service.files().list(
                    q=query,
                    fields="files(id, name, size)"
                ).execute()
                
                files = results.get('files', [])
                if not files:
                    print(f"ERROR: File not found in Google Drive: {remote_name}")
                    return False
                
                file_id = files[0]['id']
                file_size = int(files[0].get('size', 0))
                
                if progress_callback:
                    progress_callback(0, file_size)
                
                # Download file
                request = self.service.files().get_media(fileId=file_id)
                fh = io.BytesIO()
                downloader = MediaIoBaseDownload(fh, request)
                
                done = False
                while done is False:
                    status, done = downloader.next_chunk()
                    if progress_callback and status:
                        progress = int(status.progress() * file_size)
                        progress_callback(progress, file_size)
                
                # Write to local file
                with open(local_path, 'wb') as f:
                    f.write(fh.getvalue())
                
                if progress_callback:
                    progress_callback(file_size, file_size)
                
                print(f"Successfully downloaded {remote_name} from Google Drive")
                return True
                
            except Exception as e:
                if attempt < self.max_retries - 1:
                    print(f"Download attempt {attempt + 1} failed: {e}")
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    print(f"ERROR: Failed to download {remote_name} from Google Drive after {self.max_retries} attempts: {e}")
                    return False
        
        return False
    
    def list_files(self, prefix: str = "", max_files: int = 1000) -> List[Dict[str, Any]]:
        """List files in Google Drive."""
        if not self.service:
            print("ERROR: Google Drive service not initialized")
            return []
        
        files = []
        try:
            query = f"parents in '{self.folder_id}'" if self.folder_id else ""
            if prefix:
                query += f" and name contains '{prefix}'"
            
            results = self.service.files().list(
                q=query,
                fields="files(id, name, size, modifiedTime)",
                pageSize=max_files
            ).execute()
            
            for file in results.get('files', []):
                # Convert modifiedTime to timestamp
                mtime = file.get('modifiedTime', '')
                if mtime:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(mtime.replace('Z', '+00:00'))
                        mtime = dt.timestamp()
                    except:
                        mtime = 0
                else:
                    mtime = 0
                
                files.append({
                    'name': file['name'],
                    'size': int(file.get('size', 0)),
                    'mtime': mtime,
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
            query = f"name='{remote_name}'"
            if self.folder_id:
                query += f" and parents in '{self.folder_id}'"
            
            results = self.service.files().list(
                q=query,
                fields="files(id)"
            ).execute()
            
            files = results.get('files', [])
            if not files:
                print(f"WARNING: File not found for deletion: {remote_name}")
                return False
            
            file_id = files[0]['id']
            self.service.files().delete(fileId=file_id).execute()
            print(f"Successfully deleted {remote_name} from Google Drive")
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
            print("Google Drive connection test successful")
            return True
        except Exception as e:
            print(f"ERROR: Google Drive connection test failed: {e}")
            return False
