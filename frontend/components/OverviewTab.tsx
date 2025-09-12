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
        <div className="loading-state">
          <span>Loading system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-tab">
      <div className="status-grid">
        <div className="status-card">
          <h3>System Status</h3>
          <div className={`status-value ${getStatusColor(status.system_status)}`}>
            {status.system_status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        <div className="status-card">
          <h3>Service Status</h3>
          <div className="status-value">
            {status.service_status.toUpperCase()}
          </div>
        </div>
        <div className="status-card">
          <h3>Files to Backup</h3>
          <div className="status-value">
            {config?.backup_items?.length || 0}
          </div>
        </div>
        <div className="status-card">
          <h3>Active Providers</h3>
          <div className="status-value">
            {config ? Object.values(config.providers).filter(p => p.enabled).length : 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
