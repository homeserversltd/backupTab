"""
HOMESERVER Backup Providers
Copyright (C) 2024 HOMESERVER LLC

Modular provider system for backup storage and retrieval.
"""

# Import base provider first
from .base import BaseProvider

# Import local provider (should always work)
from .local import LocalProvider

# Import cloud providers with individual error handling
try:
    from .aws_s3 import AWSS3Provider
except ImportError as e:
    print(f"WARNING: Failed to import AWS S3 provider: {e}")
    class AWSS3Provider(BaseProvider):
        def __init__(self, config):
            super().__init__(config)
            self.name = "aws_s3_stub"
        def test_connection(self): return False
        def upload(self, *args, **kwargs): return False
        def download(self, *args, **kwargs): return False
        def list_files(self): return []
        def delete(self, *args, **kwargs): return False

try:
    from .google_drive import GoogleDriveProvider
except ImportError as e:
    print(f"WARNING: Failed to import Google Drive provider: {e}")
    class GoogleDriveProvider(BaseProvider):
        def __init__(self, config):
            super().__init__(config)
            self.name = "google_drive_stub"
        def test_connection(self): return False
        def upload(self, *args, **kwargs): return False
        def download(self, *args, **kwargs): return False
        def list_files(self): return []
        def delete(self, *args, **kwargs): return False

try:
    from .dropbox import DropboxProvider
except ImportError as e:
    print(f"WARNING: Failed to import Dropbox provider: {e}")
    class DropboxProvider(BaseProvider):
        def __init__(self, config):
            super().__init__(config)
            self.name = "dropbox_stub"
        def test_connection(self): return False
        def upload(self, *args, **kwargs): return False
        def download(self, *args, **kwargs): return False
        def list_files(self): return []
        def delete(self, *args, **kwargs): return False

try:
    from .backblaze import BackblazeProvider
except ImportError as e:
    print(f"WARNING: Failed to import Backblaze provider: {e}")
    class BackblazeProvider(BaseProvider):
        def __init__(self, config):
            super().__init__(config)
            self.name = "backblaze_stub"
        def test_connection(self): return False
        def upload(self, *args, **kwargs): return False
        def download(self, *args, **kwargs): return False
        def list_files(self): return []
        def delete(self, *args, **kwargs): return False

__all__ = [
    'BaseProvider',
    'LocalProvider', 
    'AWSS3Provider',
    'GoogleDriveProvider',
    'DropboxProvider',
    'BackblazeProvider'
]

# Provider registry
PROVIDERS = {
    'local': LocalProvider,
    'aws_s3': AWSS3Provider,
    'google_drive': GoogleDriveProvider,
    'dropbox': DropboxProvider,
    'backblaze': BackblazeProvider
}

def get_provider(provider_name: str, config: dict) -> BaseProvider:
    """Get provider instance by name."""
    if provider_name not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider_name}")
    
    provider_class = PROVIDERS[provider_name]
    return provider_class(config)
