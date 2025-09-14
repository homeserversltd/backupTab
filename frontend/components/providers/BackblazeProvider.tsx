/**
 * HOMESERVER Backup Backblaze Provider Component
 * Backblaze B2 cloud storage configuration
 */

import React, { useState, useEffect } from 'react';
import { CloudProvider } from '../../types';
import { showToast } from '../../../../components/Popup/PopupManager'; //donot touch this

interface BackblazeProviderProps {
  config: CloudProvider | null;
  onConfigChange: (config: Partial<CloudProvider>) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
}

export const BackblazeProvider: React.FC<BackblazeProviderProps> = ({
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to save Backblaze configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  return (
    <div className="backblaze-provider">
      <div className="provider-header">
        <h4>Backblaze B2 Configuration</h4>
        <p className="provider-description">
          Configure Backblaze B2 cloud storage for your backups
        </p>
      </div>

      <div className="config-form">
        {/* Authentication Section */}
        <div className="config-section">
          <h5>Authentication</h5>
          <div className="form-group">
            <label htmlFor="application_key_id">
              Application Key ID <span className="required">*</span>
            </label>
            <input
              id="application_key_id"
              type="text"
              value={localConfig.application_key_id || ''}
              onChange={(e) => handleFieldChange('application_key_id', e.target.value)}
              placeholder="K12345678901234567890"
              className="form-input"
            />
            <small className="field-help">
              Your Backblaze B2 Application Key ID (starts with K, 20 characters)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="application_key">
              Application Key <span className="required">*</span>
            </label>
            <input
              id="application_key"
              type="password"
              value={localConfig.application_key || ''}
              onChange={(e) => handleFieldChange('application_key', e.target.value)}
              placeholder="K123456789012345678901234567890"
              className="form-input"
            />
            <small className="field-help">
              Your Backblaze B2 Application Key (starts with K, 32 characters)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="container">
              Bucket Name <span className="required">*</span>
            </label>
            <input
              id="container"
              type="text"
              value={localConfig.container || ''}
              onChange={(e) => handleFieldChange('container', e.target.value)}
              placeholder="homeserver-backups"
              className="form-input"
            />
            <small className="field-help">
              B2 bucket name (3-63 characters, alphanumeric and hyphens only)
            </small>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="config-section">
          <h5>Connection Settings</h5>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="region">Region</label>
              <select
                id="region"
                value={localConfig.region || 'us-west-000'}
                onChange={(e) => handleFieldChange('region', e.target.value)}
                className="form-select"
              >
                <option value="us-west-000">US West (Oregon)</option>
                <option value="us-west-001">US West (California)</option>
                <option value="us-west-002">US West (Nevada)</option>
                <option value="us-east-000">US East (Virginia)</option>
                <option value="us-east-001">US East (Ohio)</option>
                <option value="eu-central-000">EU Central (Frankfurt)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="max_retries">Max Retries</label>
              <input
                id="max_retries"
                type="number"
                min="1"
                max="10"
                value={localConfig.max_retries || 3}
                onChange={(e) => handleFieldChange('max_retries', parseInt(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="retry_delay">Retry Delay (seconds)</label>
              <input
                id="retry_delay"
                type="number"
                min="0.1"
                max="60.0"
                step="0.1"
                value={localConfig.retry_delay || 1.0}
                onChange={(e) => handleFieldChange('retry_delay', parseFloat(e.target.value))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="timeout">Timeout (seconds)</label>
              <input
                id="timeout"
                type="number"
                min="30"
                max="3600"
                value={localConfig.timeout || 300}
                onChange={(e) => handleFieldChange('timeout', parseInt(e.target.value))}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="config-section">
          <h5>Performance Settings</h5>
          <div className="form-group">
            <label htmlFor="max_bandwidth">Max Bandwidth (bytes/sec)</label>
            <input
              id="max_bandwidth"
              type="number"
              min="1024"
              value={localConfig.max_bandwidth || ''}
              onChange={(e) => handleFieldChange('max_bandwidth', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Leave empty for unlimited"
              className="form-input"
            />
            <small className="field-help">
              Bandwidth limit in bytes per second (leave empty for unlimited)
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="upload_chunk_size">Upload Chunk Size (bytes)</label>
              <input
                id="upload_chunk_size"
                type="number"
                min="1048576"
                max="1073741824"
                value={localConfig.upload_chunk_size || 104857600}
                onChange={(e) => handleFieldChange('upload_chunk_size', parseInt(e.target.value))}
                className="form-input"
              />
              <small className="field-help">
                Chunk size for large file uploads (1MB - 1GB)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="connection_pool_size">Connection Pool Size</label>
              <input
                id="connection_pool_size"
                type="number"
                min="1"
                max="20"
                value={localConfig.connection_pool_size || 5}
                onChange={(e) => handleFieldChange('connection_pool_size', parseInt(e.target.value))}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Encryption Settings */}
        <div className="config-section">
          <h5>Encryption Settings</h5>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={localConfig.encryption_enabled || false}
                onChange={(e) => handleFieldChange('encryption_enabled', e.target.checked)}
                className="form-checkbox"
              />
              <span>Enable client-side encryption</span>
            </label>
            <small className="field-help">
              Encrypt files before uploading to B2 (recommended for sensitive data)
            </small>
          </div>

          {localConfig.encryption_enabled && (
            <>
              <div className="form-group">
                <label htmlFor="encryption_key">Encryption Key</label>
                <input
                  id="encryption_key"
                  type="password"
                  value={localConfig.encryption_key || ''}
                  onChange={(e) => handleFieldChange('encryption_key', e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="form-input"
                />
                <small className="field-help">
                  Leave empty to auto-generate a secure key
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="encryption_salt">Encryption Salt</label>
                <input
                  id="encryption_salt"
                  type="password"
                  value={localConfig.encryption_salt || ''}
                  onChange={(e) => handleFieldChange('encryption_salt', e.target.value)}
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

export default BackblazeProvider;
