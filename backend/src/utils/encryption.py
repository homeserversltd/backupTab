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
    """Manages backup encryption operations."""
    
    def __init__(self, fak_path: str = "/root/key/skeleton.key"):
        self.fak_path = Path(fak_path)
        self.logger = get_logger()
    
    def get_fak_key(self) -> Optional[bytes]:
        """Get Factory Access Key from skeleton.key."""
        try:
            with open(self.fak_path, "r") as f:
                fak_text = f.read().strip()
            
            # Convert FAK to encryption key using PBKDF2
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'homeserver_backup_salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(fak_text.encode()))
            return key
        except Exception as e:
            self.logger.error(f"Failed to get FAK key: {e}")
            return None
    
    def encrypt_file(self, file_path: Path, output_path: Optional[Path] = None) -> Optional[Path]:
        """Encrypt a file using FAK key."""
        fak_key = self.get_fak_key()
        if not fak_key:
            self.logger.error("Failed to get FAK key, cannot encrypt file")
            return None
        
        try:
            fernet = Fernet(fak_key)
            
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
        """Decrypt a file using FAK key."""
        fak_key = self.get_fak_key()
        if not fak_key:
            self.logger.error("Failed to get FAK key, cannot decrypt file")
            return None
        
        try:
            fernet = Fernet(fak_key)
            
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
        """Check if encryption is available (FAK key exists)."""
        return self.fak_path.exists() and self.get_fak_key() is not None
