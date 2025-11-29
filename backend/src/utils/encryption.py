#!/usr/bin/env python3
"""
HOMESERVER Backup Encryption Utility
Copyright (C) 2024 HOMESERVER LLC

Utility for backup encryption operations.
"""

import base64
import os
from pathlib import Path
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
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
        """Encrypt a file using SUK key with streaming encryption for large files."""
        import sys
        print(f"DEBUG: encrypt_file() called with file_path={file_path}")
        sys.stdout.flush()
        
        suk_key = self.get_suk_key()
        if not suk_key:
            print("DEBUG: Failed to get SUK key")
            sys.stdout.flush()
            self.logger.error("Failed to get SUK key, cannot encrypt file")
            return None
        
        print(f"DEBUG: SUK key obtained, starting encryption")
        sys.stdout.flush()
        
        # Determine output path
        if output_path is None:
            output_path = file_path.with_suffix('.encrypted')
        
        try:
            # Get file size to decide on encryption method
            file_size = file_path.stat().st_size
            print(f"DEBUG: File size: {file_size} bytes ({file_size / (1024*1024*1024):.2f} GB)")
            sys.stdout.flush()
            
            # For files larger than 1GB, use streaming encryption
            # For smaller files, use Fernet (simpler, but requires full file in memory)
            if file_size > 1024 * 1024 * 1024:  # 1GB threshold
                print(f"DEBUG: Large file detected, using streaming AES encryption")
                sys.stdout.flush()
                return self._encrypt_file_streaming(file_path, output_path, suk_key)
            else:
                print(f"DEBUG: Small file, using Fernet encryption")
                sys.stdout.flush()
                return self._encrypt_file_fernet(file_path, output_path, suk_key)
            
        except Exception as e:
            print(f"DEBUG: Exception in encrypt_file(): {e}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            sys.stdout.flush()
            self.logger.error(f"Failed to encrypt file {file_path}: {e}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def _encrypt_file_fernet(self, file_path: Path, output_path: Path, suk_key: bytes) -> Optional[Path]:
        """Encrypt small files using Fernet (loads entire file into memory)."""
        import sys
        print(f"DEBUG: Using Fernet encryption")
        sys.stdout.flush()
        
        fernet = Fernet(suk_key)
        
        print(f"DEBUG: Reading file: {file_path}")
        sys.stdout.flush()
        with open(file_path, "rb") as f:
            file_data = f.read()
        print(f"DEBUG: File read, size: {len(file_data)} bytes")
        sys.stdout.flush()
        
        print(f"DEBUG: Encrypting data...")
        sys.stdout.flush()
        encrypted_data = fernet.encrypt(file_data)
        print(f"DEBUG: Data encrypted, size: {len(encrypted_data)} bytes")
        sys.stdout.flush()
        
        print(f"DEBUG: Writing encrypted file to: {output_path}")
        sys.stdout.flush()
        with open(output_path, "wb") as f:
            f.write(encrypted_data)
        
        print(f"DEBUG: Encrypted file written successfully")
        sys.stdout.flush()
        self.logger.info(f"File encrypted: {output_path}")
        return output_path
    
    def _encrypt_file_streaming(self, file_path: Path, output_path: Path, suk_key: bytes) -> Optional[Path]:
        """Encrypt large files using streaming AES-GCM encryption."""
        import sys
        print(f"DEBUG: Using streaming AES-GCM encryption")
        sys.stdout.flush()
        
        # Derive AES key from Fernet key (Fernet key is base64, decode it)
        # Fernet keys are 32 bytes when base64 decoded
        try:
            # Decode the base64 Fernet key to get raw 32 bytes
            raw_key = base64.urlsafe_b64decode(suk_key)
            if len(raw_key) != 32:
                # If not 32 bytes, derive a 32-byte key from it
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=b'homeserver_backup_aes_salt',
                    iterations=100000,
                )
                raw_key = kdf.derive(suk_key)
        except Exception:
            # Fallback: derive key from suk_key bytes
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'homeserver_backup_aes_salt',
                iterations=100000,
            )
            raw_key = kdf.derive(suk_key if isinstance(suk_key, bytes) else suk_key.encode())
        
        # Generate random IV (12 bytes for GCM)
        iv = os.urandom(12)
        
        print(f"DEBUG: Creating AES-GCM cipher with streaming")
        sys.stdout.flush()
        
        # Create cipher
        cipher = Cipher(algorithms.AES(raw_key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Get file size for progress tracking
        file_size = file_path.stat().st_size
        chunk_size = 64 * 1024 * 1024  # 64MB chunks
        
        print(f"DEBUG: Encrypting in {chunk_size / (1024*1024):.0f}MB chunks")
        sys.stdout.flush()
        
        # Write IV first, then encrypted data
        with open(output_path, "wb") as out_file:
            # Write IV (12 bytes) and a marker to identify this as streaming format
            out_file.write(b'HS_STREAM_ENC_V1')  # 16-byte header
            out_file.write(iv)  # 12-byte IV
            
            # Encrypt file in chunks
            bytes_processed = 0
            with open(file_path, "rb") as in_file:
                while True:
                    chunk = in_file.read(chunk_size)
                    if not chunk:
                        break
                    
                    encrypted_chunk = encryptor.update(chunk)
                    out_file.write(encrypted_chunk)
                    
                    bytes_processed += len(chunk)
                    progress = (bytes_processed / file_size) * 100
                    if bytes_processed % (100 * 1024 * 1024) == 0 or not chunk:  # Log every 100MB
                        print(f"DEBUG: Encrypted {bytes_processed / (1024*1024*1024):.2f}GB / {file_size / (1024*1024*1024):.2f}GB ({progress:.1f}%)")
                        sys.stdout.flush()
            
            # Finalize encryption and write tag
            encrypted_chunk = encryptor.finalize()
            out_file.write(encrypted_chunk)
            out_file.write(encryptor.tag)  # 16-byte authentication tag
        
        print(f"DEBUG: Streaming encryption complete: {output_path}")
        sys.stdout.flush()
        self.logger.info(f"File encrypted (streaming): {output_path}")
        return output_path
    
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
