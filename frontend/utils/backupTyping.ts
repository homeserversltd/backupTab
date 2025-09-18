/**
 * HOMESERVER Backup Type Configuration Utilities
 * Professional backup system type management and calculation utilities
 */

import { BackupTypeConfig, DEFAULT_BACKUP_TYPES } from '../types';

export interface BackupTypeInfo {
  value: 'full' | 'incremental' | 'differential';
  label: string;
  description: string;
  tooltip: string;
  summary: string;
}

export interface BackupCalculation {
  backupsPerDay: number;
  totalBackupsInPeriod: number;
  backupFrequency: string;
  storageImpact: string;
  restoreComplexity: string;
}

/**
 * Calculate backup frequency and storage impact based on configuration
 */
export function calculateBackupImpact(
  config: BackupTypeConfig,
  scheduleFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily'
): BackupCalculation {
  const days = config.retention.days;
  const maxBackups = config.retention.maxBackups;
  const keepForever = config.retention.keepForever;

  // Calculate backups per day based on schedule
  let backupsPerDay = 0;
  switch (scheduleFrequency) {
    case 'daily':
      backupsPerDay = 1;
      break;
    case 'weekly':
      backupsPerDay = 1 / 7;
      break;
    case 'monthly':
      backupsPerDay = 1 / 30;
      break;
    case 'yearly':
      backupsPerDay = 1 / 365;
      break;
  }

  // Calculate total backups in retention period
  let totalBackupsInPeriod = Math.floor(days * backupsPerDay);
  
  // Apply max backups limit if set
  if (maxBackups && totalBackupsInPeriod > maxBackups) {
    totalBackupsInPeriod = maxBackups;
  }

  // If keep forever, show unlimited
  if (keepForever) {
    totalBackupsInPeriod = Infinity;
  }

  // Generate frequency description
  const frequencyMap = {
    daily: 'every day',
    weekly: 'once per week',
    monthly: 'once per month',
    yearly: 'once per year'
  };

  const backupFrequency = frequencyMap[scheduleFrequency];

  // Calculate storage impact based on backup type
  let storageImpact = '';
  switch (config.type) {
    case 'full':
      storageImpact = 'High - Complete system backup each time';
      break;
    case 'incremental':
      storageImpact = 'Low - Only changed files since last backup';
      break;
    case 'differential':
      storageImpact = 'Medium - All changes since last full backup';
      break;
  }

  // Calculate restore complexity
  let restoreComplexity = '';
  switch (config.type) {
    case 'full':
      restoreComplexity = 'Simple - Single backup file needed';
      break;
    case 'incremental':
      restoreComplexity = 'Complex - Requires all incremental backups since last full';
      break;
    case 'differential':
      restoreComplexity = 'Medium - Requires last full backup plus latest differential';
      break;
  }

  return {
    backupsPerDay,
    totalBackupsInPeriod,
    backupFrequency,
    storageImpact,
    restoreComplexity
  };
}

/**
 * Generate plain English summary for backup configuration
 */
export function generateBackupSummary(
  config: BackupTypeConfig,
  scheduleFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily'
): string {
  const calculation = calculateBackupImpact(config, scheduleFrequency);
  const { days, maxBackups, keepForever } = config.retention;
  
  let summary = `With ${days} day retention period and ${calculation.backupFrequency} schedule, `;
  
  if (keepForever) {
    summary += `this will keep backups forever (unlimited storage). `;
  } else if (maxBackups && calculation.totalBackupsInPeriod > maxBackups) {
    summary += `this will keep a maximum of ${maxBackups} backups. `;
  } else {
    summary += `this will create approximately ${calculation.totalBackupsInPeriod} backups. `;
  }
  
  summary += `${calculation.storageImpact} ${calculation.restoreComplexity}`;
  
  return summary;
}

/**
 * Get backup type information with enhanced descriptions
 */
export function getBackupTypeInfo(): BackupTypeInfo[] {
  return [
    {
      value: 'full',
      label: 'Full Backup',
      description: 'Complete system backup',
      tooltip: 'Creates a complete backup of all selected files and directories. This is the most comprehensive backup type but requires the most storage space and time. Recommended for weekly/monthly schedules.',
      summary: 'Complete system backup - highest storage usage, simplest restore process'
    },
    {
      value: 'incremental',
      label: 'Incremental',
      description: 'Only changed files since last backup',
      tooltip: 'Backs up only files that have changed since the last backup (full or incremental). Fast and storage-efficient, but requires all previous backups to restore. Recommended for daily schedules.',
      summary: 'Only changed files - lowest storage usage, most complex restore process'
    },
    {
      value: 'differential',
      label: 'Differential',
      description: 'All changes since last full backup',
      tooltip: 'Backs up all files that have changed since the last full backup. Faster than full backups but requires only the last full backup plus the differential to restore. Recommended for bi-weekly schedules.',
      summary: 'All changes since last full - medium storage usage, medium restore complexity'
    }
  ];
}

/**
 * Get detailed configuration summary for advanced settings
 */
