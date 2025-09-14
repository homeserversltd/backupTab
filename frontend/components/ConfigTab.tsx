/**
 * HOMESERVER Backup Config Tab Component
 * Backup configuration and file management
 */

import React, { useState, useEffect } from 'react';
import { BackupConfig } from '../types';
import { useTooltip } from '../../../hooks/useTooltip'; //donot touch this
import { showToast } from '../../../components/Popup/PopupManager'; //donot touch this

interface ConfigTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  onConfigUpdate?: (config: BackupConfig) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  updateConfig,
  onConfigUpdate
}) => {
  const [newFilePath, setNewFilePath] = useState('');
  const [encryptionEnabled, setEncryptionEnabled] = useState(config?.encryption_enabled || false);
  const [encryptionKey, setEncryptionKey] = useState(config?.encryption_key || '');
  const [encryptionSalt, setEncryptionSalt] = useState(config?.encryption_salt || '');
  const [version, setVersion] = useState<string>('1.0.0');

  const tooltip = useTooltip();

  // Load version info on component mount
  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      const response = await fetch('/api/backup/version');
      const data = await response.json();
      if (data.success) {
        setVersion(data.data.version);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load version info';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };


  const handleAddFile = async () => {
    if (!newFilePath.trim() || !config) return;
    
    try {
      const updatedConfig = {
        ...config,
        backup_items: [...(config.backup_items || []), newFilePath.trim()]
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        showToast({
          message: 'File added to backup list successfully',
          variant: 'success',
          duration: 3000
        });
        setNewFilePath('');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add file to backup list';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  const handleRemoveFile = async (index: number) => {
    if (!config) return;
    
    try {
      const updatedConfig = {
        ...config,
        backup_items: config.backup_items?.filter((_, i) => i !== index) || []
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        showToast({
          message: 'File removed from backup list successfully',
          variant: 'success',
          duration: 3000
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove file from backup list';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    try {
      const updatedConfig = {
        ...config,
        encryption_enabled: encryptionEnabled,
        encryption_key: encryptionKey || null,
        encryption_salt: encryptionSalt || null
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        showToast({
          message: 'Configuration saved successfully',
          variant: 'success',
          duration: 3000
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  const handleResetToDefaults = () => {
    setEncryptionEnabled(false);
    setEncryptionKey('');
    setEncryptionSalt('');
    showToast({
      message: 'Settings reset to defaults',
      variant: 'info',
      duration: 3000
    });
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

        {/* Encryption Settings */}
        <div className="config-section">
          <h4>Encryption Settings</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <div className="checkbox-container">
                {tooltip.show(
                  'For every provider, we will encrypt all of your data before delivering it to the backup provider',
                  <>
                    <input
                      id="encryption-enabled"
                      type="checkbox"
                      checked={encryptionEnabled}
                      onChange={(e) => setEncryptionEnabled(e.target.checked)}
                    />
                    <label htmlFor="encryption-enabled">Enable Encryption</label>
                  </>
                )}
              </div>
            </div>
            {encryptionEnabled && (
              <>
                <div className="setting-item">
                  <label htmlFor="encryption-key">Encryption Key</label>
                  <input
                    id="encryption-key"
                    type="password"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="form-input"
                  />
                  <small className="field-help">
                    Leave empty to auto-generate a secure key
                  </small>
                </div>
                <div className="setting-item">
                  <label htmlFor="encryption-salt">Encryption Salt</label>
                  <input
                    id="encryption-salt"
                    type="password"
                    value={encryptionSalt}
                    onChange={(e) => setEncryptionSalt(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="form-input"
                  />
                  <small className="field-help">
                    Leave empty to auto-generate a secure salt
                  </small>
                </div>
              </>
            )}
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
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigTab;
