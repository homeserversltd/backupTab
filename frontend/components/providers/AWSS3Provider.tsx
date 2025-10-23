/**
 * HOMESERVER Backup AWS S3 Provider Component
 * AWS S3 cloud storage configuration with keyman integration
 */

import React, { useState, useEffect } from 'react';
import { CloudProvider } from '../../types';
import { showToast } from '../../../../src/components/Popup/PopupManager'; //do not touch this

interface AWSS3ProviderProps {
  config: CloudProvider | null;
  onConfigChange: (config: Partial<CloudProvider>) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
  isKeymanConfigured?: boolean;
  onKeymanCredentialsChange?: (credentials: { username: string; password: string }) => void;
}

export const AWSS3Provider: React.FC<AWSS3ProviderProps> = ({
  config,
  onConfigChange,
  onSave,
  isLoading = false,
  isKeymanConfigured = false,
  onKeymanCredentialsChange
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to save AWS S3 configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  return (
    <div className="aws-s3-provider">
      <div className="provider-header">
        <h4>AWS S3 Configuration</h4>
        <p className="provider-description">
          Configure AWS S3 cloud storage for your backups
        </p>
      </div>

      <div className="config-form">
        {/* Main Configuration Section */}
        <div className="config-section">
          <div className="form-group">
            <label htmlFor="access_key">
              Access Key ID <span className="required">*</span>
            </label>
            <input
              id="access_key"
              type="text"
              value={isKeymanConfigured ? '********************' : (localConfig.access_key || '')}
              onChange={(e) => handleFieldChange('access_key', e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className="form-input"
              disabled={isKeymanConfigured}
            />
            <small className="field-help">
              Your AWS Access Key ID (starts with AKIA, 20 characters)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="secret_key">
              Secret Access Key <span className="required">*</span>
            </label>
            <input
              id="secret_key"
              type="password"
              value={isKeymanConfigured ? '********************************' : (localConfig.secret_key || '')}
              onChange={(e) => handleFieldChange('secret_key', e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              className="form-input"
              disabled={isKeymanConfigured}
            />
            <small className="field-help">
              Your AWS Secret Access Key (40 characters)
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
              S3 bucket name (3-63 characters, lowercase letters, numbers, hyphens, and periods)
            </small>
          </div>
        </div>

        <div className="config-section">
          <div className="form-group">
            <label htmlFor="region">Region</label>
            <select
              id="region"
              value={localConfig.region || 'us-east-1'}
              onChange={(e) => handleFieldChange('region', e.target.value)}
              className="form-select"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-east-2">US East (Ohio)</option>
              <option value="us-west-1">US West (N. California)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="eu-west-2">Europe (London)</option>
              <option value="eu-central-1">Europe (Frankfurt)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
              <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
            </select>
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

export default AWSS3Provider;
