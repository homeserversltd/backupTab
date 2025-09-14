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
  enabled: boolean;
  credentials_key: string;
  container: string;
  container_type: string;
  username?: string;
  password?: string;
  application_key_id?: string;
  application_key?: string;
  region?: string;
  max_retries?: number;
  retry_delay?: number;
  timeout?: number;
  max_bandwidth?: number | null;
  upload_chunk_size?: number;
  encryption_enabled?: boolean;
  encryption_key?: string | null;
  encryption_salt?: string | null;
  connection_pool_size?: number;
}

export interface ProviderStatus {
  name: string;
  enabled: boolean;
  available: boolean;
  display_name: string;
  description: string;
  icon: string;
}

export interface BackupConfig {
  backup_items: string[];
  providers: Record<string, CloudProvider>;
  retention_days: number;
  encryption_enabled: boolean;
  backup_count: number;
  logging: {
    enabled: boolean;
    log_file: string;
    log_level: string;
    max_file_size_mb: number;
    backup_count: number;
    format: string;
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

export interface BackupScheduleConfig {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  day?: number; // 0-6 for weekly (Sunday-Saturday), 1-31 for monthly
  hour: number; // 0-23
  minute: number; // 0-59
  customCron?: string; // For custom schedules
  backupType: 'full' | 'incremental' | 'differential';
  retentionDays: number;
  repositories: string[];
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error' | 'never_run';
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
  syncNow: () => Promise<any>;
  testCloudConnections: () => Promise<CloudTestResult>;
  getConfig: () => Promise<BackupConfig>;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  getHistory: () => Promise<BackupHistory>;
  getSchedule: () => Promise<ScheduleInfo>;
  updateSchedule: (action: string) => Promise<boolean>;
  setScheduleConfig: (config: any) => Promise<boolean>;
  getScheduleHistory: () => Promise<any>;
  getScheduleTemplates: () => Promise<any>;
  testSchedule: () => Promise<any>;
  getProvidersStatus: () => Promise<ProviderStatus[]>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}
