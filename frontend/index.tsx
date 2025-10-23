/**
 * HOMESERVER Backup Tab Frontend
 * Simplified backup system management interface
 */

import React, { useState, useEffect } from 'react';
import { useBackupControls, useHeaderStats } from './hooks/useBackupControls';
import { showToast } from '../../../../src/components/Popup/PopupManager'; //donot touch this
import { 
  BackupStatus, 
  CloudProvider,
  BackupConfig,
  ScheduleInfo,
  HeaderStats
} from './types';
import { 
  getStatusColor,
  OverviewTab,
  ProvidersTab,
  ScheduleTab,
  ConfigTab,
  RestoreTab
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

  const { stats: headerStats, loading: headerStatsLoading, loadStats: loadHeaderStats } = useHeaderStats();

  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'schedule' | 'config' | 'restore'>('overview');
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
      
      // Load header stats
      await loadHeaderStats();
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

  const refreshConfigData = async () => {
    try {
      const configData = await getConfig();
      setConfig(configData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh config data';
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
        <button 
          className={`nav-button ${activeTab === 'restore' ? 'active' : ''}`}
          onClick={() => setActiveTab('restore')}
        >
          Restore
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
            headerStats={headerStats}
            installationStatus={null}
            onStatusChange={loadInitialData}
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
          <ScheduleTab 
            config={config}
            onScheduleChange={refreshScheduleData}
            onConfigRefresh={refreshConfigData}
          />
        )}

        {activeTab === 'config' && (
          <ConfigTab 
            config={config}
            status={status}
            updateConfig={updateConfig}
            onConfigUpdate={setConfig}
            activeBackupType={scheduleInfo?.schedule_config?.backupType || scheduleInfo?.schedule_config?.activeBackupType as 'full' | 'incremental' | 'differential' | undefined}
            hasActiveSchedule={Boolean(scheduleInfo?.schedule_config?.enabled)}
          />
        )}

        {activeTab === 'restore' && (
          <RestoreTab />
        )}
      </div>
    </div>
  );
};

export default BackupTablet;
