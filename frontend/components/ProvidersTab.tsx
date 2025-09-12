/**
 * HOMESERVER Backup Providers Tab Component
 * Cloud provider configuration and management
 */

import React, { useState, useEffect } from 'react';
import { BackupConfig } from '../types';

interface ProvidersTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  config,
  updateConfig
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('backblaze');
  const [providerConfig, setProviderConfig] = useState<Record<string, any>>({});

  // Load provider config when provider changes
  useEffect(() => {
    if (config?.providers[selectedProvider]) {
      setProviderConfig(config.providers[selectedProvider]);
    }
  }, [selectedProvider, config]);

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
  };

  const handleProviderConfigChange = (key: string, value: string) => {
    setProviderConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveProviderConfig = async () => {
    if (!config) return;
    
    try {
      const updatedConfig = {
        ...config,
        providers: {
          ...config.providers,
          [selectedProvider]: {
            ...config.providers[selectedProvider],
            ...providerConfig
          }
        }
      };
      
      await updateConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to save provider config:', err);
    }
  };

  if (!config) {
    return (
      <div className="providers-tab">
        <div className="loading-state">
          <span>Loading provider configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="providers-tab">
      <div className="providers-layout">
        <div className="providers-panel">
          <h3>Providers</h3>
          <div className="provider-list">
            {/* Backblaze first - always selectable */}
            <div 
              className={`provider-item ${selectedProvider === 'backblaze' ? 'selected' : ''}`}
              onClick={() => handleProviderSelect('backblaze')}
            >
              <span className="provider-name">backblaze</span>
              {config.providers.backblaze?.enabled && (
                <span className="provider-check">✓</span>
              )}
            </div>
            
            {/* Other providers - greyed out */}
            {Object.keys(config.providers)
              .filter(provider => provider !== 'backblaze')
              .map(provider => (
                <div 
                  key={provider}
                  className="provider-item disabled"
                >
                  <span className="provider-name">{provider}</span>
                  <span className="provider-disabled">Future development</span>
                </div>
              ))}
            
            <div className="provider-item placeholder">
              <span className="provider-name">placeholder coming soon</span>
            </div>
            <div className="provider-item placeholder">
              <span className="provider-name"></span>
            </div>
          </div>
        </div>
        
        <div className="provider-config-panel">
          <h3>Configuration</h3>
          {selectedProvider && config.providers[selectedProvider] && (
            <div className="config-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={providerConfig.username || ''}
                  onChange={(e) => handleProviderConfigChange('username', e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={providerConfig.password || ''}
                  onChange={(e) => handleProviderConfigChange('password', e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              {selectedProvider === 'backblaze' && (
                <>
                  <div className="form-group">
                    <label>Bucket Name</label>
                    <input
                      type="text"
                      value={providerConfig.container || ''}
                      onChange={(e) => handleProviderConfigChange('container', e.target.value)}
                      placeholder="Enter bucket name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Application Key ID</label>
                    <input
                      type="text"
                      value={providerConfig.application_key_id || ''}
                      onChange={(e) => handleProviderConfigChange('application_key_id', e.target.value)}
                      placeholder="Enter application key ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>Application Key</label>
                    <input
                      type="password"
                      value={providerConfig.application_key || ''}
                      onChange={(e) => handleProviderConfigChange('application_key', e.target.value)}
                      placeholder="Enter application key"
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Additional Config</label>
                <textarea
                  value={providerConfig.notes || ''}
                  onChange={(e) => handleProviderConfigChange('notes', e.target.value)}
                  placeholder="Any other configuration notes..."
                  rows={3}
                />
              </div>
              <button 
                className="action-button primary"
                onClick={handleSaveProviderConfig}
              >
                Save Configuration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvidersTab;
