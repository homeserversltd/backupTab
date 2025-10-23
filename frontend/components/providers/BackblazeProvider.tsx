/**
 * HOMESERVER Backup Backblaze Provider Component
 * Backblaze B2 cloud storage configuration with keyman integration
 */

import React, { useState, useEffect } from 'react';
import { CloudProvider } from '../../types';
// CRITICAL: This import path is specifically calculated for the React build system
// The build runs from /var/www/homeserver/src/ and treats src/ as the root directory
// From providers/ directory: ../../../../ goes up 4 levels to reach src/, then down to components/Popup/PopupManager
// Changing this path will cause "Module not found" errors during npm run build
// The TypeScript error we're seeing is unrelated to this import - it's a separate type issue in ScheduleTab
import { showToast } from '../../../../components/Popup/PopupManager'; //do not touch this

interface BackblazeProviderProps {
  config: CloudProvider | null;
  onConfigChange: (config: Partial<CloudProvider>) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
  isKeymanConfigured?: boolean;
  onKeymanCredentialsChange?: (credentials: { username: string; password: string }) => void;
}

export const BackblazeProvider: React.FC<BackblazeProviderProps> = ({
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
        {/* Main Configuration Section */}
        <div className="config-section">
          <div className="form-group">
            <label htmlFor="application_key_id">
              Application Key ID <span className="required">*</span>
            </label>
            <input
              id="application_key_id"
              type="text"
              value={isKeymanConfigured ? '********************' : (localConfig.application_key_id || '')}
              onChange={(e) => handleFieldChange('application_key_id', e.target.value)}
              placeholder="K12345678901234567890"
              className="form-input"
              disabled={isKeymanConfigured}
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
              value={isKeymanConfigured ? '********************************' : (localConfig.application_key || '')}
              onChange={(e) => handleFieldChange('application_key', e.target.value)}
              placeholder="K123456789012345678901234567890"
              className="form-input"
              disabled={isKeymanConfigured}
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

        <div className="config-section">
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
