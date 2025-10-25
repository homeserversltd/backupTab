#!/usr/bin/env python3
"""
HOMESERVER Backup Encryption Utility
Copyright (C) 2024 HOMESERVER LLC

Utility for backup encryption operations.
"""

import base64
from pathlib import Path
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from .logger import get_logger


class EncryptionManager:
    """Manages backup encryption operations using SUK (Secure User Key)."""
    
    def __init__(self):
        self.logger = get_logger()
        # Import keyman integration to get SUK
        from .keyman_integration import KeymanIntegration
        self.keyman = KeymanIntegration()
    
    def get_suk_key(self) -> Optional[bytes]:
        """Get Secure User Key from keyman backup service."""
        try:
            # Get backup credentials from keyman
            credentials = self.keyman.get_service_credentials('backup')
            if not credentials:
                self.logger.error("Failed to get backup credentials from keyman")
                return None
            
            # Use the password as the SUK
            suk_password = credentials.get('password')
            if not suk_password:
                self.logger.error("No password found in backup credentials")
                return None
            
            # Convert SUK to encryption key using PBKDF2
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'homeserver_backup_salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(suk_password.encode()))
            self.logger.info("Successfully derived encryption key from SUK")
            return key
        except Exception as e:
            self.logger.error(f"Failed to get SUK key: {e}")
            return None
    
    def encrypt_file(self, file_path: Path, output_path: Optional[Path] = None) -> Optional[Path]:
        """Encrypt a file using SUK key."""
        suk_key = self.get_suk_key()
        if not suk_key:
            self.logger.error("Failed to get SUK key, cannot encrypt file")
            return None
        
        try:
            fernet = Fernet(suk_key)
            
            # Read and encrypt the file
            with open(file_path, "rb") as f:
                encrypted_data = fernet.encrypt(f.read())
            
            # Determine output path
            if output_path is None:
                output_path = file_path.with_suffix('.encrypted')
            
            # Write encrypted file
            with open(output_path, "wb") as f:
                f.write(encrypted_data)
            
            self.logger.info(f"File encrypted: {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Failed to encrypt file {file_path}: {e}")
            return None
    
    def decrypt_file(self, encrypted_path: Path, output_path: Optional[Path] = None) -> Optional[Path]:
        """Decrypt a file using SUK key."""
        suk_key = self.get_suk_key()
        if not suk_key:
            self.logger.error("Failed to get SUK key, cannot decrypt file")
            return None
        
        try:
            fernet = Fernet(suk_key)
            
            # Read and decrypt the file
            with open(encrypted_path, "rb") as f:
                decrypted_data = fernet.decrypt(f.read())
            
            # Determine output path
            if output_path is None:
                output_path = encrypted_path.with_suffix('').with_suffix('.decrypted')
            
            # Write decrypted file
            with open(output_path, "wb") as f:
                f.write(decrypted_data)
            
            self.logger.info(f"File decrypted: {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Failed to decrypt file {encrypted_path}: {e}")
            return None
    
    def is_encryption_available(self) -> bool:
        """Check if encryption is available (SUK key exists)."""
        return self.get_suk_key() is not None
