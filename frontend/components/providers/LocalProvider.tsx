/**
 * HOMESERVER Backup Local Provider Component
 * Local filesystem backup configuration
 */

import React, { useState, useEffect } from 'react';
import { CloudProvider } from '../../types';
import { showToast } from '../../../../components/Popup/PopupManager'; //donot touch this

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
          <h5>Backup Process</h5>
          <div className="info-box">
            <div className="info-item">
              <strong>Target Sources:</strong> All items configured in the Overview tab
            </div>
            <div className="info-item">
              <strong>Process:</strong> Glob targets → Create tarball → Encrypt → Store on NAS
            </div>
            <div className="info-item">
              <strong>NAS Path:</strong> /mnt/nas/backups/homeserver (default)
            </div>
            <div className="info-item">
              <strong>Backup Format:</strong> Encrypted .tar.gz archives
            </div>
            <div className="info-item">
              <strong>Permissions:</strong> 755 (drwxr-xr-x)
            </div>
            <div className="info-item">
              <strong>Owner:</strong> root:root
            </div>
          </div>
        </div>


        {/* Storage Requirements */}
        <div className="config-section">
          <h5>Storage Requirements</h5>
          <div className="warning-box">
            <div className="warning-icon">⚠</div>
            <div className="warning-content">
              <strong>Important:</strong> Ensure sufficient NAS disk space is available for encrypted backup tarballs.
              NAS backups provide local redundancy but are not protected against site-wide disasters - consider using cloud providers for off-site redundancy.
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
