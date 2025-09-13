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
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { BackupScheduleConfig } from '../types';

interface ScheduleTabProps {
  schedules?: BackupScheduleConfig[];
  onScheduleChange?: (schedules: BackupScheduleConfig[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const BACKUP_TYPES = [
  { value: 'full', label: 'Full Backup', description: 'Complete system backup' },
  { value: 'incremental', label: 'Incremental', description: 'Only changed files since last backup' },
  { value: 'differential', label: 'Differential', description: 'All changes since last full backup' }
];

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ 
  schedules = [], 
  onScheduleChange 
}) => {
  const [currentSchedule, setCurrentSchedule] = useState<BackupScheduleConfig>({
    id: '1',
    name: 'Backup Schedule',
    enabled: false,
    frequency: 'daily',
    hour: 2,
    minute: 0,
    backupType: 'incremental',
    retentionDays: 30,
    repositories: [],
    status: 'never_run'
  });

  // Helper function to format schedule preview
  const getSchedulePreview = () => {
    if (!currentSchedule.enabled) return null;
    
    const timeFormatted = new Date(`2000-01-01T${currentSchedule.hour.toString().padStart(2, '0')}:${currentSchedule.minute.toString().padStart(2, '0')}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    switch (currentSchedule.frequency) {
      case 'daily':
        return `Backups will run daily at ${timeFormatted}`;
      case 'weekly': {
        const dayName = DAYS_OF_WEEK[currentSchedule.day || 0]?.label;
        return `Backups will run every ${dayName} at ${timeFormatted}`;
      }
      case 'monthly': {
        const dayOfMonth = currentSchedule.day || 1;
        const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
        return `Backups will run on the ${dayOfMonth}${suffix} of each month at ${timeFormatted}`;
      }
      case 'yearly':
        return `Backups will run yearly at ${timeFormatted}`;
      case 'custom':
        return `Custom schedule: ${currentSchedule.customCron || 'Not configured'}`;
      default:
        return '';
    }
  };

  const updateSchedule = (updates: Partial<BackupScheduleConfig>) => {
    const updated = { ...currentSchedule, ...updates };
    setCurrentSchedule(updated);
    onScheduleChange?.([updated]);
  };

  const saveSchedule = async () => {
    // Save the single schedule
    onScheduleChange?.([currentSchedule]);
  };

  return (
    <div className="schedule-tab">
      <div className="schedule-form">
        {/* Toggle Switch */}
        <div 
          className={`update-schedule-toggle ${currentSchedule.enabled ? 'enabled' : ''}`}
          onClick={() => updateSchedule({ enabled: !currentSchedule.enabled })}
        >
          <div className={`schedule-toggle-switch ${currentSchedule.enabled ? 'enabled' : ''}`} />
          <div className="schedule-toggle-label">
            <h5 className="schedule-toggle-title">Automatic Backups</h5>
            <p className="schedule-toggle-description">
              {currentSchedule.enabled 
                ? 'Automatic backups are enabled and will run according to your schedule'
                : 'Enable automatic backups to keep your data protected with scheduled backups'
              }
            </p>
          </div>
        </div>
        
        {/* Schedule Options */}
        <div className={`schedule-options ${currentSchedule.enabled ? 'visible' : ''}`}>
          {/* Frequency Selection */}
          <div className="form-group">
            <div className="frequency-selector">
              <div 
                className={`frequency-option ${currentSchedule.frequency === 'daily' ? 'active' : ''}`}
                onClick={() => updateSchedule({ frequency: 'daily' })}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="icon" />
                <span>Daily</span>
              </div>
              <div 
                className={`frequency-option ${currentSchedule.frequency === 'weekly' ? 'active' : ''}`}
                onClick={() => updateSchedule({ frequency: 'weekly' })}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="icon" />
                <span>Weekly</span>
              </div>
              <div 
                className={`frequency-option ${currentSchedule.frequency === 'monthly' ? 'active' : ''}`}
                onClick={() => updateSchedule({ frequency: 'monthly' })}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="icon" />
                <span>Monthly</span>
              </div>
              <div 
                className={`frequency-option ${currentSchedule.frequency === 'yearly' ? 'active' : ''}`}
                onClick={() => updateSchedule({ frequency: 'yearly' })}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="icon" />
                <span>Yearly</span>
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
                  value={`${currentSchedule.hour.toString().padStart(2, '0')}:${currentSchedule.minute.toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hour, minute] = e.target.value.split(':').map(Number);
                    updateSchedule({ hour: hour || 0, minute: minute || 0 });
                  }}
                />
              </div>
            </div>
            
            {currentSchedule.frequency === 'weekly' && (
              <div className="form-group">
                <div className="day-selector">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <div
                      key={day.value}
                      className={`day-option ${currentSchedule.day === day.value ? 'active' : ''}`}
                      onClick={() => updateSchedule({ day: day.value })}
                    >
                      {day.label.substring(0, 3)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {currentSchedule.frequency === 'monthly' && (
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faCalendarAlt} className="icon" />
                  Day of Month
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="31"
                  value={currentSchedule.day || 1}
                  onChange={(e) => updateSchedule({ day: parseInt(e.target.value) })}
                />
              </div>
            )}
          </div>

          {/* Backup Type and Retention */}
          <div className="form-row">
            <div className="form-group">
              <label>Backup Type</label>
              <select
                className="form-control"
                value={currentSchedule.backupType}
                onChange={(e) => updateSchedule({ backupType: e.target.value as any })}
              >
                {BACKUP_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Retention (Days)</label>
              <input
                type="number"
                className="form-control"
                value={currentSchedule.retentionDays}
                onChange={(e) => updateSchedule({ retentionDays: parseInt(e.target.value) })}
                min="1"
                max="3650"
              />
            </div>
          </div>
          
          {/* Schedule Preview */}
          {currentSchedule.enabled && (
            <div className="schedule-preview">
              <h5>
                <FontAwesomeIcon icon={faClock} />
                Schedule Preview
              </h5>
              <div className="schedule-preview-text">
                <strong>{getSchedulePreview()}</strong>
              </div>
            </div>
          )}
        </div>
        
        <button
          type="button"
          className="save-schedule-button"
          onClick={saveSchedule}
        >
          <FontAwesomeIcon icon={faCheckCircle} />
          Save Schedule
        </button>
      </div>
    </div>
  );
};


export default ScheduleTab;
