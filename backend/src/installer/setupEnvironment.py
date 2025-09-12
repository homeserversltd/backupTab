#!/usr/bin/env python3
"""
HOMESERVER Backup System Environment Setup
Copyright (C) 2024 HOMESERVER LLC

Sets up virtual environment and installs all dependencies for the backup system.
"""

import os
import sys
import shutil
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from typing import List, Dict, Any, Optional


class BackupEnvironmentSetup:
    """Environment setup for HOMESERVER Backup System."""
    
    def __init__(self):
        self.install_dir = Path("/var/www/homeserver/premium/backup")
        self.venv_dir = self.install_dir / "venv"
        self.source_dir = Path(__file__).parent.parent.parent  # Go up to backend directory
        self.log_dir = Path("/var/log/homeserver")
        self.cron_file = Path("/etc/cron.d/homeserver-backup")
        
        # Requirements files
        self.requirements_files = [
            self.source_dir / "requirements.txt",
            self.source_dir / "src" / "installer" / "requirements.txt"
        ]
        
        # Check for root privileges
        self.has_root = os.geteuid() == 0
        
    def log(self, message: str, level: str = "INFO") -> None:
        """Log installation messages."""
        prefix = {
            "INFO": "✓",
            "WARNING": "⚠",
            "ERROR": "✗",
            "DEBUG": "→"
        }.get(level, "•")
        
        print(f"{prefix} {message}")
    
    def check_python_version(self) -> bool:
        """Check if Python version is compatible."""
        if sys.version_info < (3, 7):
            self.log("Python 3.7+ is required for HOMESERVER Backup System", "ERROR")
            return False
        
        self.log(f"Python version {sys.version.split()[0]} is compatible")
        return True
    
    def check_system_requirements(self) -> bool:
        """Check system requirements."""
        self.log("Checking system requirements...")
        
        # Check Python version
        if not self.check_python_version():
            return False
        
        # Check for required system tools
        required_tools = ["python3", "pip3"]
        missing_tools = []
        
        for tool in required_tools:
            if not shutil.which(tool):
                missing_tools.append(tool)
        
        if missing_tools:
            self.log(f"Missing required tools: {', '.join(missing_tools)}", "ERROR")
            self.log("Please install missing tools and try again", "ERROR")
            return False
        
        # Check for venv module
        try:
            import venv
            self.log("Python venv module available")
        except ImportError:
            self.log("Python venv module not available", "ERROR")
            self.log("Please install python3-venv package", "ERROR")
            return False
        
        return True
    
    def create_virtual_environment(self) -> bool:
        """Create virtual environment for backup system."""
        self.log("Creating virtual environment...")
        
        try:
            # Remove existing venv if it exists
            if self.venv_dir.exists():
                self.log("Removing existing virtual environment")
                shutil.rmtree(self.venv_dir)
            
            # Create new virtual environment
            import venv
            venv.create(self.venv_dir, with_pip=True, clear=True)
            
            self.log(f"Virtual environment created at {self.venv_dir}")
            return True
            
        except Exception as e:
            self.log(f"Failed to create virtual environment: {e}", "ERROR")
            return False
    
    def get_venv_python(self) -> Path:
        """Get path to Python executable in virtual environment."""
        if sys.platform == "win32":
            return self.venv_dir / "Scripts" / "python.exe"
        else:
            return self.venv_dir / "bin" / "python"
    
    def get_venv_pip(self) -> Path:
        """Get path to pip executable in virtual environment."""
        if sys.platform == "win32":
            return self.venv_dir / "Scripts" / "pip.exe"
        else:
            return self.venv_dir / "bin" / "pip"
    
    def upgrade_pip(self) -> bool:
        """Upgrade pip in virtual environment."""
        self.log("Upgrading pip in virtual environment...")
        
        try:
            pip_path = self.get_venv_pip()
            result = subprocess.run([
                str(pip_path), "install", "--upgrade", "pip"
            ], capture_output=True, text=True, check=True)
            
            self.log("Pip upgraded successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log(f"Failed to upgrade pip: {e.stderr}", "ERROR")
            return False
    
    def install_requirements_from_file(self, requirements_file: Path, description: str) -> bool:
        """Install Python requirements from file in virtual environment."""
        if not requirements_file.exists():
            self.log(f"Requirements file not found: {requirements_file}", "WARNING")
            return True
            
        self.log(f"Installing {description} from {requirements_file}...")
        
        try:
            pip_path = self.get_venv_pip()
            
            result = subprocess.run([
                str(pip_path), "install", "-r", str(requirements_file)
            ], capture_output=True, text=True, check=True)
            
            self.log(f"{description} installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log(f"Failed to install {description}: {e.stderr}", "WARNING")
            # Don't fail for optional dependencies
            self.log("Some optional dependencies may be unavailable", "WARNING")
            return True
    
    def install_core_dependencies_fallback(self) -> bool:
        """Install essential dependencies as fallback if requirements files fail."""
        self.log("Installing core dependencies as fallback...")
        
        core_deps = ["cryptography>=3.4.8"]
        
        try:
            pip_path = self.get_venv_pip()
            
            for dep in core_deps:
                self.log(f"Installing {dep}", "DEBUG")
                result = subprocess.run([
                    str(pip_path), "install", dep
                ], capture_output=True, text=True, check=True)
            
            self.log("Core dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log(f"Failed to install core dependencies: {e.stderr}", "ERROR")
            return False
    
    def install_all_dependencies(self) -> bool:
        """Install all Python dependencies from requirements files."""
        self.log("Installing Python dependencies...")
        
        # Upgrade pip first
        if not self.upgrade_pip():
            return False
        
        # Try to install from requirements files
        any_success = False
        for requirements_file in self.requirements_files:
            if requirements_file.exists():
                description = f"dependencies from {requirements_file.name}"
                if self.install_requirements_from_file(requirements_file, description):
                    any_success = True
            else:
                self.log(f"Requirements file not found: {requirements_file}", "WARNING")
        
        # If no requirements files worked, install core dependencies
        if not any_success:
            self.log("No requirements files found or failed, installing core dependencies", "WARNING")
            return self.install_core_dependencies_fallback()
        
        return True
    
    def copy_source_files(self) -> bool:
        """Copy source files to installation directory."""
        self.log("Copying source files...")
        
        try:
            # Create installation directory
            self.install_dir.mkdir(parents=True, exist_ok=True)
            
            # Files and directories to copy
            items_to_copy = [
                "backup",
                "src",
                "requirements.txt"
            ]
            
            for item in items_to_copy:
                source_path = self.source_dir / item
                dest_path = self.install_dir / item
                
                if not source_path.exists():
                    self.log(f"Source item not found: {source_path}", "WARNING")
                    continue
                
                if source_path.is_dir():
                    if dest_path.exists():
                        shutil.rmtree(dest_path)
                    shutil.copytree(source_path, dest_path)
                    self.log(f"Copied directory {item}")
                else:
                    shutil.copy2(source_path, dest_path)
                    self.log(f"Copied file {item}")
            
            return True
            
        except Exception as e:
            self.log(f"Failed to copy source files: {e}", "ERROR")
            return False
    
    def create_wrapper_script(self) -> bool:
        """Create wrapper script that uses virtual environment."""
        self.log("Creating wrapper script...")
        
        try:
            wrapper_script = self.install_dir / "backup-venv"
            venv_python = self.get_venv_python()
            backup_script = self.install_dir / "backup"
            
            wrapper_content = f"""#!/bin/bash
# HOMESERVER Backup System Wrapper Script
# Uses virtual environment for dependencies

set -e

VENV_PYTHON="{venv_python}"
BACKUP_SCRIPT="{backup_script}"

# Check if virtual environment exists
if [ ! -f "$VENV_PYTHON" ]; then
    echo "ERROR: Virtual environment not found at $VENV_PYTHON"
    echo "Please reinstall the backup system using: backup --install"
    exit 1
fi

# Run backup script with virtual environment Python
exec "$VENV_PYTHON" "$BACKUP_SCRIPT" "$@"
"""
            
            with open(wrapper_script, 'w') as f:
                f.write(wrapper_content)
            
            # Make wrapper executable
            os.chmod(wrapper_script, 0o755)
            
            self.log(f"Wrapper script created: {wrapper_script}")
            return True
            
        except Exception as e:
            self.log(f"Failed to create wrapper script: {e}", "ERROR")
            return False
    
    def set_permissions(self) -> bool:
        """Set proper permissions on installed files."""
        self.log("Setting file permissions...")
        
        try:
            # Make main scripts executable
            scripts = [
                self.install_dir / "backup",
                self.install_dir / "backup-venv",
                self.install_dir / "src" / "service" / "backup_service.py",
            ]
            
            for script in scripts:
                if script.exists():
                    os.chmod(script, 0o755)
                    self.log(f"Made executable: {script.name}")
            
            # Set ownership if running as root
            if self.has_root:
                try:
                    # Change ownership to www-data
                    shutil.chown(self.install_dir, user="www-data", group="www-data")
                    for root, dirs, files in os.walk(self.install_dir):
                        for d in dirs:
                            shutil.chown(os.path.join(root, d), user="www-data", group="www-data")
                        for f in files:
                            shutil.chown(os.path.join(root, f), user="www-data", group="www-data")
                    self.log("Set ownership to www-data")
                except Exception as e:
                    self.log(f"Warning: Could not set ownership: {e}", "WARNING")
            
            return True
            
        except Exception as e:
            self.log(f"Failed to set permissions: {e}", "ERROR")
            return False
    
    def create_log_directory(self) -> bool:
        """Create log directory with proper permissions."""
        self.log("Creating log directory...")
        
        try:
            self.log_dir.mkdir(parents=True, exist_ok=True)
            
            if self.has_root:
                try:
                    shutil.chown(self.log_dir, user="www-data", group="www-data")
                    self.log(f"Log directory created: {self.log_dir}")
                except Exception as e:
                    self.log(f"Warning: Could not set log directory ownership: {e}", "WARNING")
            
            return True
            
        except Exception as e:
            self.log(f"Failed to create log directory: {e}", "ERROR")
            return False
    
    def create_system_config(self) -> bool:
        """Create system-wide configuration file from template."""
        self.log("Creating system configuration file...")
        
        try:
            # Create /etc/backupTab directory
            etc_backup_dir = Path("/etc/backupTab")
            etc_backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Paths for template and system config
            template_config = self.source_dir / "src" / "config" / "settings.json"
            system_config = etc_backup_dir / "settings.json"
            
            if not template_config.exists():
                self.log(f"Template config not found: {template_config}", "ERROR")
                return False
            
            # Copy template to system location if it doesn't exist
            if not system_config.exists():
                shutil.copy2(template_config, system_config)
                self.log(f"System config created: {system_config}")
            else:
                self.log(f"System config already exists: {system_config}")
            
            # Set proper permissions
            if self.has_root:
                try:
                    shutil.chown(system_config, user="www-data", group="www-data")
                    os.chmod(system_config, 0o644)
                    self.log("Set system config permissions")
                except Exception as e:
                    self.log(f"Warning: Could not set config permissions: {e}", "WARNING")
            
            return True
            
        except Exception as e:
            self.log(f"Failed to create system config: {e}", "ERROR")
            return False
    
    def install_cron_job(self) -> bool:
        """Install cron job for automated backups."""
        if not self.has_root:
            self.log("Skipping cron job installation (requires root)", "WARNING")
            return True
        
        self.log("Installing cron job...")
        
        try:
            venv_python = self.get_venv_python()
            service_script = self.install_dir / "src" / "service" / "backup_service.py"
            
            cron_content = f"""# HOMESERVER Backup Cron Job
# Daily backup at 2 AM with random delay (0-59 minutes)
0 2 * * * www-data sleep $((RANDOM % 3600)) && {venv_python} {service_script} --backup >> /var/log/homeserver/backup.log 2>&1
"""
            
            with open(self.cron_file, 'w') as f:
                f.write(cron_content)
            
            self.log(f"Cron job installed: {self.cron_file}")
            return True
            
        except Exception as e:
            self.log(f"Failed to install cron job: {e}", "ERROR")
            return False
    
    def create_system_links(self) -> bool:
        """Create system-wide links for easy access."""
        if not self.has_root:
            self.log("Skipping system links creation (requires root)", "WARNING")
            return True
        
        self.log("Creating system links...")
        
        try:
            # Create symlink in /usr/local/bin
            system_link = Path("/usr/local/bin/homeserver-backup")
            wrapper_script = self.install_dir / "backup-venv"
            
            if system_link.exists():
                system_link.unlink()
            
            system_link.symlink_to(wrapper_script)
            self.log(f"System link created: {system_link}")
            
            # Create symlink for settings updater
            updater_link = Path("/usr/local/bin/homeserver-backup-update-settings")
            updater_script = self.install_dir / "src" / "installer" / "updateSettings.py"
            
            if updater_link.exists():
                updater_link.unlink()
            
            updater_link.symlink_to(updater_script)
            self.log(f"Settings updater link created: {updater_link}")
            
            return True
            
        except Exception as e:
            self.log(f"Failed to create system links: {e}", "WARNING")
            return True  # Non-critical failure
    
    def test_installation(self) -> bool:
        """Test the installation."""
        self.log("Testing installation...")
        
        try:
            venv_python = self.get_venv_python()
            backup_script = self.install_dir / "backup"
            
            # Test backup CLI script
            result = subprocess.run([
                str(venv_python), str(backup_script), "list-providers"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("Installation test successful")
                return True
            else:
                self.log(f"Installation test failed: {result.stderr}", "WARNING")
                return True  # Don't fail installation for test failures
                
        except subprocess.TimeoutExpired:
            self.log("Installation test timed out (this is normal)", "WARNING")
            return True
        except Exception as e:
            self.log(f"Could not run installation test: {e}", "WARNING")
            return True
    
    def install(self) -> bool:
        """Run complete installation process."""
        self.log("Starting HOMESERVER Backup System installation...")
        
        # Check system requirements
        if not self.check_system_requirements():
            return False
        
        # Create virtual environment
        if not self.create_virtual_environment():
            return False
        
        # Install dependencies
        if not self.install_all_dependencies():
            return False
        
        # Copy source files
        if not self.copy_source_files():
            return False
        
        # Create wrapper script
        if not self.create_wrapper_script():
            return False
        
        # Set permissions
        if not self.set_permissions():
            return False
        
        # Create log directory
        if not self.create_log_directory():
            return False
        
        # Create system configuration
        if not self.create_system_config():
            return False
        
        # Install cron job
        if not self.install_cron_job():
            return False
        
        # Create system links
        if not self.create_system_links():
            return False
        
        # Test installation
        if not self.test_installation():
            return False
        
        self.log("Installation completed successfully!")
        self.log("")
        self.log("Usage:")
        self.log(f"  Direct: {self.install_dir}/backup-venv <command>")
        if self.has_root:
            self.log("  System: homeserver-backup <command>")
        self.log("")
        self.log("Examples:")
        self.log("  homeserver-backup create")
        self.log("  homeserver-backup list")
        self.log("  homeserver-backup test-providers")
        self.log("  homeserver-backup-update-settings --dry-run")
        
        return True
    
    def uninstall(self) -> bool:
        """Uninstall the backup system."""
        self.log("Uninstalling HOMESERVER Backup System...")
        
        try:
            # Remove cron job
            if self.cron_file.exists():
                self.cron_file.unlink()
                self.log("Removed cron job")
            
            # Remove system links
            system_link = Path("/usr/local/bin/homeserver-backup")
            if system_link.exists():
                system_link.unlink()
                self.log("Removed system link")
            
            updater_link = Path("/usr/local/bin/homeserver-backup-update-settings")
            if updater_link.exists():
                updater_link.unlink()
                self.log("Removed settings updater link")
            
            # Remove installation directory
            if self.install_dir.exists():
                shutil.rmtree(self.install_dir)
                self.log("Removed installation directory")
            
            self.log("Uninstallation completed successfully!")
            return True
            
        except Exception as e:
            self.log(f"Uninstallation failed: {e}", "ERROR")
            return False


def main():
    """Main environment setup entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="HOMESERVER Backup System Environment Setup")
    parser.add_argument("--uninstall", action="store_true", help="Uninstall the backup environment")
    parser.add_argument("--force", action="store_true", help="Force installation (skip some checks)")
    
    args = parser.parse_args()
    
    setup = BackupEnvironmentSetup()
    
    if args.uninstall:
        success = setup.uninstall()
    else:
        success = setup.install()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
