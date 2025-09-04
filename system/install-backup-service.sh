#!/bin/bash
# HOMESERVER Backup Service Installation Script
# Installs systemd service and timer for backup automation

set -e

echo "=========================================="
echo "HOMESERVER Backup Service Installation"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root for systemd service installation."
   echo "Please run: sudo $0"
   exit 1
fi

# Create homeserver user if it doesn't exist
if ! id "homeserver" &>/dev/null; then
    echo "Creating homeserver user..."
    useradd -r -s /bin/bash -d /opt/homeserver-backup -m homeserver
    echo "✓ homeserver user created"
else
    echo "✓ homeserver user already exists"
fi

# Create backup directory structure
BACKUP_DIR="/opt/homeserver-backup"
echo "Creating backup directory structure..."
mkdir -p "$BACKUP_DIR"
mkdir -p "/tmp/homeserver-backups"
mkdir -p "/var/log/homeserver-backup"

# Set ownership
chown -R homeserver:homeserver "$BACKUP_DIR"
chown -R homeserver:homeserver "/tmp/homeserver-backups"
chown -R homeserver:homeserver "/var/log/homeserver-backup"

echo "✓ Directory structure created"

# Install systemd service and timer
echo "Installing systemd service..."
cp homeserver-backup.service /etc/systemd/system/
cp homeserver-backup.timer /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

echo "✓ Systemd service installed"

# Set up logrotate
echo "Setting up log rotation..."
cat > /etc/logrotate.d/homeserver-backup << 'EOF'
/var/log/homeserver-backup/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 homeserver homeserver
    postrotate
        systemctl reload homeserver-backup.service > /dev/null 2>&1 || true
    endscript
}
EOF

echo "✓ Log rotation configured"

# Create backup state file
touch "$BACKUP_DIR/backup_state.json"
chown homeserver:homeserver "$BACKUP_DIR/backup_state.json"

echo "✓ Backup state file created"

# Enable and start the timer
echo "Enabling backup timer..."
systemctl enable homeserver-backup.timer
systemctl start homeserver-backup.timer

echo "✓ Backup timer enabled and started"

# Show status
echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
systemctl status homeserver-backup.timer --no-pager
echo ""
echo "Next steps:"
echo "1. Install the backup CLI at: $BACKUP_DIR"
echo "2. Create configuration file: $BACKUP_DIR/config.yaml"
echo "3. Test the service:"
echo "   sudo -u homeserver python3 $BACKUP_DIR/homeserver_backup_service.py --discover-repos"
echo ""
echo "Service Management:"
echo "  Start timer:    systemctl start homeserver-backup.timer"
echo "  Stop timer:     systemctl stop homeserver-backup.timer"
echo "  Enable timer:   systemctl enable homeserver-backup.timer"
echo "  Disable timer:  systemctl disable homeserver-backup.timer"
echo "  Check status:   systemctl status homeserver-backup.timer"
echo ""
echo "Backup directory: $BACKUP_DIR"
echo "Logs: journalctl -u homeserver-backup.service"
echo ""
echo "This is a professional-grade backup system for HOMESERVER infrastructure."
echo "Configure it properly and maintain your own security practices."
echo ""
echo "=========================================="
