/**
 * HOMESERVER Backup Overview Tab Component
 * Providers and backup files management
 */

import React, { useState } from 'react';
import { BackupConfig, ScheduleInfo, HeaderStats } from '../types';
import { StatusHeaderBar } from './StatusHeaderBar';
import { InstallationManager } from './InstallationManager';

interface OverviewTabProps {
  config: BackupConfig | null;
  scheduleInfo: ScheduleInfo | null;
  onConfigChange: (config: Partial<BackupConfig>) => Promise<boolean>;
  headerStats?: HeaderStats | null;
  installationStatus?: any;
  onStatusChange?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  config,
  scheduleInfo,
  onConfigChange,
  headerStats,
  installationStatus,
  onStatusChange
}) => {
  const [clickedProvider, setClickedProvider] = useState<string | null>(null);

  const handleProviderClick = (providerKey: string) => {
    setClickedProvider(providerKey);
    // Reset the animation state after 300ms
    setTimeout(() => {
      setClickedProvider(null);
    }, 300);
  };

  const formatNextBackup = (nextRun: string | null): string => {
    if (!nextRun || nextRun === 'Not scheduled') return 'Not scheduled';
    
    try {
      const date = new Date(nextRun);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMs < 0) return 'Overdue';
      if (diffDays > 0) return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      if (diffHours > 0) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      if (diffMinutes > 0) return `In ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      return 'Very soon';
    } catch {
      return nextRun; // Return the original string if it's not a valid date
    }
  };

  const getBackupTypeInfo = () => {
    const backupType = scheduleInfo?.schedule_config?.backupType || 'incremental';
    const backupTypeLabels = {
      'full': 'Full Backup',
      'incremental': 'Incremental',
      'differential': 'Differential'
    };
    const backupTypeDescriptions = {
      'full': 'Complete system backup',
      'incremental': 'Only changed files since last backup',
      'differential': 'All changes since last full backup'
    };
    
    return {
      type: backupType,
      label: backupTypeLabels[backupType as keyof typeof backupTypeLabels] || 'Unknown',
      description: backupTypeDescriptions[backupType as keyof typeof backupTypeDescriptions] || 'Unknown backup type'
    };
  };

  return (
    <div className="overview-layout overview-container">
      {/* Status Header Bar */}
      <StatusHeaderBar headerStats={headerStats} />

      {/* Installation Manager */}
      {installationStatus && onStatusChange && (
        <InstallationManager 
          installationStatus={installationStatus} 
          onStatusChange={onStatusChange} 
        />
      )}

      {/* Main Content Area */}
      <div className="overview-content">
        {/* Left Column - Providers */}
        <div className="providers-panel">
        <div className="panel-header">
          <h3>Storage Providers</h3>
          <p className="panel-description">
            Configured backup storage providers
          </p>
        </div>
        
        <div className="provider-list">
          {config?.providers ? Object.entries(config.providers).map(([key, provider]) => (
            <div 
              key={key} 
              className={`provider-item ${provider.enabled ? 'enabled' : 'disabled'} ${clickedProvider === key ? 'clicked' : ''}`}
              onClick={() => handleProviderClick(key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="provider-icon">💾</div>
              <div className="provider-info">
                <div className="provider-name">{key}</div>
                <div className="provider-description">
                  {provider.container_type === 'local' ? 'Local NAS Storage' : 
                   provider.container_type === 'aws' ? 'AWS S3' :
                   provider.container_type === 'google' ? 'Google Drive' : 
                   provider.container_type || 'Cloud Storage'}
                </div>
                <div className={`provider-status ${provider.enabled ? 'enabled' : 'disabled'}`}>
                  {provider.enabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <p>No providers configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Backup Files */}
      <div className="files-panel">
        <div className="panel-header">
          <h3>Files to Backup</h3>
          <p className="panel-description">
            Files and directories to include in backups
          </p>
        </div>

        <div className="file-list">
          {config?.backup_items && config.backup_items.length > 0 ? (
            config.backup_items.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <div className="file-path">{file}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No files configured for backup</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Version at bottom */}
      <div className="version-footer">
        <span>v1.0.0</span>
      </div>
    </div>
  );
};

export default OverviewTab;
