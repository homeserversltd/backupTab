/**
 * HOMESERVER Backup Config Tab Component
 * Backup configuration and file management
 */

import React, { useState, useEffect } from 'react';
import { BackupConfig } from '../types';

interface ConfigTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  updateConfig
}) => {
  const [newFilePath, setNewFilePath] = useState('');
  const [retentionDays, setRetentionDays] = useState(config?.retention_days || 30);
  const [encryptionEnabled, setEncryptionEnabled] = useState(config?.encryption_enabled || false);
  const [logLevel, setLogLevel] = useState(config?.logging?.log_level || 'INFO');
  const [version, setVersion] = useState<string>('1.0.0');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Load version and auto-update status on component mount
  useEffect(() => {
    loadVersionInfo();
    loadAutoUpdateStatus();
  }, []);

  const loadVersionInfo = async () => {
    try {
      const response = await fetch('/api/backup/version');
      const data = await response.json();
      if (data.success) {
        setVersion(data.data.version);
      }
    } catch (error) {
      console.error('Failed to load version info:', error);
    }
  };

  const loadAutoUpdateStatus = async () => {
    try {
      const response = await fetch('/api/backup/auto-update/status');
      const data = await response.json();
      if (data.success) {
        setAutoUpdateEnabled(data.data.enabled);
        setLastUpdateCheck(data.data.last_check || '');
        setUpdateAvailable(data.data.update_available || false);
      }
    } catch (error) {
      console.error('Failed to load auto-update status:', error);
    }
  };

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/backup/auto-update/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });
      
      const data = await response.json();
      if (data.success) {
        setAutoUpdateEnabled(enabled);
        if (enabled) {
          // Trigger an immediate update check when enabling
          checkForUpdates();
        }
      } else {
        console.error('Failed to toggle auto-update:', data.error);
      }
    } catch (error) {
      console.error('Failed to toggle auto-update:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/backup/auto-update/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setLastUpdateCheck(data.data.last_check);
        setUpdateAvailable(data.data.update_available);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleAddFile = () => {
    if (!newFilePath.trim() || !config) return;
    
    const updatedConfig = {
      ...config,
      backup_items: [...(config.backup_items || []), newFilePath.trim()]
    };
    
    updateConfig(updatedConfig);
    setNewFilePath('');
  };

  const handleRemoveFile = (index: number) => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      backup_items: config.backup_items?.filter((_, i) => i !== index) || []
    };
    
    updateConfig(updatedConfig);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      retention_days: retentionDays,
      encryption_enabled: encryptionEnabled,
      logging: {
        ...config.logging,
        log_level: logLevel
      }
    };
    
    await updateConfig(updatedConfig);
  };

  const handleResetToDefaults = () => {
    setRetentionDays(30);
    setEncryptionEnabled(false);
    setLogLevel('INFO');
  };

  if (!config) {
    return (
      <div className="config-tab">
        <div className="loading-state">
          <span>Loading backup configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="config-tab">
      <div className="config-panel">
        <h3>Backup Configuration</h3>
        
        <div className="config-section">
          <h4>Files & Directories to Backup</h4>
          <div className="file-selection">
            <div className="file-input-group">
              <input
                type="text"
                placeholder="Enter file or directory path"
                className="file-path-input"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFile()}
              />
              <button 
                className="action-button secondary"
                onClick={handleAddFile}
                disabled={!newFilePath.trim()}
              >
                Add
              </button>
            </div>
            <div className="file-list">
              {config.backup_items?.map((item, index) => (
                <div key={index} className="file-item">
                  <span className="file-path">{item}</span>
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveFile(index)}
                    title="Remove file from backup list"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="config-section">
          <h4>Backup Settings</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label htmlFor="retention-days">Retention Days</label>
              <input
                id="retention-days"
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
                placeholder="30"
              />
            </div>
            <div className="setting-item">
              <div className="checkbox-container">
                <input
                  id="encryption-enabled"
                  type="checkbox"
                  checked={encryptionEnabled}
                  onChange={(e) => setEncryptionEnabled(e.target.checked)}
                />
                <label htmlFor="encryption-enabled">Enable Encryption</label>
              </div>
            </div>
            <div className="setting-item">
              <label htmlFor="log-level">Log Level</label>
              <select 
                id="log-level"
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
              >
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="config-actions">
          <button 
            className="action-button primary"
            onClick={handleSaveConfig}
          >
            Save Configuration
          </button>
          <button 
            className="action-button secondary"
            onClick={handleResetToDefaults}
          >
            Reset to Defaults
          </button>
        </div>

        {/* About Section */}
        <div className="config-section">
          <h4>About & Updates</h4>
          <div className="about-content">
            <div className="about-info">
              <div className="info-item">
                <strong>Version:</strong> {version}
              </div>
              <div className="info-item">
                <strong>Tab Name:</strong> backupTab
              </div>
              <div className="info-item">
                <strong>Description:</strong> HOMESERVER Professional Backup System
              </div>
              {lastUpdateCheck && (
                <div className="info-item">
                  <strong>Last Update Check:</strong> {new Date(lastUpdateCheck).toLocaleString()}
                </div>
              )}
              {updateAvailable && (
                <div className="info-item update-available">
                  <strong>Update Available:</strong> <span className="update-badge">New version available</span>
                </div>
              )}
            </div>
            
            <div className="auto-update-controls">
              <div className="setting-item">
                <div className="checkbox-container">
                  <input
                    id="auto-update-enabled"
                    type="checkbox"
                    checked={autoUpdateEnabled}
                    onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
                  />
                  <label htmlFor="auto-update-enabled">Enable Auto-Update</label>
                </div>
                <p className="setting-description">
                  Automatically check for and apply updates to the backup tab
                </p>
              </div>
              
              <div className="update-actions">
                <button 
                  className="action-button secondary"
                  onClick={checkForUpdates}
                >
                  Check for Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigTab;
