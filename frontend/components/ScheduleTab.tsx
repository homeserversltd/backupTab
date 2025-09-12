/**
 * HOMESERVER Backup Schedule Tab Component
 * Backup scheduling and automation configuration
 */

import React from 'react';

interface ScheduleTabProps {
  // Future props for schedule configuration
}

export const ScheduleTab: React.FC<ScheduleTabProps> = () => {
  return (
    <div className="schedule-tab">
      <div className="schedule-panel">
        <h3>Backup Schedule</h3>
        <div className="schedule-placeholder">
          <div className="clock-icon">🕐</div>
          <p>Schedule configuration coming soon</p>
          <p>This will allow you to set up automated backup schedules</p>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTab;
