import React, { useState } from 'react';
import { showToast } from '../../../../src/components/Popup/PopupManager';

interface InstallationManagerProps {
  installationStatus: any;
  onStatusChange: () => void;
}

export const InstallationManager: React.FC<InstallationManagerProps> = ({
  installationStatus,
  onStatusChange
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const response = await fetch('/api/backup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await onStatusChange();
        showToast({
          message: 'backupTab installed successfully!',
          variant: 'success',
          duration: 5000
        });
      } else {
        showToast({
          message: `Installation failed: ${result.error}`,
          variant: 'error',
          duration: 8000
        });
      }
    } catch (error) {
      showToast({
        message: `Installation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'error',
        duration: 8000
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirm('Are you sure you want to disable backup services? This will stop all backup functionality and remove backup configurations.')) {
      return;
    }

    setIsUninstalling(true);
    try {
      const response = await fetch('/api/backup/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await onStatusChange();
        showToast({
          message: 'Backup services disabled successfully!',
          variant: 'success',
          duration: 5000
        });
      } else {
        showToast({
          message: `Failed to disable backup services: ${result.error}`,
          variant: 'error',
          duration: 8000
        });
      }
    } catch (error) {
      showToast({
        message: `Error disabling backup services: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'error',
        duration: 8000
      });
    } finally {
      setIsUninstalling(false);
    }
  };

  if (!installationStatus) {
    return (
      <div className="installation-manager">
        <div className="installation-status unknown">
          <h3>Installation Status Unknown</h3>
          <p>Unable to determine installation status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="installation-manager">
      <div className={`installation-status ${installationStatus.installed ? 'installed' : 'not-installed'}`}>
        <h3>backupTab Installation</h3>
        
        {installationStatus.installed ? (
          <div className="installed-state">
            <div className="status-indicator success">
              <span className="icon">✓</span>
              <span className="text">Installed</span>
            </div>
            
            <div className="installation-details">
              <p><strong>Version:</strong> {installationStatus.version}</p>
              {installationStatus.installation_timestamp && (
                <p><strong>Installed:</strong> {new Date(installationStatus.installation_timestamp).toLocaleString()}</p>
              )}
              <p><strong>Method:</strong> {installationStatus.installation_method || 'Unknown'}</p>
            </div>
            
            {installationStatus.can_uninstall && (
              <button 
                onClick={handleUninstall}
                disabled={isUninstalling}
                className="uninstall-button danger"
              >
                {isUninstalling ? 'Disabling...' : 'Disable backup services'}
              </button>
            )}
          </div>
        ) : (
          <div className="not-installed-state">
            <div className="status-indicator error">
              <span className="icon">⚠</span>
              <span className="text">Not Installed</span>
            </div>
            
            <div className="installation-prompt">
              <p>backupTab is not installed. Click the button below to install it automatically.</p>
              
              {installationStatus.missing_components.length > 0 && (
                <div className="missing-components">
                  <p><strong>Missing components:</strong></p>
                  <ul>
                    {installationStatus.missing_components.map((component: string, index: number) => (
                      <li key={index}>{component}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {installationStatus.can_install ? (
                <button 
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="install-button primary"
                >
                  {isInstalling ? 'Installing...' : 'Install backupTab'}
                </button>
              ) : (
                <div className="install-error">
                  <p>Installation not available. Premium installer not found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
