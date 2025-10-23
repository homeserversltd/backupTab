import React, { useState, useEffect } from 'react';
import { showModal, closeModal } from '../../../components/Popup/PopupManager';

interface CalendarProps {
  frequency: 'weekly' | 'monthly';
  value: string; // Format: "YYYY-MM-DD" for monthly, "day-of-week" for weekly
  onChange: (value: string) => void;
  disabled?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ frequency, value, onChange, disabled = false }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
  }, [frequency, value]);

  const handleDateSelect = (dayNumber: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get the last day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    // If the selected day is greater than the last day of the month, use the last day
    const actualDay = Math.min(dayNumber, lastDayOfMonth);
    
    const date = new Date(year, month, actualDay);
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const isSelected = (dayNumber: number) => {
    if (!selectedDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(dayNumber, lastDayOfMonth);
    return selectedDate.getDate() === actualDay && 
           selectedDate.getMonth() === month && 
           selectedDate.getFullYear() === year;
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
              <div className="calendar-nav">
                <button 
                  className="calendar-nav-btn"
                  onClick={() => navigateMonth('prev')}
                >
                  ‹
                </button>
                <span className="calendar-month">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => navigateMonth('next')}
                >
                  ›
                </button>
              </div>
              
              <div className="grid-header">
                <span>Select backup day (1-30)</span>
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
