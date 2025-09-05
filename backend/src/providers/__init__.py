"""
HOMESERVER Backup Providers
Copyright (C) 2024 HOMESERVER LLC

Modular provider system for backup storage and retrieval.
"""

try:
    from .base import BaseProvider
    from .local import LocalProvider
    from .aws_s3 import AWSS3Provider
    from .google_drive import GoogleDriveProvider
    from .dropbox import DropboxProvider
    from .backblaze import BackblazeProvider
except ImportError as e:
    print(f"WARNING: Failed to import some providers: {e}")
    # Create stub classes for missing providers
    class BaseProvider:
        def __init__(self, config):
            self.config = config
            self.name = "stub"
    
    class LocalProvider(BaseProvider):
        pass
    
    class AWSS3Provider(BaseProvider):
        pass
    
    class GoogleDriveProvider(BaseProvider):
        pass
    
    class DropboxProvider(BaseProvider):
        pass
    
    class BackblazeProvider(BaseProvider):
        pass

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
