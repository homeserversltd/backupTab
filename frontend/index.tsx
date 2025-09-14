/**
 * HOMESERVER Backup Tab Frontend
 * Simplified backup system management interface
 */

import React, { useState, useEffect } from 'react';
import { useBackupControls } from './hooks/useBackupControls';
import { showToast } from '../../components/Popup/PopupManager'; //donot touch this
import { 
  BackupStatus, 
  CloudProvider,
  BackupConfig,
  ScheduleInfo 
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
    getSchedule,
    isLoading
  } = useBackupControls();

  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'schedule' | 'config'>('overview');
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [statusData, configData, scheduleData] = await Promise.all([
        getStatus(),
        getConfig(),
        getSchedule()
      ]);

      setStatus(statusData);
      setConfig(configData);
      setScheduleInfo(scheduleData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load initial data';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 5000
      });
    }
  };

  const refreshScheduleData = async () => {
    try {
      const scheduleData = await getSchedule();
      setScheduleInfo(scheduleData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh schedule data';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 5000
      });
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
        {isLoading && (
          <div className="loading-banner">
            <span>Loading backup system data...</span>
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewTab 
            config={config}
            scheduleInfo={scheduleInfo}
            onConfigChange={updateConfig}
          />
        )}

        {activeTab === 'providers' && (
          <ProvidersTab 
            config={config}
            updateConfig={updateConfig}
            onConfigUpdate={setConfig}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab onScheduleChange={refreshScheduleData} />
        )}

        {activeTab === 'config' && (
          <ConfigTab 
            config={config}
            updateConfig={updateConfig}
            onConfigUpdate={setConfig}
          />
        )}
      </div>
    </div>
  );
};

export default BackupTablet;
