/**
 * HOMESERVER Backup Controls Hook
 * Manages backup system operations and state
 */

import { useState, useCallback } from 'react';
import { showToast } from '../../../../src/components/Popup/PopupManager';
import { 
  BackupStatus, 
  Repository, 
  BackupOperation, 
  CloudTestResult, 
  BackupConfig, 
  BackupHistory, 
  ScheduleInfo,
  ProviderStatus,
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
      console.log('API Response for', endpoint, ':', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API call failed');
      }

      console.log('API Success - returning data:', data.data);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Show error toast
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 5000,
        priority: 10
      });
      
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

  const syncNow = useCallback(async (): Promise<any> => {
    console.log('=== useBackupControls.syncNow() CALLED ===');
    console.log('Making API call to /backup/sync-now with POST method');
    
    try {
      const result = await handleApiCall<any>('/backup/sync-now', {
        method: 'POST',
      });
      console.log('handleApiCall returned successfully:', result);
      return result;
    } catch (error) {
      console.error('=== useBackupControls.syncNow() ERROR ===');
      console.error('handleApiCall threw error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
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

  const setScheduleConfig = useCallback(async (config: any): Promise<boolean> => {
    await handleApiCall('/schedule/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    return true;
  }, [handleApiCall]);

  const getScheduleHistory = useCallback(async (): Promise<any> => {
    return handleApiCall<any>('/schedule/history');
  }, [handleApiCall]);

  const getScheduleTemplates = useCallback(async (): Promise<any> => {
    return handleApiCall<any>('/schedule/templates');
  }, [handleApiCall]);

  const testSchedule = useCallback(async (): Promise<any> => {
    return handleApiCall<any>('/schedule/test', {
      method: 'POST',
    });
  }, [handleApiCall]);

  const getProvidersStatus = useCallback(async (): Promise<ProviderStatus[]> => {
    console.log('Making API call to /providers/status');
    const result = await handleApiCall<{providers: ProviderStatus[]}>('/providers/status');
    console.log('Raw API response for providers status:', result);
    console.log('Extracted providers array:', result.providers);
    return result.providers;
  }, [handleApiCall]);

  return {
    getStatus,
    getRepositories,
    runBackup,
    syncNow,
    testCloudConnections,
    getConfig,
    updateConfig,
    getHistory,
    getSchedule,
    updateSchedule,
    setScheduleConfig,
    getScheduleHistory,
    getScheduleTemplates,
    testSchedule,
    getProvidersStatus,
    isLoading,
    error,
    clearError,
  };
}
