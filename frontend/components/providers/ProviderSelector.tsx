/**
 * HOMESERVER Backup Provider Selector Component
 * Left column provider selection and enable/disable controls
 */

import React from 'react';
import { BackupConfig } from '../../types';

interface ProviderSelectorProps {
  config: BackupConfig | null;
  selectedProvider: string;
  onProviderSelect: (provider: string) => void;
  onProviderToggle: (provider: string, enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  status: 'available' | 'future_development' | 'deprecated';
  icon: string;
}

const PROVIDER_INFO: Record<string, ProviderInfo> = {
  local: {
    name: 'local',
    displayName: 'Local Filesystem',
    description: 'Store backups on local disk',
    status: 'available',
    icon: '💾'
  },
  backblaze: {
    name: 'backblaze',
    displayName: 'Backblaze B2',
    description: 'Cloud storage with competitive pricing',
    status: 'available',
    icon: '☁️'
  },
  google_drive: {
    name: 'google_drive',
    displayName: 'Google Drive',
    description: 'Google Drive cloud storage',
    status: 'future_development',
    icon: '📁'
  },
  google_cloud_storage: {
    name: 'google_cloud_storage',
    displayName: 'Google Cloud Storage',
    description: 'Google Cloud Storage buckets',
    status: 'future_development',
    icon: '🗄️'
  },
  dropbox: {
    name: 'dropbox',
    displayName: 'Dropbox',
    description: 'Dropbox cloud storage',
    status: 'future_development',
    icon: '📦'
  }
};

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  config,
  selectedProvider,
  onProviderSelect,
  onProviderToggle,
  isLoading = false
}) => {
  const handleProviderClick = (provider: string) => {
    if (PROVIDER_INFO[provider]?.status === 'available') {
      onProviderSelect(provider);
    }
  };

  const handleToggleProvider = async (provider: string, enabled: boolean) => {
    await onProviderToggle(provider, enabled);
  };

  if (!config) {
    return (
      <div className="provider-selector">
        <div className="loading-state">
          <span>Loading providers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="provider-selector">
      <div className="selector-header">
        <h3>Providers</h3>
        <p className="selector-description">
          Select and configure backup storage providers
        </p>
      </div>

      <div className="provider-list">
        {Object.entries(PROVIDER_INFO).map(([key, info]) => {
          const providerConfig = config.providers[key];
          const isEnabled = providerConfig?.enabled || false;
          const isSelected = selectedProvider === key;
          const isAvailable = info.status === 'available';

          return (
            <div
              key={key}
              className={`provider-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
              onClick={() => handleProviderClick(key)}
            >
              <div className="provider-icon">{info.icon}</div>
              
              <div className="provider-info">
                <div className="provider-name">{info.displayName}</div>
                <div className="provider-description">{info.description}</div>
                
                {info.status === 'future_development' && (
                  <div className="provider-status future">
                    Coming Soon
                  </div>
                )}
                
                {info.status === 'available' && (
                  <div className="provider-status available">
                    Available
                  </div>
                )}
              </div>

              {isAvailable && (
                <div className="provider-controls">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleToggleProvider(key, e.target.checked)}
                      disabled={isLoading}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              )}

              {isSelected && isAvailable && (
                <div className="provider-indicator">
                  <span className="indicator-dot"></span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="selector-footer">
        <div className="provider-summary">
          <div className="summary-item">
            <span className="summary-label">Enabled:</span>
            <span className="summary-value">
              {Object.values(config.providers).filter(p => p.enabled).length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Available:</span>
            <span className="summary-value">
              {Object.values(PROVIDER_INFO).filter(p => p.status === 'available').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderSelector;
