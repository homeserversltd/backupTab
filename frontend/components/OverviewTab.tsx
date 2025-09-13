/**
 * HOMESERVER Backup Overview Tab Component
 * Providers and backup files management
 */

import React, { useState } from 'react';
import { BackupConfig } from '../types';

interface OverviewTabProps {
  config: BackupConfig | null;
  onConfigChange: (config: Partial<BackupConfig>) => Promise<boolean>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  config,
  onConfigChange
}) => {
  const [newFilePath, setNewFilePath] = useState('');

  const handleAddFile = async () => {
    if (newFilePath.trim() && config) {
      const updatedItems = [...(config.backup_items || []), newFilePath.trim()];
      await onConfigChange({ backup_items: updatedItems });
      setNewFilePath('');
    }
  };

  const handleRemoveFile = async (index: number) => {
    if (config) {
      const updatedItems = config.backup_items?.filter((_, i) => i !== index) || [];
      await onConfigChange({ backup_items: updatedItems });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFile();
    }
  };

  return (
    <div className="overview-layout overview-container">
      {/* Left Column - Providers */}
      <div className="providers-panel">
        <div className="panel-header">
          <h3>Storage Providers</h3>
          <p className="panel-description">
            Configured backup storage providers
          </p>
        </div>
        
        <div className="provider-list">
          {config?.providers ? Object.entries(config.providers).map(([key, provider]) => (
            <div key={key} className={`provider-item ${provider.enabled ? 'enabled' : 'disabled'}`}>
              <div className="provider-icon">💾</div>
              <div className="provider-info">
                <div className="provider-name">{key}</div>
                <div className="provider-description">
                  {provider.container_type === 'local' ? 'Local NAS Storage' : 
                   provider.container_type === 'aws' ? 'AWS S3' :
                   provider.container_type === 'google' ? 'Google Drive' : 
                   provider.container_type || 'Cloud Storage'}
                </div>
                <div className={`provider-status ${provider.enabled ? 'enabled' : 'disabled'}`}>
                  {provider.enabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <p>No providers configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Backup Files */}
      <div className="files-panel">
        <div className="panel-header">
          <h3>Files to Backup</h3>
          <p className="panel-description">
            Files and directories to include in backups
          </p>
        </div>

        <div className="file-input-section">
          <div className="input-group">
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="/path/to/backup"
              className="form-input"
            />
            <button
              onClick={handleAddFile}
              disabled={!newFilePath.trim()}
              className="action-button primary"
            >
              Add
            </button>
          </div>
        </div>

        <div className="file-list">
          {config?.backup_items && config.backup_items.length > 0 ? (
            config.backup_items.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-icon">📁</div>
                <div className="file-info">
                  <div className="file-path">{file}</div>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="remove-button"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No files configured for backup</p>
            </div>
          )}
        </div>
      </div>

      {/* Version at bottom */}
      <div className="version-footer">
        <span>v1.0.0</span>
      </div>
    </div>
  );
};

export default OverviewTab;
