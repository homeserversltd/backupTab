/**
 * HOMESERVER Backup Google Cloud Storage Provider Component
 * Google Cloud Storage configuration with keyman integration
 */

import React, { useState, useEffect } from 'react';
import { CloudProvider } from '../../types';
import { showToast } from '../../../../components/Popup/PopupManager'; //do not touch this

interface GoogleCloudStorageProviderProps {
  config: CloudProvider | null;
  onConfigChange: (config: Partial<CloudProvider>) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
  isKeymanConfigured?: boolean;
  onKeymanCredentialsChange?: (credentials: { username: string; password: string }) => void;
}

export const GoogleCloudStorageProvider: React.FC<GoogleCloudStorageProviderProps> = ({
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to save Google Cloud Storage configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  return (
    <div className="google-cloud-storage-provider">
      <div className="provider-header">
        <h4>Google Cloud Storage Configuration</h4>
        <p className="provider-description">
          Configure Google Cloud Storage for your backups
        </p>
      </div>

      <div className="config-form">
        {/* Main Configuration Section */}
        <div className="config-section">
          <div className="form-group">
            <label htmlFor="service_account_key">
              Service Account Key <span className="required">*</span>
            </label>
            <textarea
              id="service_account_key"
              value={isKeymanConfigured ? '********************' : (localConfig.service_account_key || '')}
              onChange={(e) => handleFieldChange('service_account_key', e.target.value)}
              placeholder='{"type": "service_account", "project_id": "your-project", ...}'
              className="form-textarea"
              rows={6}
              disabled={isKeymanConfigured}
            />
            <small className="field-help">
              JSON service account key file content. Download from Google Cloud Console → IAM & Admin → Service Accounts
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="project_id">
              Project ID <span className="required">*</span>
            </label>
            <input
              id="project_id"
              type="text"
              value={localConfig.project_id || ''}
              onChange={(e) => handleFieldChange('project_id', e.target.value)}
              placeholder="your-project-id"
              className="form-input"
            />
            <small className="field-help">
              Google Cloud Project ID where your storage bucket is located
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
              Google Cloud Storage bucket name (3-63 characters, lowercase letters, numbers, hyphens, and periods)
            </small>
          </div>
        </div>

        <div className="config-section">
          <div className="form-group">
            <label htmlFor="region">Region</label>
            <select
              id="region"
              value={localConfig.region || 'us-central1'}
              onChange={(e) => handleFieldChange('region', e.target.value)}
              className="form-select"
            >
              <option value="us-central1">US Central (Iowa)</option>
              <option value="us-east1">US East (South Carolina)</option>
              <option value="us-east4">US East (N. Virginia)</option>
              <option value="us-west1">US West (Oregon)</option>
              <option value="us-west2">US West (Los Angeles)</option>
              <option value="us-west3">US West (Salt Lake City)</option>
              <option value="us-west4">US West (Las Vegas)</option>
              <option value="europe-west1">Europe West (Belgium)</option>
              <option value="europe-west2">Europe West (London)</option>
              <option value="europe-west3">Europe West (Frankfurt)</option>
              <option value="europe-west4">Europe West (Netherlands)</option>
              <option value="europe-west6">Europe West (Zurich)</option>
              <option value="asia-east1">Asia East (Taiwan)</option>
              <option value="asia-east2">Asia East (Hong Kong)</option>
              <option value="asia-northeast1">Asia Northeast (Tokyo)</option>
              <option value="asia-northeast2">Asia Northeast (Osaka)</option>
              <option value="asia-northeast3">Asia Northeast (Seoul)</option>
              <option value="asia-south1">Asia South (Mumbai)</option>
              <option value="asia-southeast1">Asia Southeast (Singapore)</option>
              <option value="asia-southeast2">Asia Southeast (Jakarta)</option>
              <option value="australia-southeast1">Australia Southeast (Sydney)</option>
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

export default GoogleCloudStorageProvider;
