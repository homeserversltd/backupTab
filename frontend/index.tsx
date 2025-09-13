/**
 * HOMESERVER Backup Tab Frontend
 * Simplified backup system management interface
 */

import React, { useState, useEffect } from 'react';
import { useBackupControls } from './hooks/useBackupControls';
import { 
  BackupStatus, 
  CloudProvider,
  BackupConfig 
} from './types';
import { 
  getStatusColor,
  OverviewTab,
  ProvidersTab,
  ScheduleTab,
  ConfigTab
} from './components';
import './backupTab.css';

const BackupTablet: React.FC = () => {
  const {
    getStatus,
    getConfig,
    updateConfig,
    isLoading,
    error,
    clearError
  } = useBackupControls();

  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'schedule' | 'config'>('overview');
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [config, setConfig] = useState<BackupConfig | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [statusData, configData] = await Promise.all([
        getStatus(),
        getConfig()
      ]);

      setStatus(statusData);
      setConfig(configData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  return (
    <div className="backup-tablet">
      <div className="backup-tablet-nav">
        <button 
          className={`nav-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`nav-button ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          Providers
        </button>
        <button 
          className={`nav-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule
        </button>
        <button 
          className={`nav-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Config
        </button>
      </div>

      <div className="backup-tablet-content">
        {error && (
          <div className="error-banner">
            <span>⚠</span>
            <span>{error}</span>
            <button onClick={clearError} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}

        {isLoading && (
          <div className="loading-banner">
            <span>Loading backup system data...</span>
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewTab 
            config={config}
            onConfigChange={updateConfig}
          />
        )}

        {activeTab === 'providers' && (
          <ProvidersTab 
            config={config}
            updateConfig={updateConfig}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab />
        )}

        {activeTab === 'config' && (
          <ConfigTab 
            config={config}
            updateConfig={updateConfig}
          />
        )}
      </div>
    </div>
  );
};

export default BackupTablet;
