/**
 * HOMESERVER Backup Overview Tab Component
 * System status and key metrics display
 */

import React from 'react';
import { BackupStatus, BackupConfig } from '../types';

interface OverviewTabProps {
  status: BackupStatus | null;
  config: BackupConfig | null;
  getStatusColor: (systemStatus: string) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  status,
  config,
  getStatusColor
}) => {
  if (!status) {
    return (
      <div className="overview-tab">
        <div className="loading-banner">
          <span>Loading system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-tab">
      <div className="overview-header">
        <h2>HOMESERVER Backup System</h2>
        <p className="overview-description">
          Professional-grade 3-2-1 backup system with encryption and cloud upload
        </p>
        <div className="version-info">
          <span className="version-badge">v1.0.0</span>
        </div>
      </div>
      
      {/* System Status Overview */}
      <div className="status-section">
        <h3>System Overview</h3>
        <div className="status-grid">
          <div className="status-card">
            <h4>System Status</h4>
            <div className={`status-value ${getStatusColor(status.system_status)}`}>
              {status.system_status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          <div className="status-card">
            <h4>Service Status</h4>
            <div className="status-value">
              {status.service_status.toUpperCase()}
            </div>
          </div>
          <div className="status-card">
            <h4>Files to Backup</h4>
            <div className="status-value">
              {config?.backup_items?.length || 0}
            </div>
          </div>
          <div className="status-card">
            <h4>Active Providers</h4>
            <div className="status-value">
              {config ? Object.values(config.providers).filter(p => p.enabled).length : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="config-section">
        <h3>Configuration Summary</h3>
        <div className="info-box">
          <div className="info-item">
            <strong>Backup Items:</strong> {config?.backup_items?.length || 0} configured
          </div>
          <div className="info-item">
            <strong>Storage Providers:</strong> {config ? Object.values(config.providers).filter(p => p.enabled).length : 0} active
          </div>
          <div className="info-item">
            <strong>System Status:</strong> {status.system_status.replace('_', ' ').toUpperCase()}
          </div>
          <div className="info-item">
            <strong>Service Health:</strong> {status.service_status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="config-section">
        <h3>System Information</h3>
        <div className="info-box">
          <div className="info-item">
            <strong>Version:</strong> v1.0.0
          </div>
          <div className="info-item">
            <strong>Platform:</strong> HOMESERVER Professional Backup System
          </div>
          <div className="info-item">
            <strong>Backup Strategy:</strong> 3-2-1 (3 copies, 2 media types, 1 off-site)
          </div>
          <div className="info-item">
            <strong>Encryption:</strong> AES-256 encryption for all backups
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="config-section">
        <h3>Quick Actions</h3>
        <div className="warning-box">
          <div className="warning-icon">ℹ</div>
          <div className="warning-content">
            <strong>Getting Started:</strong> Configure backup items in the Overview tab, set up storage providers in the Providers tab, and schedule backups in the Schedule tab. Use the Config tab for advanced settings like encryption and retention policies.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
