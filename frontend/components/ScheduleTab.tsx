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
import { BackupScheduleConfig, ScheduleInfo } from '../types';
import { showToast } from '../../../../src/components/Popup/PopupManager'; //donot touch this
import { useTooltip } from '../../../../src/hooks/useTooltip';
import { useBackupControls } from '../hooks/useBackupControls';
import './ScheduleTab.css';

interface ScheduleTabProps {
  schedules?: BackupScheduleConfig[];
  onScheduleChange?: (schedules: BackupScheduleConfig[]) => void;
}

interface UpdateSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

const BACKUP_TYPES = [
  { 
    value: 'full', 
    label: 'Full Backup', 
    description: 'Complete system backup',
    tooltip: 'Creates a complete backup of all selected files and directories. This is the most comprehensive backup type but requires the most storage space and time.'
  },
  { 
    value: 'incremental', 
    label: 'Incremental', 
    description: 'Only changed files since last backup',
    tooltip: 'Backs up only files that have changed since the last backup (full or incremental). Fast and storage-efficient, but requires all previous backups to restore.'
  },
  { 
    value: 'differential', 
    label: 'Differential', 
    description: 'All changes since last full backup',
    tooltip: 'Backs up all files that have changed since the last full backup. Faster than full backups but requires only the last full backup plus the differential to restore.'
  }
];

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ 
  schedules = [], 
  onScheduleChange 
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
    dayOfWeek: 0
  });

  const [backupType, setBackupType] = useState<'full' | 'incremental' | 'differential'>('incremental');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);

  // Load current schedule configuration on mount
  useEffect(() => {
    loadScheduleConfig();
  }, []);

  // TODO: Add real-time status updates for backup progress
  // TODO: Implement backup history/logs integration
  // TODO: Add backup size and storage usage information
  // TODO: Add backup validation and health checks

  const loadScheduleConfig = async () => {
    try {
      const schedule = await getSchedule();
      setScheduleInfo(schedule);
      
      // Parse existing schedule configuration if available
      if (schedule.schedule_config) {
        const config = schedule.schedule_config;
        setUpdateSchedule({
          enabled: Boolean(config.enabled), // Use the enabled flag from config, not timer_status
          frequency: (config.frequency as 'daily' | 'weekly' | 'monthly') || 'weekly',
          time: config.time || '02:00',
          dayOfWeek: typeof config.dayOfWeek === 'number' ? config.dayOfWeek : 0,
          dayOfMonth: typeof config.dayOfMonth === 'number' ? config.dayOfMonth : 1
        });
        setBackupType((config.backupType as 'full' | 'incremental' | 'differential') || 'incremental');
        setRetentionDays(typeof config.retentionDays === 'number' ? config.retentionDays : 30);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load schedule configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
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
    
    switch (updateSchedule.frequency) {
      case 'daily':
        return `Backups will run daily at ${timeFormatted}`;
      case 'weekly': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[updateSchedule.dayOfWeek || 0];
        return `Backups will run every ${dayName} at ${timeFormatted}`;
      }
      case 'monthly': {
        const dayOfMonth = updateSchedule.dayOfMonth || 1;
        const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
        return `Backups will run on the ${dayOfMonth}${suffix} of each month at ${timeFormatted}`;
      }
      default:
        return '';
    }
  };

  // Helper function to format deployed schedule (what's actually in cron)
  const getDeployedSchedule = () => {
    if (!scheduleInfo?.schedule_config?.enabled) return 'Not scheduled';
    
    const config = scheduleInfo.schedule_config;
    
    // If we have the frontend configuration format, use it directly
    if (config.frequency && config.time) {
      const timeFormatted = new Date(`2000-01-01T${config.time}`).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      switch (config.frequency) {
        case 'daily':
          return `Backups will run daily at ${timeFormatted}`;
        case 'weekly': {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayIndex = typeof config.dayOfWeek === 'number' ? config.dayOfWeek : parseInt(config.dayOfWeek as string) || 0;
          const dayName = days[dayIndex];
          return `Backups will run every ${dayName} at ${timeFormatted}`;
        }
        case 'monthly': {
          const dayOfMonth = typeof config.dayOfMonth === 'number' ? config.dayOfMonth : parseInt(config.dayOfMonth as string) || 1;
          const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
          return `Backups will run on the ${dayOfMonth}${suffix} of each month at ${timeFormatted}`;
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
        backupType: backupType,
        retentionDays: retentionDays,
        repositories: [],
        time: updateSchedule.time
      };
      
      // Save to backend
      await setScheduleConfig(scheduleConfig);
      
      // Update local state
      const updatedSchedule: BackupScheduleConfig = {
        id: '1',
        name: 'Backup Schedule',
        enabled: updateSchedule.enabled,
        frequency: updateSchedule.frequency,
        hour: hour || 2,
        minute: minute || 0,
        day: updateSchedule.frequency === 'weekly' ? updateSchedule.dayOfWeek : 
             updateSchedule.frequency === 'monthly' ? updateSchedule.dayOfMonth : undefined,
        backupType: backupType,
        retentionDays: retentionDays,
        repositories: [],
        status: updateSchedule.enabled ? 'active' : 'paused'
      };
      
      onScheduleChange?.([updatedSchedule]);
      
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
          {/* Frequency Selection */}
          <div className="form-group">
            <div className="frequency-selector">
              <div 
                className={`frequency-option ${updateSchedule.frequency === 'daily' ? 'active' : ''}`}
                onClick={() => setUpdateSchedule(prev => ({ ...prev, frequency: 'daily' }))}
              >
                <FontAwesomeIcon icon={faCalendarDay} className="icon" />
                <span>Daily</span>
              </div>
              <div 
                className={`frequency-option ${updateSchedule.frequency === 'weekly' ? 'active' : ''}`}
                onClick={() => setUpdateSchedule(prev => ({ ...prev, frequency: 'weekly' }))}
              >
                <FontAwesomeIcon icon={faCalendarWeek} className="icon" />
                <span>Weekly</span>
              </div>
              <div 
                className={`frequency-option ${updateSchedule.frequency === 'monthly' ? 'active' : ''}`}
                onClick={() => setUpdateSchedule(prev => ({ ...prev, frequency: 'monthly' }))}
              >
                <FontAwesomeIcon icon={faCalendar} className="icon" />
                <span>Monthly</span>
              </div>
            </div>
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

          {/* Backup Type and Retention */}
          <div className="form-row">
            <div className="form-group">
              <label>Backup Type</label>
              <div className="backup-type-selector">
                {BACKUP_TYPES.map(type => 
                  tooltip.show(type.tooltip, (
                    <div
                      key={type.value}
                      className={`backup-type-option ${backupType === type.value ? 'active' : ''}`}
                      onClick={() => setBackupType(type.value as any)}
                    >
                      <div className="backup-type-header">
                        <span className="backup-type-label">{type.label}</span>
                      </div>
                      <div className="backup-type-description">{type.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label>Retention (Days)</label>
              <input
                type="number"
                className="form-control"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                min="1"
                max="3650"
              />
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
