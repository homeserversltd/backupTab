/**
 * HOMESERVER Backup Providers Tab Component
 * Modular provider configuration and management
 */

import React, { useState, useEffect } from 'react';
import { BackupConfig, CloudProvider } from '../types';
import { ProviderSelector } from './providers/ProviderSelector';
import { BackblazeProvider } from './providers/BackblazeProvider';
import { LocalProvider } from './providers/LocalProvider';

interface ProvidersTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  config,
  updateConfig
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('backblaze');
  const [providerConfig, setProviderConfig] = useState<CloudProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load provider config when provider changes
  useEffect(() => {
    if (config?.providers[selectedProvider]) {
      setProviderConfig(config.providers[selectedProvider]);
    }
  }, [selectedProvider, config]);

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
  };

  const handleProviderToggle = async (provider: string, enabled: boolean) => {
    if (!config) return;
    
    setIsLoading(true);
    try {
      const updatedConfig = {
        ...config,
        providers: {
          ...config.providers,
          [provider]: {
            ...config.providers[provider],
            enabled
          }
        }
      };
      
      await updateConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderConfigChange = (newConfig: Partial<CloudProvider>) => {
    setProviderConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...newConfig
      };
    });
  };

  const handleSaveProviderConfig = async () => {
    if (!config || !providerConfig) return;
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const renderProviderConfig = () => {
    if (!providerConfig) {
      return (
        <div className="provider-config-panel">
          <div className="loading-state">
            <span>Loading provider configuration...</span>
          </div>
        </div>
      );
    }

    switch (selectedProvider) {
      case 'backblaze':
        return (
          <div className="provider-config-panel">
            <BackblazeProvider
              config={providerConfig}
              onConfigChange={handleProviderConfigChange}
              onSave={handleSaveProviderConfig}
              isLoading={isLoading}
            />
          </div>
        );
      
      case 'local':
        return (
          <div className="provider-config-panel">
            <LocalProvider
              config={providerConfig}
              onConfigChange={handleProviderConfigChange}
              onSave={handleSaveProviderConfig}
              isLoading={isLoading}
            />
          </div>
        );
      
      default:
        return (
          <div className="provider-config-panel">
            <div className="provider-not-available">
              <h4>Provider Not Available</h4>
              <p>This provider is not yet implemented or available.</p>
            </div>
          </div>
        );
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
        <ProviderSelector
          config={config}
          selectedProvider={selectedProvider}
          onProviderSelect={handleProviderSelect}
          onProviderToggle={handleProviderToggle}
          isLoading={isLoading}
        />
        
        {renderProviderConfig()}
      </div>
    </div>
  );
};

export default ProvidersTab;
