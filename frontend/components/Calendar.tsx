import React, { useState, useEffect } from 'react';
import { showModal, closeModal } from '../../../../src/components/Popup/PopupManager';

interface CalendarProps {
  frequency: 'weekly' | 'monthly';
  value: string; // Format: "YYYY-MM-DD" for monthly, "day-of-week" for weekly
  onChange: (value: string) => void;
  disabled?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ frequency, value, onChange, disabled = false }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('');

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Parse initial value
  useEffect(() => {
    if (frequency === 'weekly' && value) {
      setSelectedDayOfWeek(value);
    } else if (frequency === 'monthly' && value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
  }, [frequency, value]);

  const handleDateSelect = (dayNumber: number) => {
    const currentYear = new Date().getFullYear();
    const month = 0; // January (any month with 30 days)
    
    const date = new Date(currentYear, month, dayNumber);
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    onChange(dateStr);
    closeModal();
  };

  const handleDayOfWeekSelect = (day: string) => {
    setSelectedDayOfWeek(day);
    onChange(day);
    closeModal();
  };

  const formatDisplayValue = () => {
    if (frequency === 'weekly') {
      return selectedDayOfWeek || 'Select day';
    } else {
      return selectedDate ? selectedDate.toLocaleDateString() : 'Select date';
    }
  };

  const isSelected = (dayNumber: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === dayNumber;
  };

  const openCalendarModal = () => {
    if (disabled) return;
    
    const modalContent = (
      <div className="calendar-modal-content">
        <div className="calendar-body">
          {frequency === 'weekly' ? (
            <div className="weekly-selector">
              {weekDays.map(day => (
                <button
                  key={day}
                  className={`day-of-week-btn ${selectedDayOfWeek === day ? 'selected' : ''}`}
                  onClick={() => handleDayOfWeekSelect(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          ) : (
            <div className="monthly-calendar">
              <div className="calendar-month">
                January {new Date().getFullYear()}
              </div>
              
              <div className="simple-date-grid">
                {Array.from({ length: 30 }, (_, i) => i + 1).map(dayNumber => (
                  <button
                    key={dayNumber}
                    className={`simple-date-btn ${isSelected(dayNumber) ? 'selected' : ''}`}
                    onClick={() => handleDateSelect(dayNumber)}
                    title={`Backup on day ${dayNumber}`}
                  >
                    {dayNumber}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    showModal({
      title: frequency === 'weekly' ? 'Choose Backup Day' : 'Pick Monthly Backup Date',
      children: modalContent,
      hideActions: true,
      onClose: () => closeModal()
    });
  };

  return (
    <div className="calendar-container">
      <div 
        className={`calendar-input ${disabled ? 'disabled' : ''}`}
        onClick={openCalendarModal}
      >
        <span className="calendar-display">{formatDisplayValue()}</span>
        <span className="calendar-icon">📅</span>
      </div>
    </div>
  );
};

export default Calendar;
