/**
 * HOMESERVER Backup Providers Tab Component
 * Modular provider configuration and management
 */

import React, { useState, useEffect } from 'react';
import { BackupConfig, CloudProvider, ProviderStatus } from '../types';
import { ProviderSelector } from './providers/ProviderSelector';
import { BackblazeProvider } from './providers/BackblazeProvider';
import { LocalProvider } from './providers/LocalProvider';
import { showToast } from '../../../../src/components/Popup/PopupManager';
import { useBackupControls } from '../hooks/useBackupControls';

interface ProvidersTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  onConfigUpdate?: (config: BackupConfig) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  config,
  updateConfig,
  onConfigUpdate
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('backblaze');
  const [providerConfig, setProviderConfig] = useState<CloudProvider | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getProvidersStatus } = useBackupControls();

  // Load provider statuses on component mount
  useEffect(() => {
    const loadProviderStatuses = async () => {
      try {
        console.log('Fetching provider statuses from API...');
        const statuses = await getProvidersStatus();
        console.log('Provider statuses response:', statuses);
        console.log('Provider statuses length:', statuses?.length);
        setProviderStatuses(statuses || []);
        
        // Set default selected provider to first available provider
        if (statuses && statuses.length > 0 && !selectedProvider) {
          const firstAvailable = statuses.find(p => p.available);
          if (firstAvailable) {
            console.log('Setting default provider to:', firstAvailable.name);
            setSelectedProvider(firstAvailable.name);
          }
        }
      } catch (err) {
        console.error('Failed to load provider statuses:', err);
        // Don't show error toast - providers should still be visible from config
        console.log('Using fallback provider list from config');
        
        // Create fallback provider statuses from config
        if (config?.providers) {
          const fallbackStatuses = Object.keys(config.providers).map(providerName => ({
            name: providerName,
            enabled: config.providers[providerName]?.enabled || false,
            available: true, // Assume available for UI purposes
            configured: false, // Mark as not configured if we can't check
            display_name: providerName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `Configure ${providerName} provider`,
            icon: 'cloud',
            keyman_integration: {
              integrated: (config.providers[providerName] as any)?.keyman_integrated || false,
              configured: false,
              service_name: (config.providers[providerName] as any)?.keyman_service_name || providerName
            }
          }));
          setProviderStatuses(fallbackStatuses);
        }
      }
    };

    loadProviderStatuses();
  }, [getProvidersStatus, config]);

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
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update local config state immediately for UI responsiveness
        setProviderConfig(prev => {
          if (!prev) return null;
          return {
            ...prev,
            enabled
          };
        });
        
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        // Refresh provider statuses after config update
        try {
          const statuses = await getProvidersStatus();
          setProviderStatuses(statuses || []);
        } catch (refreshErr) {
          console.warn('Failed to refresh provider statuses:', refreshErr);
        }
        
        showToast({
          message: `Provider ${provider} ${enabled ? 'enabled' : 'disabled'} successfully`,
          variant: 'success',
          duration: 3000
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle provider';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
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
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Refresh provider statuses after config update
        try {
          const statuses = await getProvidersStatus();
          setProviderStatuses(statuses || []);
        } catch (refreshErr) {
          console.warn('Failed to refresh provider statuses:', refreshErr);
        }
        
        showToast({
          message: `${selectedProvider} configuration saved successfully`,
          variant: 'success',
          duration: 3000
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save provider config';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
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
          providerStatuses={providerStatuses}
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
