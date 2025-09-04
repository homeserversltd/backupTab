/**
 * HOMESERVER Backup Controls Hook
 * Manages backup system operations and state
 */

import { useState, useCallback } from 'react';
import { 
  BackupStatus, 
  Repository, 
  BackupOperation, 
  CloudTestResult, 
  BackupConfig, 
  BackupHistory, 
  ScheduleInfo,
  UseBackupControlsReturn 
} from '../types';

const API_BASE = '/api/backup';

export function useBackupControls(): UseBackupControlsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiCall = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API call failed');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (): Promise<BackupStatus> => {
    return handleApiCall<BackupStatus>('/status');
  }, [handleApiCall]);

  const getRepositories = useCallback(async (): Promise<Repository[]> => {
    return handleApiCall<Repository[]>('/repositories');
  }, [handleApiCall]);

  const runBackup = useCallback(async (
    type: string, 
    repositories: string[]
  ): Promise<BackupOperation> => {
    return handleApiCall<BackupOperation>('/backup/run', {
      method: 'POST',
      body: JSON.stringify({ type, repositories }),
    });
  }, [handleApiCall]);

  const testCloudConnections = useCallback(async (): Promise<CloudTestResult> => {
    return handleApiCall<CloudTestResult>('/cloud/test', {
      method: 'POST',
    });
  }, [handleApiCall]);

  const getConfig = useCallback(async (): Promise<BackupConfig> => {
    return handleApiCall<BackupConfig>('/config');
  }, [handleApiCall]);

  const updateConfig = useCallback(async (config: Partial<BackupConfig>): Promise<boolean> => {
    await handleApiCall('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    return true;
  }, [handleApiCall]);

  const getHistory = useCallback(async (): Promise<BackupHistory> => {
    return handleApiCall<BackupHistory>('/history');
  }, [handleApiCall]);

  const getSchedule = useCallback(async (): Promise<ScheduleInfo> => {
    return handleApiCall<ScheduleInfo>('/schedule');
  }, [handleApiCall]);

  const updateSchedule = useCallback(async (action: string): Promise<boolean> => {
    await handleApiCall('/schedule', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    return true;
  }, [handleApiCall]);

  return {
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
    clearError,
  };
}
