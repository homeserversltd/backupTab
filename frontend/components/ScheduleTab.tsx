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
  const [schedulesList, setSchedulesList] = useState<BackupScheduleConfig[]>(schedules);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupScheduleConfig | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');

  // Initialize with sample data if none provided
  useEffect(() => {
    if (schedulesList.length === 0) {
      const sampleSchedules: BackupScheduleConfig[] = [
        {
          id: '1',
          name: 'Daily System Backup',
          enabled: true,
          frequency: 'daily',
          hour: 2,
          minute: 0,
          backupType: 'incremental',
          retentionDays: 30,
          repositories: ['system', 'documents'],
          lastRun: '2024-01-15T02:00:00Z',
          nextRun: '2024-01-16T02:00:00Z',
          status: 'active'
        },
        {
          id: '2',
          name: 'Weekly Full Backup',
          enabled: true,
          frequency: 'weekly',
          day: 0, // Sunday
          hour: 3,
          minute: 0,
          backupType: 'full',
          retentionDays: 90,
          repositories: ['system', 'documents', 'media'],
          lastRun: '2024-01-14T03:00:00Z',
          nextRun: '2024-01-21T03:00:00Z',
          status: 'active'
        }
      ];
      setSchedulesList(sampleSchedules);
    }
  }, [schedulesList.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <FontAwesomeIcon icon={faCheckCircle} className="status-active" />;
      case 'paused': return <FontAwesomeIcon icon={faPause} className="status-paused" />;
      case 'error': return <FontAwesomeIcon icon={faExclamationTriangle} className="status-error" />;
      default: return <FontAwesomeIcon icon={faClock} className="status-never-run" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'error': return 'status-error';
      default: return 'status-never-run';
    }
  };

  const formatNextRun = (schedule: BackupScheduleConfig) => {
    if (!schedule.nextRun) return 'Not scheduled';
    const date = new Date(schedule.nextRun);
    return date.toLocaleString();
  };

  const formatLastRun = (schedule: BackupScheduleConfig) => {
    if (!schedule.lastRun) return 'Never';
    const date = new Date(schedule.lastRun);
    return date.toLocaleString();
  };

  const toggleSchedule = (id: string) => {
    const updated = schedulesList.map(schedule => 
      schedule.id === id 
        ? { ...schedule, enabled: !schedule.enabled, status: (!schedule.enabled ? 'active' : 'paused') as 'active' | 'paused' | 'error' | 'never_run' }
        : schedule
    );
    setSchedulesList(updated);
    onScheduleChange?.(updated);
  };

  const deleteSchedule = (id: string) => {
    const updated = schedulesList.filter(schedule => schedule.id !== id);
    setSchedulesList(updated);
    onScheduleChange?.(updated);
  };

  const addNewSchedule = () => {
    const newSchedule: BackupScheduleConfig = {
      id: Date.now().toString(),
      name: 'New Backup Schedule',
      enabled: false,
      frequency: 'daily',
      hour: 2,
      minute: 0,
      backupType: 'incremental',
      retentionDays: 30,
      repositories: [],
      status: 'never_run'
    };
    setEditingSchedule(newSchedule);
    setShowAddModal(true);
  };

  const editSchedule = (schedule: BackupScheduleConfig) => {
    setEditingSchedule(schedule);
    setShowAddModal(true);
  };

  const saveSchedule = (schedule: BackupScheduleConfig) => {
    if (editingSchedule) {
      const updated = schedulesList.map(s => s.id === schedule.id ? schedule : s);
      setSchedulesList(updated);
      onScheduleChange?.(updated);
    } else {
      const updated = [...schedulesList, schedule];
      setSchedulesList(updated);
      onScheduleChange?.(updated);
    }
    setShowAddModal(false);
    setEditingSchedule(null);
  };

  const cancelEdit = () => {
    setShowAddModal(false);
    setEditingSchedule(null);
  };

  return (
    <div className="schedule-tab">
      <div className="schedule-header">
        <div className="schedule-title">
          <FontAwesomeIcon icon={faCalendarAlt} />
          <h2>Backup Schedules</h2>
        </div>
        <div className="schedule-controls">
          <div className="view-toggle">
            <button 
              className={currentView === 'list' ? 'active' : ''}
              onClick={() => setCurrentView('list')}
            >
              <FontAwesomeIcon icon={faClock} />
              List View
            </button>
            <button 
              className={currentView === 'calendar' ? 'active' : ''}
              onClick={() => setCurrentView('calendar')}
            >
              <FontAwesomeIcon icon={faCalendarAlt} />
              Calendar View
            </button>
          </div>
          <button className="add-schedule-btn" onClick={addNewSchedule}>
            <FontAwesomeIcon icon={faPlus} />
            Add Schedule
          </button>
        </div>
      </div>

      {currentView === 'list' ? (
        <div className="schedule-list">
          {schedulesList.length === 0 ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faCalendarAlt} />
              <h3>No Backup Schedules</h3>
              <p>Create your first backup schedule to get started with automated backups.</p>
              <button className="create-first-btn" onClick={addNewSchedule}>
                <FontAwesomeIcon icon={faPlus} />
                Create First Schedule
              </button>
            </div>
          ) : (
            <div className="schedules-grid">
              {schedulesList.map(schedule => (
                <div key={schedule.id} className={`schedule-card ${getStatusColor(schedule.status)}`}>
                  <div className="schedule-card-header">
                    <div className="schedule-info">
                      <h3>{schedule.name}</h3>
                      <div className="schedule-status">
                        {getStatusIcon(schedule.status)}
                        <span>{schedule.status.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="schedule-actions">
                      <button 
                        className="toggle-btn"
                        onClick={() => toggleSchedule(schedule.id)}
                        title={schedule.enabled ? 'Pause Schedule' : 'Enable Schedule'}
                      >
                        {schedule.enabled ? <FontAwesomeIcon icon={faPause} /> : <FontAwesomeIcon icon={faPlay} />}
                      </button>
                      <button 
                        className="edit-btn"
                        onClick={() => editSchedule(schedule)}
                        title="Edit Schedule"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteSchedule(schedule.id)}
                        title="Delete Schedule"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="schedule-details">
                    <div className="detail-row">
                      <span className="detail-label">Frequency:</span>
                      <span className="detail-value">
                        {schedule.frequency === 'daily' ? 'Daily' :
                         schedule.frequency === 'weekly' ? `Weekly (${DAYS_OF_WEEK[schedule.day || 0]?.label})` :
                         schedule.frequency === 'monthly' ? `Monthly (Day ${schedule.day || 1})` :
                         schedule.frequency === 'yearly' ? 'Yearly' : 'Custom'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">
                        {(() => {
                          const hourValue = schedule.hour;
                          const minuteValue = schedule.minute < 10 ? `0${schedule.minute}` : `${schedule.minute}`;
                          const amPm = hourValue < 12 ? 'AM' : 'PM';
                          const hour12 = hourValue === 0 ? 12 : hourValue > 12 ? hourValue - 12 : hourValue;
                          return `${hour12}:${minuteValue} ${amPm}`;
                        })()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">
                        {BACKUP_TYPES.find(t => t.value === schedule.backupType)?.label}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Retention:</span>
                      <span className="detail-value">{schedule.retentionDays} days</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Next Run:</span>
                      <span className="detail-value">{formatNextRun(schedule)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Run:</span>
                      <span className="detail-value">{formatLastRun(schedule)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="schedule-calendar">
          <div className="calendar-header">
            <h3>Backup Schedule Calendar</h3>
            <p>Calendar view coming soon - this will show scheduled backups on a calendar interface</p>
          </div>
          <div className="calendar-placeholder">
            <FontAwesomeIcon icon={faCalendarAlt} />
            <p>Calendar view will be implemented in a future update</p>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showAddModal && editingSchedule && (
        <ScheduleModal
          schedule={editingSchedule}
          onSave={saveSchedule}
          onCancel={cancelEdit}
          isEditing={!!editingSchedule.id && schedulesList.some(s => s.id === editingSchedule.id)}
        />
      )}
    </div>
  );
};

// Schedule Modal Component
interface ScheduleModalProps {
  schedule: BackupScheduleConfig;
  onSave: (schedule: BackupScheduleConfig) => void;
  onCancel: () => void;
  isEditing: boolean;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ 
  schedule, 
  onSave, 
  onCancel, 
  isEditing 
}) => {
  const [formData, setFormData] = useState<BackupScheduleConfig>(schedule);

  const handleSave = () => {
    onSave(formData);
  };

  const updateFormData = (updates: Partial<BackupScheduleConfig>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="schedule-modal-overlay">
      <div className="schedule-modal">
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Schedule' : 'Create New Schedule'}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="form-group">
            <label>Schedule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="Enter schedule name"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => updateFormData({ enabled: e.target.checked })}
              />
              Enable this schedule
            </label>
          </div>

          <div className="form-group">
            <label>Frequency</label>
            <select
              value={formData.frequency}
              onChange={(e) => updateFormData({ frequency: e.target.value as any })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom (Cron)</option>
            </select>
          </div>

          {formData.frequency === 'weekly' && (
            <div className="form-group">
              <label>Day of Week</label>
              <select
                value={formData.day || 1}
                onChange={(e) => updateFormData({ day: parseInt(e.target.value) })}
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.frequency === 'monthly' && (
            <div className="form-group">
              <label>Day of Month</label>
              <select
                value={formData.day || 1}
                onChange={(e) => updateFormData({ day: parseInt(e.target.value) })}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Time</label>
            <div className="time-selects">
              <select
                value={formData.hour}
                onChange={(e) => updateFormData({ hour: parseInt(e.target.value) })}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const hourValue = i;
                  const amPm = hourValue < 12 ? 'AM' : 'PM';
                  const hour12 = hourValue === 0 ? 12 : hourValue > 12 ? hourValue - 12 : hourValue;
                  return (
                    <option key={hourValue} value={hourValue}>
                      {hour12} {amPm}
                    </option>
                  );
                })}
              </select>
              <span>:</span>
              <select
                value={formData.minute}
                onChange={(e) => updateFormData({ minute: parseInt(e.target.value) })}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {i < 10 ? `0${i}` : `${i}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Backup Type</label>
            <select
              value={formData.backupType}
              onChange={(e) => updateFormData({ backupType: e.target.value as any })}
            >
              {BACKUP_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Retention (Days)</label>
            <input
              type="number"
              value={formData.retentionDays}
              onChange={(e) => updateFormData({ retentionDays: parseInt(e.target.value) })}
              min="1"
              max="3650"
            />
          </div>

          {formData.frequency === 'custom' && (
            <div className="form-group">
              <label>Cron Expression</label>
              <input
                type="text"
                value={formData.customCron || ''}
                onChange={(e) => updateFormData({ customCron: e.target.value })}
                placeholder="0 2 * * * (daily at 2 AM)"
              />
              <small>Format: minute hour day month weekday</small>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="action-button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="action-button primary" onClick={handleSave}>
            {isEditing ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTab;
