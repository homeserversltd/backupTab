/**
 * HOMESERVER Backup Schedule Tab Component
 * Professional backup scheduling and automation configuration
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, 
  faClock, 
  faPlus, 
  faEdit, 
  faTrash, 
  faPlay, 
  faPause,
  faCheckCircle,
  faExclamationTriangle,
  faCalendarDay,
  faCalendarWeek,
  faCalendar,
  faEye,
  faSave,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { BackupScheduleConfig, ScheduleInfo, BackupConfig, GenericBackupConfig, getGenericBackupTypeInfo } from '../types';
import { showToast } from '../../../../src/components/Popup/PopupManager'; //donot touch this
import { useTooltip } from '../../../../src/hooks/useTooltip';
import { useBackupControls } from '../hooks/useBackupControls';
import './ScheduleTab.css';

interface ScheduleTabProps {
  schedules?: BackupScheduleConfig[];
  onScheduleChange?: () => void;
  config?: BackupConfig | null;
}

interface UpdateSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  activeBackupType: 'full' | 'incremental' | 'differential';
}


// Get generic backup type information
const GENERIC_BACKUP_TYPE_INFO = getGenericBackupTypeInfo();

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ 
  schedules = [], 
  onScheduleChange,
  config
}) => {
  const {
    getSchedule,
    setScheduleConfig,
    syncNow,
    isLoading: apiLoading,
    error: apiError,
    clearError
  } = useBackupControls();

  const tooltip = useTooltip();

  const [updateSchedule, setUpdateSchedule] = useState<UpdateSchedule>({
    enabled: false,
    frequency: 'weekly',
    time: '02:00',
    dayOfWeek: 0,
    activeBackupType: 'incremental'
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);

  // Load current schedule configuration on mount
  useEffect(() => {
    loadScheduleConfig();
  }, []);

  // Reset frequency when backup type changes to ensure it's valid for the new type
  useEffect(() => {
    const typeInfo = GENERIC_BACKUP_TYPE_INFO.find(type => type.value === updateSchedule.activeBackupType);
    if (typeInfo && !typeInfo.constraints.allowedFrequencies.includes(updateSchedule.frequency)) {
      setUpdateSchedule(prev => ({
        ...prev,
        frequency: typeInfo.constraints.allowedFrequencies[0]
      }));
    }
  }, [updateSchedule.activeBackupType]);

  // TODO: Add real-time status updates for backup progress
  // TODO: Implement backup history/logs integration
  // TODO: Add backup size and storage usage information
  // TODO: Add backup validation and health checks

  const loadScheduleConfig = async () => {
    try {
      setIsInitialLoading(true);
      const schedule = await getSchedule();
      setScheduleInfo(schedule);
      
      // Parse existing schedule configuration if available
      if (schedule.schedule_config) {
        const config = schedule.schedule_config;
        
        // Convert hour/minute to time string if needed
        let timeString = config.time;
        if (!timeString && typeof config.hour === 'number' && typeof config.minute === 'number') {
          timeString = `${config.hour.toString().padStart(2, '0')}:${config.minute.toString().padStart(2, '0')}`;
        }
        
        // Determine backup type - check both activeBackupType and backupType fields
        const backupType = config.activeBackupType || config.backupType || 'incremental';
        
        // Determine frequency - use existing or default to weekly
        const frequency = (config.frequency as 'daily' | 'weekly' | 'monthly') || 'weekly';
        
        setUpdateSchedule({
          enabled: Boolean(config.enabled),
          frequency: frequency,
          time: timeString || '02:00',
          dayOfWeek: typeof config.dayOfWeek === 'number' ? config.dayOfWeek : 0,
          dayOfMonth: typeof config.dayOfMonth === 'number' ? config.dayOfMonth : 1,
          activeBackupType: backupType as 'full' | 'incremental' | 'differential'
        });
      } else {
        // No existing config - use defaults
        setUpdateSchedule({
          enabled: false,
          frequency: 'weekly',
          time: '02:00',
          dayOfWeek: 0,
          dayOfMonth: 1,
          activeBackupType: 'incremental'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load schedule configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Helper function to format schedule preview (what user is configuring)
  const getSchedulePreview = () => {
    if (!updateSchedule.enabled) return null;
    
    const timeFormatted = new Date(`2000-01-01T${updateSchedule.time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const typeInfo = GENERIC_BACKUP_TYPE_INFO.find(type => type.value === updateSchedule.activeBackupType);
    
    // For types that auto-schedule, show the intelligent schedule
    if (typeInfo?.constraints.autoSchedulesFull) {
      return `System will run daily differentials at ${timeFormatted} + weekly full backups (automatic scheduling)`;
    }
    
    if (typeInfo?.constraints.requiresFullRefresh) {
      return `System will run daily incrementals at ${timeFormatted} + periodic full refreshes (configure interval in Config tab)`;
    }
    
    // For full backups, show the user-selected frequency
    switch (updateSchedule.frequency) {
      case 'daily':
        return `Full backups will run daily at ${timeFormatted}`;
      case 'weekly': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[updateSchedule.dayOfWeek || 0];
        return `Full backups will run every ${dayName} at ${timeFormatted}`;
      }
      case 'monthly': {
        const dayOfMonth = updateSchedule.dayOfMonth || 1;
        const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
        return `Full backups will run on the ${dayOfMonth}${suffix} of each month at ${timeFormatted}`;
      }
      default:
        return '';
    }
  };

  // Helper function to format deployed schedule (what's actually in cron)
  const getDeployedSchedule = () => {
    if (!scheduleInfo?.schedule_config?.enabled) return 'Not scheduled';
    
    const config = scheduleInfo.schedule_config;
    
    // Convert hour/minute to time string if needed
    let timeString = config.time;
    if (!timeString && typeof config.hour === 'number' && typeof config.minute === 'number') {
      timeString = `${config.hour.toString().padStart(2, '0')}:${config.minute.toString().padStart(2, '0')}`;
    }
    
    // If we have the frontend configuration format, use it directly
    if (config.frequency && timeString) {
      const timeFormatted = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Get backup type for context
      const backupType = config.activeBackupType || config.backupType || 'incremental';
      const typeInfo = GENERIC_BACKUP_TYPE_INFO.find(type => type.value === backupType);
      
      // For types that auto-schedule, show the intelligent schedule
      if (typeInfo?.constraints.autoSchedulesFull) {
        return `System will run daily differentials at ${timeFormatted} + weekly full backups (automatic scheduling)`;
      }
      
      if (typeInfo?.constraints.requiresFullRefresh) {
        return `System will run daily incrementals at ${timeFormatted} + periodic full refreshes (configure interval in Config tab)`;
      }
      
      // For full backups, show the user-selected frequency
      switch (config.frequency) {
        case 'daily':
          return `Full backups will run daily at ${timeFormatted}`;
        case 'weekly': {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayIndex = typeof config.dayOfWeek === 'number' ? config.dayOfWeek : parseInt(String(config.dayOfWeek)) || 0;
          const dayName = days[dayIndex];
          return `Full backups will run every ${dayName} at ${timeFormatted}`;
        }
        case 'monthly': {
          const dayOfMonth = typeof config.dayOfMonth === 'number' ? config.dayOfMonth : parseInt(String(config.dayOfMonth)) || 1;
          const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
          return `Full backups will run on the ${dayOfMonth}${suffix} of each month at ${timeFormatted}`;
        }
        default:
          return 'Schedule configured';
      }
    }
    
    // Fallback: parse cron schedule if available
    if (config.schedule) {
      const cronParts = config.schedule.split(' ');
      if (cronParts.length !== 5) return config.schedule; // Fallback to raw cron if can't parse
      
      const [minute, hour, day, month, weekday] = cronParts;
      
      // Convert 24-hour to 12-hour format
      const hourNum = parseInt(hour);
      const timeFormatted = new Date(`2000-01-01T${hourNum.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Determine frequency based on cron pattern
      if (weekday !== '*') {
        // Weekly schedule
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[parseInt(weekday)];
        return `Backups will run every ${dayName} at ${timeFormatted}`;
      } else if (day !== '*') {
        // Monthly schedule
        const dayOfMonth = parseInt(day);
        const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
        return `Backups will run on the ${dayOfMonth}${suffix} of each month at ${timeFormatted}`;
      } else {
        // Daily schedule
        return `Backups will run daily at ${timeFormatted}`;
      }
    }
    
    return 'Not scheduled';
  };

  const saveSchedule = async () => {
    setIsLoading(true);
    try {
      // Convert UpdateSchedule to backend format
      const [hour, minute] = updateSchedule.time.split(':').map(Number);
      const scheduleConfig = {
        enabled: updateSchedule.enabled,
        frequency: updateSchedule.frequency,
        hour: hour || 2,
        minute: minute || 0,
        dayOfWeek: updateSchedule.frequency === 'weekly' ? updateSchedule.dayOfWeek : undefined,
        dayOfMonth: updateSchedule.frequency === 'monthly' ? updateSchedule.dayOfMonth : undefined,
        activeBackupType: updateSchedule.activeBackupType,
        repositories: [],
        time: updateSchedule.time,
        // Add backup type info for ConfigTab
        backupType: updateSchedule.activeBackupType
      };
      
      // Save to backend
      await setScheduleConfig(scheduleConfig);
      
      onScheduleChange?.();
      
      showToast({
        message: `Schedule ${updateSchedule.enabled ? 'saved and enabled' : 'saved and disabled'} successfully`,
        variant: 'success',
        duration: 3000
      });
      
      // Reload schedule info to get updated status
      await loadScheduleConfig();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save schedule';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runBackupNow = async () => {
    setIsLoading(true);
    try {
      // Run backup script directly
      const result = await syncNow();
      
      showToast({
        message: 'Backup completed successfully',
        variant: 'success',
        duration: 3000
      });
      
      // Reload schedule info to get updated last run time
      await loadScheduleConfig();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run backup';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };


  // Show loading state while initial configuration is being loaded
  if (isInitialLoading) {
    return (
      <div className="update-schedule">
        <div className="schedule-form">
          <div className="loading-container">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
            <p>Loading schedule configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="update-schedule">
      <div className="schedule-form">
        {/* Toggle Switch */}
        <div 
          className={`update-schedule-toggle ${updateSchedule.enabled ? 'enabled' : ''}`}
          onClick={() => setUpdateSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
        >
          <div className={`schedule-toggle-switch ${updateSchedule.enabled ? 'enabled' : ''}`} />
          <div className="schedule-toggle-label">
            <h5 className="schedule-toggle-title">Automatic Backups</h5>
            <p className="schedule-toggle-description">
              {updateSchedule.enabled 
                ? 'Automatic backups are enabled and will run according to your schedule'
                : 'Enable automatic backups to keep your data protected with scheduled backups'
              }
            </p>
          </div>
        </div>
        
        {/* Schedule Options */}
        <div className={`schedule-options ${updateSchedule.enabled ? 'visible' : ''}`}>
          {/* Frequency Selection - constrained by backup type */}
          <div className="form-group">
            <div className="frequency-selector">
              {GENERIC_BACKUP_TYPE_INFO
                .find(type => type.value === updateSchedule.activeBackupType)
                ?.constraints.allowedFrequencies.map(frequency => {
                  const isActive = updateSchedule.frequency === frequency;
                  const icon = frequency === 'daily' ? faCalendarDay : frequency === 'weekly' ? faCalendarWeek : faCalendar;
                  
                  return (
                    <div 
                      key={frequency}
                      className={`frequency-option ${isActive ? 'active' : ''}`}
                      onClick={() => setUpdateSchedule(prev => ({ ...prev, frequency }))}
                    >
                      <FontAwesomeIcon icon={icon} className="icon" />
                      <span>{frequency.charAt(0).toUpperCase() + frequency.slice(1)}</span>
                    </div>
                  );
                })}
            </div>
            {/* Show constraint info for backup types that auto-schedule */}
            {GENERIC_BACKUP_TYPE_INFO
              .find(type => type.value === updateSchedule.activeBackupType)
              ?.constraints.autoSchedulesFull && (
              <div className="frequency-constraint-info">
                <small>
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  System automatically schedules daily differentials + weekly full backups
                </small>
              </div>
            )}
          </div>
          
          {/* Time and Day Selection */}
          <div className="form-row">
            <div className="form-group">
              <div className="time-input-group">
                <input
                  type="time"
                  className="form-control"
                  value={updateSchedule.time}
                  onChange={(e) => setUpdateSchedule(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            
            {updateSchedule.frequency === 'weekly' && (
              <div className="form-group">
                <div className="day-selector">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <div
                      key={day}
                      className={`day-option ${updateSchedule.dayOfWeek === index ? 'active' : ''}`}
                      onClick={() => setUpdateSchedule(prev => ({ ...prev, dayOfWeek: index }))}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {updateSchedule.frequency === 'monthly' && (
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faCalendar} className="icon" />
                  Day of Month
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="31"
                  value={updateSchedule.dayOfMonth || 1}
                  onChange={(e) => setUpdateSchedule(prev => ({ 
                    ...prev, 
                    dayOfMonth: parseInt(e.target.value) 
                  }))}
                />
              </div>
            )}
          </div>

          {/* Backup Type Selection */}
          <div className="form-group">
            <label>Backup Type</label>
            <div className="backup-type-selector">
              {GENERIC_BACKUP_TYPE_INFO.map(type => 
                tooltip.show(type.tooltip, (
                  <div
                    key={type.value}
                    className={`backup-type-option ${updateSchedule.activeBackupType === type.value ? 'active' : ''}`}
                    onClick={() => {
                      const newSchedule = { 
                        ...updateSchedule, 
                        activeBackupType: type.value as 'full' | 'incremental' | 'differential',
                        // Reset frequency to first allowed frequency for this type
                        frequency: type.constraints.allowedFrequencies[0]
                      };
                      setUpdateSchedule(newSchedule);
                    }}
                  >
                    <div className="backup-type-header">
                      <span className="backup-type-label">{type.label}</span>
                    </div>
                    <div className="backup-type-description">{type.description}</div>
                    <div className="backup-type-constraints">
                      <small>
                        {type.constraints.allowedFrequencies.length === 1 
                          ? `Schedule: ${type.constraints.allowedFrequencies[0]} only`
                          : `Schedule: ${type.constraints.allowedFrequencies.join(', ')}`
                        }
                      </small>
                    </div>
                    <div className="backup-type-note">
                      Configure retention settings in the Config tab
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          
          {/* Schedule Preview */}
          {updateSchedule.enabled && (
            <div className="schedule-preview">
              <h5>
                <FontAwesomeIcon icon={faEye} />
                Schedule Preview
              </h5>
              <div className="schedule-preview-text">
                <strong>{getSchedulePreview()}</strong>
              </div>
            </div>
          )}
        </div>
        
        {/* Schedule Status */}
        <div className="schedule-status">
          <h5>
            <FontAwesomeIcon icon={faClock} />
            Backup Status
          </h5>
          <div className="status-info">
            <div className="status-item">
              <strong>Next Scheduled Backup:</strong> 
              <span className="status-value">
                {getDeployedSchedule()}
              </span>
            </div>
            {/* TODO: Hook up last run information from backup logs - integrate with backup service logs */}
            {scheduleInfo?.last_run && (
              <div className="status-item">
                <strong>Last Run:</strong> 
                <span className="status-value">{scheduleInfo.last_run}</span>
              </div>
            )}
          </div>
        </div>

        <div className="schedule-actions">
          <button
            type="button"
            className="sync-now-button"
            onClick={runBackupNow}
            disabled={isLoading || apiLoading}
          >
            {(isLoading || apiLoading) ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Running...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlay} />
                Sync Now
              </>
            )}
          </button>
          
          <button
            type="button"
            className="save-schedule-button"
            onClick={saveSchedule}
            disabled={isLoading || apiLoading}
          >
            {(isLoading || apiLoading) ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                Save Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


export default ScheduleTab;
