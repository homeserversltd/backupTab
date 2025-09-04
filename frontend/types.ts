/**
 * HOMESERVER Backup Tab Types
 * Professional backup system type definitions
 */

export interface BackupStatus {
  system_status: 'not_configured' | 'partial' | 'configured';
  config_exists: boolean;
  state_exists: boolean;
  service_status: 'active' | 'inactive' | 'failed' | 'unknown';
  last_backup: string | null;
  repositories_count: number;
  cloud_providers: string[];
}

export interface Repository {
  name: string;
  status: 'active' | 'inactive';
  path: string;
  size?: number;
  last_commit?: string;
}

export interface CloudProvider {
  name: string;
  enabled: boolean;
  url?: string;
  username?: string;
  remote_path?: string;
  connection_status?: boolean;
}

export interface BackupConfig {
  repositories: Repository[];
  cloud_providers: Record<string, CloudProvider>;
  retention: {
    daily_backups: number;
    weekly_backups: number;
    monthly_backups: number;
    yearly_backups: number;
  };
  schedule: {
    daily_backup: string;
    weekly_backup: string;
    monthly_backup: string;
    yearly_backup: string;
  };
  backup: {
    compression: string;
    max_file_size: string;
    temp_directory: string;
    log_level: string;
  };
}

export interface BackupHistory {
  recent_backups: BackupRecord[];
  log_entries: string[];
  state: {
    last_daily_backup?: string;
    last_weekly_backup?: string;
    last_monthly_backup?: string;
    last_yearly_backup?: string;
    backup_history: BackupRecord[];
  };
}

export interface BackupRecord {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  timestamp: string;
  results: BackupResult[];
}

export interface BackupResult {
  repository: string;
  backup_type: string;
  timestamp: string;
  local_path: string;
  upload_results: Record<string, boolean>;
  success: boolean;
}

export interface ScheduleInfo {
  timer_status: 'active' | 'inactive' | 'failed' | 'unknown';
  next_run: string | null;
  last_run: string | null;
  schedule_config: Record<string, string>;
}

export interface BackupOperation {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repositories: string[];
  start_time: string;
  end_time?: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number;
  output?: string;
  error?: string;
}

export interface CloudTestResult {
  connections: Record<string, boolean>;
  output: string;
  tested_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface UseBackupControlsReturn {
  getStatus: () => Promise<BackupStatus>;
  getRepositories: () => Promise<Repository[]>;
  runBackup: (type: string, repositories: string[]) => Promise<BackupOperation>;
  testCloudConnections: () => Promise<CloudTestResult>;
  getConfig: () => Promise<BackupConfig>;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  getHistory: () => Promise<BackupHistory>;
  getSchedule: () => Promise<ScheduleInfo>;
  updateSchedule: (action: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}
