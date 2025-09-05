#!/usr/bin/env python3
"""
HOMESERVER Backup Service Installer
Copyright (C) 2024 HOMESERVER LLC

Installs and configures the backup service.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def install_backup_service():
    """Install the backup service."""
    print("Installing HOMESERVER Backup Service...")
    
    # Define paths
    source_dir = Path(__file__).parent.parent.parent  # Go up to backend directory
    install_dir = Path("/var/www/homeserver/backup")
    service_file = Path("/etc/systemd/system/homeserver-backup.service")
    cron_file = Path("/etc/cron.d/homeserver-backup")
    
    try:
        # Create backup directory
        install_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created backup directory: {install_dir}")
        
        # Copy backup files
        files_to_copy = [
            "backup",
            "src"
        ]
        
        for item in files_to_copy:
            source_path = source_dir / item
            dest_path = install_dir / item
            
            if source_path.is_dir():
                if dest_path.exists():
                    shutil.rmtree(dest_path)
                shutil.copytree(source_path, dest_path)
            else:
                shutil.copy2(source_path, dest_path)
            
            print(f"Copied {item} to {dest_path}")
        
        # Set permissions
        os.chmod(install_dir / "backup", 0o755)
        os.chmod(install_dir / "src" / "service" / "backup_service.py", 0o755)
        
        # Install systemd service
        shutil.copy2(source_dir / "src" / "config" / "homeserver-backup.service", service_file)
        print(f"Installed systemd service: {service_file}")
        
        # Install cron job
        with open(cron_file, 'w') as f:
            f.write("# HOMESERVER Backup Cron Job\n")
            f.write("# Daily backup at 2 AM with random delay (0-59 minutes)\n")
            f.write("0 2 * * * www-data sleep $((RANDOM % 3600)) && /usr/bin/python3 /var/www/homeserver/backup/src/service/backup_service.py --backup >> /var/log/homeserver/backup.log 2>&1\n")
        print(f"Installed cron job: {cron_file}")
        
        # Create log directory
        log_dir = Path("/var/log/homeserver")
        log_dir.mkdir(parents=True, exist_ok=True)
        os.chown(log_dir, 33, 33)  # www-data user/group
        print(f"Created log directory: {log_dir}")
        
        # Reload systemd
        subprocess.run(["systemctl", "daemon-reload"], check=True)
        print("Reloaded systemd daemon")
        
        # Enable service
        subprocess.run(["systemctl", "enable", "homeserver-backup.service"], check=True)
        print("Enabled homeserver-backup.service")
        
        # Test service
        print("Testing backup service...")
        result = subprocess.run([
            "/usr/bin/python3", 
            str(install_dir / "src" / "service" / "backup_service.py"), 
            "--test"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Backup service test successful")
        else:
            print(f"✗ Backup service test failed: {result.stderr}")
        
        print("Backup service installation completed successfully!")
        return True
        
    except Exception as e:
        print(f"ERROR: Installation failed: {e}")
        return False

def uninstall_backup_service():
    """Uninstall the backup service."""
    print("Uninstalling HOMESERVER Backup Service...")
    
    try:
        # Stop and disable service
        subprocess.run(["systemctl", "stop", "homeserver-backup.service"], check=False)
        subprocess.run(["systemctl", "disable", "homeserver-backup.service"], check=False)
        
        # Remove service file
        service_file = Path("/etc/systemd/system/homeserver-backup.service")
        if service_file.exists():
            service_file.unlink()
            print("Removed systemd service file")
        
        # Remove cron job
        cron_file = Path("/etc/cron.d/homeserver-backup")
        if cron_file.exists():
            cron_file.unlink()
            print("Removed cron job")
        
        # Reload systemd
        subprocess.run(["systemctl", "daemon-reload"], check=True)
        print("Reloaded systemd daemon")
        
        print("Backup service uninstalled successfully!")
        return True
        
    except Exception as e:
        print(f"ERROR: Uninstallation failed: {e}")
        return False

def main():
    """Main installer entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="HOMESERVER Backup Service Installer")
    parser.add_argument("--uninstall", action="store_true", help="Uninstall the service")
    
    args = parser.parse_args()
    
    if args.uninstall:
        success = uninstall_backup_service()
    else:
        success = install_backup_service()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