export function getConfigurationSummary(config: BackupTypeConfig): {
  retention: string;
  compression: string;
  performance: string;
  verification: string;
} {
  const { retention, compression, performance, verification } = config;
  
  // Retention summary
  let retentionSummary = `${retention.days} days retention`;
  if (retention.maxBackups) {
    retentionSummary += `, max ${retention.maxBackups} backups`;
  }
  if (retention.keepForever) {
    retentionSummary = 'Keep forever (unlimited)';
  }
  
  // Compression summary
  let compressionSummary = 'No compression';
  if (compression.enabled) {
    compressionSummary = `${compression.algorithm.toUpperCase()} level ${compression.level}`;
  }
  
  // Performance summary
  let performanceSummary = `${performance.parallelJobs} parallel jobs, ${performance.chunkSize}MB chunks`;
  if (performance.maxBandwidth) {
    performanceSummary += `, ${performance.maxBandwidth}KB/s max bandwidth`;
  } else {
    performanceSummary += ', unlimited bandwidth';
  }
  
  // Verification summary
  let verificationSummary = 'No verification';
  if (verification.enabled) {
    verificationSummary = `${verification.frequency.replace('_', ' ')} verification`;
    if (verification.integrityCheck) {
      verificationSummary += ' with integrity checks';
    }
  }
  
  return {
    retention: retentionSummary,
    compression: compressionSummary,
    performance: performanceSummary,
    verification: verificationSummary
  };
}

/**
 * Validate backup type configuration
 */
export function validateBackupConfig(config: BackupTypeConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate retention settings
  if (config.retention.days < 1) {
    errors.push('Retention days must be at least 1');
  }
  if (config.retention.days > 3650) {
    warnings.push('Retention period exceeds 10 years - consider storage implications');
  }
  if (config.retention.maxBackups && config.retention.maxBackups < 1) {
    errors.push('Max backups must be at least 1');
  }
  
  // Validate compression settings
  if (config.compression.enabled) {
    if (config.compression.level < 1 || config.compression.level > 9) {
      errors.push('Compression level must be between 1 and 9');
    }
  }
  
  // Validate performance settings
  if (config.performance.parallelJobs < 1 || config.performance.parallelJobs > 16) {
    errors.push('Parallel jobs must be between 1 and 16');
  }
  if (config.performance.chunkSize < 1 || config.performance.chunkSize > 1024) {
    errors.push('Chunk size must be between 1 and 1024 MB');
  }
  if (config.performance.maxBandwidth && config.performance.maxBandwidth < 1) {
    errors.push('Max bandwidth must be at least 1 KB/s');
  }
  
  // Validate verification settings
  if (config.verification.enabled && !config.verification.integrityCheck) {
    warnings.push('Verification enabled without integrity checks - consider enabling for better data safety');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get recommended settings for different use cases
 */
export function getRecommendedSettings(useCase: 'development' | 'production' | 'archive'): {
  full: Partial<BackupTypeConfig>;
  incremental: Partial<BackupTypeConfig>;
  differential: Partial<BackupTypeConfig>;
} {
  const baseConfig = {
    compression: { enabled: true, algorithm: 'zstd' as const, level: 6 as const },
    encryption: { enabled: true, algorithm: 'AES-256-GCM' as const },
    deduplication: { enabled: true, algorithm: 'blake2' as const },
    verification: { enabled: true, frequency: 'weekly' as const, integrityCheck: true },
    performance: { parallelJobs: 4, chunkSize: 64, maxBandwidth: null },
    cleanup: { autoCleanup: true, cleanupAfterDays: 30, keepAtLeast: 3 }
  };

  switch (useCase) {
    case 'development':
      return {
        full: {
          ...baseConfig,
          retention: { days: 30, maxBackups: 4, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 2, chunkSize: 32 }
        },
        incremental: {
          ...baseConfig,
          retention: { days: 14, maxBackups: 14, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 4, chunkSize: 16 }
        },
        differential: {
          ...baseConfig,
          retention: { days: 21, maxBackups: 3, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 3, chunkSize: 24 }
        }
      };
    
    case 'production':
      return {
        full: {
          ...baseConfig,
          retention: { days: 365, maxBackups: 12, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 6, chunkSize: 128 }
        },
        incremental: {
          ...baseConfig,
          retention: { days: 90, maxBackups: 90, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 8, chunkSize: 64 }
        },
        differential: {
          ...baseConfig,
          retention: { days: 180, maxBackups: 6, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 6, chunkSize: 96 }
        }
      };
    
    case 'archive':
      return {
        full: {
          ...baseConfig,
          retention: { days: 3650, maxBackups: 24, keepForever: true },
          performance: { ...baseConfig.performance, parallelJobs: 2, chunkSize: 256 }
        },
        incremental: {
          ...baseConfig,
          retention: { days: 365, maxBackups: 365, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 4, chunkSize: 128 }
        },
        differential: {
          ...baseConfig,
          retention: { days: 730, maxBackups: 12, keepForever: false },
          performance: { ...baseConfig.performance, parallelJobs: 4, chunkSize: 192 }
        }
      };
    
    default:
      return {
        full: baseConfig,
        incremental: baseConfig,
        differential: baseConfig
      };
  }
}
