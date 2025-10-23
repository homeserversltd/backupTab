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
    from .google_cloud_storage import GoogleCloudStorageProvider
except ImportError as e:
    print(f"WARNING: Failed to import Google Cloud Storage provider: {e}")
    class GoogleCloudStorageProvider(BaseProvider):
        def __init__(self, config):
            super().__init__(config)
            self.name = "google_cloud_storage_stub"
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

__all__ = [
    'BaseProvider',
    'LocalProvider', 
    'GoogleCloudStorageProvider',
    'BackblazeProvider',
    'AWSS3Provider'
]

# Provider registry
PROVIDERS = {
    'local': LocalProvider,
    'google_cloud_storage': GoogleCloudStorageProvider,
    'backblaze': BackblazeProvider,
    'aws_s3': AWSS3Provider
}

def get_provider(provider_name: str, config: dict) -> BaseProvider:
    """Get provider instance by name."""
    if provider_name not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider_name}")
    
    provider_class = PROVIDERS[provider_name]
    return provider_class(config)
