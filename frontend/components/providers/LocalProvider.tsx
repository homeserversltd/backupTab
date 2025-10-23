/**
 * HOMESERVER Backup Local Provider Component
 * Local filesystem backup configuration
 */

import React, { useState, useEffect } from 'react';
import { CloudProvider } from '../../types';
import { showToast } from '../../../../../components/Popup/PopupManager';

interface LocalProviderProps {
  config: CloudProvider | null;
  onConfigChange: (config: Partial<CloudProvider>) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
}

export const LocalProvider: React.FC<LocalProviderProps> = ({
  config,
  onConfigChange,
  onSave,
  isLoading = false
}) => {
  const [localConfig, setLocalConfig] = useState<Partial<CloudProvider>>({});

  // Initialize local config when prop changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleFieldChange = (field: keyof CloudProvider, value: string | boolean | number | null) => {
    const updatedConfig = {
      ...localConfig,
      [field]: value
    };
    setLocalConfig(updatedConfig);
    onConfigChange(updatedConfig);
  };

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save Local provider configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  return (
    <div className="local-provider">
      <div className="provider-header">
        <h4>Local Filesystem Configuration</h4>
        <p className="provider-description">
          Configure local filesystem storage for your backups
        </p>
      </div>

      <div className="config-form">
        {/* Storage Path Section */}
        <div className="config-section">
          <h5>Storage Settings</h5>
          <div className="form-group">
            <label htmlFor="container">
              NAS Backup Directory <span className="required">*</span>
            </label>
            <input
              id="path"
              type="text"
              value={localConfig.container || '/mnt/nas/backups/homeserver'}
              onChange={(e) => handleFieldChange('container', e.target.value)}
              placeholder="/mnt/nas/backups/homeserver"
              className="form-input"
            />
            <small className="field-help">
              Absolute path to the NAS directory where encrypted backup tarballs will be stored
            </small>
          </div>

        </div>

        {/* Backup Process Information */}
        <div className="config-section">
          <div className="info-summary-item">
            <div className="info-icon">⚙️</div>
            <div className="info-content">
              <div className="info-title">Backup Process</div>
              <div className="info-description">Creates compressed tarballs from configured items and stores them on NAS</div>
            </div>
          </div>
        </div>


        {/* Storage Requirements */}
        <div className="config-section">
          <div className="info-summary-item">
            <div className="info-icon">💾</div>
            <div className="info-content">
              <div className="info-title">Storage Requirements</div>
              <div className="info-description">Ensure sufficient NAS disk space for backup tarballs - local redundancy only</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="action-button primary"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalProvider;
