/**
 * HOMESERVER Backup Tab Frontend
 * Professional backup system management interface
 */

import React, { useState, useEffect } from 'react';
import { useBackupControls } from './hooks/useBackupControls';
import { BackupCard } from './components/BackupCard';
import { RepositoryCard } from './components/RepositoryCard';
import { 
  BackupStatus, 
  Repository, 
  BackupOperation, 
  CloudTestResult, 
  BackupConfig, 
  BackupHistory, 
  ScheduleInfo 
} from './types';
import './PortalCard.css';

const BackupTablet: React.FC = () => {
  const {
    getStatus,
    getRepositories,
    runBackup,
    testCloudConnections,
    getConfig,
    updateConfig,
    getHistory,
    getSchedule,
    updateSchedule,
    isLoading,
    error,
    clearError
  } = useBackupControls();

  const [activeTab, setActiveTab] = useState<'overview' | 'repositories' | 'backup' | 'history' | 'config'>('overview');
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupHistory | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [cloudTestResults, setCloudTestResults] = useState<CloudTestResult | null>(null);
  const [runningBackup, setRunningBackup] = useState<BackupOperation | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [statusData, reposData, historyData, scheduleData, configData] = await Promise.all([
        getStatus(),
        getRepositories(),
        getHistory(),
        getSchedule(),
        getConfig()
      ]);

      setStatus(statusData);
      setRepositories(reposData);
      setBackupHistory(historyData);
      setScheduleInfo(scheduleData);
      setConfig(configData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleRepositoryToggle = (repository: Repository) => {
    setSelectedRepositories(prev => {
      if (prev.includes(repository.name)) {
        return prev.filter(name => name !== repository.name);
      } else {
        return [...prev, repository.name];
      }
    });
  };

  const handleRunBackup = async (type: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    if (selectedRepositories.length === 0) {
      alert('Please select at least one repository to backup');
      return;
    }

    try {
      setRunningBackup({
        type,
        repositories: selectedRepositories,
        start_time: new Date().toISOString(),
        status: 'running',
        progress: 0
      });

      const result = await runBackup(type, selectedRepositories);
      setRunningBackup(result);
      
      // Refresh data after backup
      await loadInitialData();
    } catch (err) {
      console.error('Backup failed:', err);
      if (runningBackup) {
        setRunningBackup({
          ...runningBackup,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
  };

  const handleTestCloudConnections = async () => {
    try {
      const results = await testCloudConnections();
      setCloudTestResults(results);
    } catch (err) {
      console.error('Cloud connection test failed:', err);
    }
  };

  const handleScheduleAction = async (action: string) => {
    try {
      await updateSchedule(action);
      // Refresh schedule info
      const scheduleData = await getSchedule();
      setScheduleInfo(scheduleData);
    } catch (err) {
      console.error('Schedule update failed:', err);
    }
  };

  const getStatusColor = (systemStatus: string) => {
    switch (systemStatus) {
      case 'configured': return 'success';
      case 'partial': return 'warning';
      case 'not_configured': return 'error';
      default: return 'info';
    }
  };

  const getServiceStatusColor = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'failed': return 'error';
      default: return 'info';
    }
  };

  return (
    <div className="backup-tablet">
      <div className="backup-tablet-header">
        <h2>HOMESERVER Backup System</h2>
        <p className="backup-tablet-description">
          Professional-grade 3-2-1 backup system with encryption and cloud upload
        </p>
        <div className="version-info">
          <span className="version-badge">v1.0.0</span>
        </div>
      </div>

      <div className="backup-tablet-nav">
        <button 
          className={`nav-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`nav-button ${activeTab === 'repositories' ? 'active' : ''}`}
          onClick={() => setActiveTab('repositories')}
        >
          Repositories
        </button>
        <button 
          className={`nav-button ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          Backup
        </button>
        <button 
          className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`nav-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
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

        {activeTab === 'overview' && status && (
          <div>
            <div className="status-grid">
              <div className="status-card">
                <h3>System Status</h3>
                <div className={`status-value ${getStatusColor(status.system_status)}`}>
                  {status.system_status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div className="status-card">
                <h3>Service Status</h3>
                <div className={`status-value ${getServiceStatusColor(status.service_status)}`}>
                  {status.service_status.toUpperCase()}
                </div>
              </div>
              <div className="status-card">
                <h3>Repositories</h3>
                <div className="status-value">
                  {status.repositories_count}
                </div>
              </div>
              <div className="status-card">
                <h3>Cloud Providers</h3>
                <div className="status-value">
                  {status.cloud_providers.length}
                </div>
              </div>
            </div>

            {status.last_backup && (
              <div className="config-panel">
                <h3>Last Backup</h3>
                <p>Last successful backup: {new Date(status.last_backup).toLocaleString()}</p>
              </div>
            )}

            {scheduleInfo && (
              <div className="config-panel">
                <h3>Schedule Status</h3>
                <div className="schedule-info">
                  <div className="schedule-item">
                    <div className="schedule-item-label">Timer Status</div>
                    <div className={`status-value ${getServiceStatusColor(scheduleInfo.timer_status)}`}>
                      {scheduleInfo.timer_status.toUpperCase()}
                    </div>
                  </div>
                  {scheduleInfo.next_run && (
                    <div className="schedule-item">
                      <div className="schedule-item-label">Next Run</div>
                      <div className="schedule-item-value">
                        {new Date(scheduleInfo.next_run).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {scheduleInfo.last_run && (
                    <div className="schedule-item">
                      <div className="schedule-item-label">Last Run</div>
                      <div className="schedule-item-value">
                        {new Date(scheduleInfo.last_run).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="schedule-controls">
                  <button 
                    className="action-button primary"
                    onClick={() => handleScheduleAction('start')}
                    disabled={scheduleInfo.timer_status === 'active'}
                  >
                    Start Timer
                  </button>
                  <button 
                    className="action-button secondary"
                    onClick={() => handleScheduleAction('stop')}
                    disabled={scheduleInfo.timer_status === 'inactive'}
                  >
                    Stop Timer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'repositories' && (
          <div>
            <div className="repositories-grid">
              {repositories.map(repo => (
                <RepositoryCard
                  key={repo.name}
                  repository={repo}
                  selected={selectedRepositories.includes(repo.name)}
                  onToggle={handleRepositoryToggle}
                />
              ))}
            </div>
            {selectedRepositories.length > 0 && (
              <div className="backup-actions">
                <p>Selected repositories: {selectedRepositories.length}</p>
                <button 
                  className="action-button primary"
                  onClick={() => setActiveTab('backup')}
                >
                  Proceed to Backup
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'backup' && (
          <div>
            <div className="config-panel">
              <h3>Run Backup</h3>
              <p>Selected repositories: {selectedRepositories.length}</p>
              
              <div className="backup-actions">
                <button 
                  className="action-button primary"
                  onClick={() => handleRunBackup('daily')}
                  disabled={selectedRepositories.length === 0 || runningBackup?.status === 'running'}
                >
                  Daily Backup
                </button>
                <button 
                  className="action-button primary"
                  onClick={() => handleRunBackup('weekly')}
                  disabled={selectedRepositories.length === 0 || runningBackup?.status === 'running'}
                >
                  Weekly Backup
                </button>
                <button 
                  className="action-button primary"
                  onClick={() => handleRunBackup('monthly')}
                  disabled={selectedRepositories.length === 0 || runningBackup?.status === 'running'}
                >
                  Monthly Backup
                </button>
                <button 
                  className="action-button primary"
                  onClick={() => handleRunBackup('yearly')}
                  disabled={selectedRepositories.length === 0 || runningBackup?.status === 'running'}
                >
                  Yearly Backup
                </button>
              </div>
            </div>

            <div className="config-panel">
              <h3>Cloud Connection Test</h3>
              <p>Test connections to configured cloud providers</p>
              <button 
                className="action-button secondary"
                onClick={handleTestCloudConnections}
                disabled={isLoading}
              >
                Test Connections
              </button>
              
              {cloudTestResults && (
                <div className="cloud-test-results">
                  <h4>Test Results</h4>
                  {Object.entries(cloudTestResults.connections).map(([provider, success]) => (
                    <div key={provider} className="cloud-provider">
                      <span className="cloud-provider-name">{provider}</span>
                      <span className={`cloud-provider-status ${success ? 'success' : 'error'}`}>
                        {success ? '✓ Connected' : '✗ Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {runningBackup && (
              <BackupCard
                operation={runningBackup}
                repositories={repositories}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && backupHistory && (
          <div>
            <div className="backup-history">
              <h3>Recent Backups</h3>
              {backupHistory.recent_backups.length > 0 ? (
                backupHistory.recent_backups.map((backup, index) => (
                  <BackupCard
                    key={index}
                    operation={{
                      type: backup.type,
                      repositories: backup.results.map(r => r.repository),
                      start_time: backup.timestamp,
                      status: 'completed',
                      end_time: backup.timestamp
                    }}
                    repositories={repositories}
                  />
                ))
              ) : (
                <p>No backup history available</p>
              )}
            </div>

            {backupHistory.log_entries.length > 0 && (
              <div className="config-panel">
                <h3>Recent Log Entries</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {backupHistory.log_entries.map((entry, index) => (
                    <div key={index} style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.8rem', 
                      marginBottom: '0.25rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && config && (
          <div>
            <div className="config-panel">
              <h3>Backup Configuration</h3>
              
              <div className="config-section">
                <h4>Retention Policy</h4>
                <ul>
                  <li>Daily backups: {config.retention.daily_backups} days</li>
                  <li>Weekly backups: {config.retention.weekly_backups} weeks</li>
                  <li>Monthly backups: {config.retention.monthly_backups} months</li>
                  <li>Yearly backups: {config.retention.yearly_backups} years</li>
                </ul>
              </div>

              <div className="config-section">
                <h4>Schedule</h4>
                <ul>
                  <li>Daily backup: {config.schedule.daily_backup}</li>
                  <li>Weekly backup: {config.schedule.weekly_backup}</li>
                  <li>Monthly backup: {config.schedule.monthly_backup}</li>
                  <li>Yearly backup: {config.schedule.yearly_backup}</li>
                </ul>
              </div>

              <div className="config-section">
                <h4>Cloud Providers</h4>
                <ul>
                  {Object.entries(config.cloud_providers).map(([name, provider]) => (
                    <li key={name}>
                      {name}: {provider.enabled ? 'Enabled' : 'Disabled'}
                      {provider.url && ` (${provider.url})`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="config-section">
                <h4>Backup Settings</h4>
                <ul>
                  <li>Compression: {config.backup.compression}</li>
                  <li>Max file size: {config.backup.max_file_size}</li>
                  <li>Temp directory: {config.backup.temp_directory}</li>
                  <li>Log level: {config.backup.log_level}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupTablet;
