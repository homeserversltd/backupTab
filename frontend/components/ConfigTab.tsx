/**
 * HOMESERVER Backup Config Tab Component
 * Backup configuration and file management
 */

import React, { useState } from 'react';
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
              <label>Retention Days</label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
              />
            </div>
            <div className="setting-item">
              <label>Encryption</label>
              <input
                type="checkbox"
                checked={encryptionEnabled}
                onChange={(e) => setEncryptionEnabled(e.target.checked)}
              />
            </div>
            <div className="setting-item">
              <label>Log Level</label>
              <select 
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
      </div>
    </div>
  );
};

export default ConfigTab;
