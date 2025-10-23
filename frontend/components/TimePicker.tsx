import React, { useState, useEffect } from 'react';
import { showModal, closeModal } from '../../../components/Popup/PopupManager';

interface TimePickerProps {
  value: string; // Format: "HH:MM" (24-hour)
  onChange: (time: string) => void;
  disabled?: boolean;
}

// TimeSelectionModal component for the popup content
interface TimeSelectionModalProps {
  initialHour: number;
  initialMinute: number;
  initialIsAM: boolean;
  onTimeChange: (hour: number, minute: number, isAM: boolean) => void;
  onClose: () => void;
}

const TimeSelectionModal: React.FC<TimeSelectionModalProps> = ({
  initialHour,
  initialMinute,
  initialIsAM,
  onTimeChange,
  onClose
}) => {
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [isAM, setIsAM] = useState(initialIsAM);

  const generateHourOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  const generateMinuteOptions = () => {
    return Array.from({ length: 60 }, (_, i) => i);
  };

  const handleTimeChange = (newHour: number, newMinute: number, newIsAM: boolean) => {
    setHour(newHour);
    setMinute(newMinute);
    setIsAM(newIsAM);
  };

  const handleConfirm = () => {
    onTimeChange(hour, minute, isAM);
    onClose();
  };

  return (
    <div className="time-selection-modal">
      <div className="time-picker-body">
        <div className="time-picker-section">
          <label className="time-picker-label">Hour</label>
          <div className="time-picker-scroll">
            {generateHourOptions().map(h => (
              <button
                key={h}
                className={`time-picker-option ${hour === h ? 'selected' : ''}`}
                onClick={() => handleTimeChange(h, minute, isAM)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        
        <div className="time-picker-section">
          <label className="time-picker-label">Minute</label>
          <div className="time-picker-scroll">
            {generateMinuteOptions().map(m => (
              <button
                key={m}
                className={`time-picker-option ${minute === m ? 'selected' : ''}`}
                onClick={() => handleTimeChange(hour, m, isAM)}
              >
                {m.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
        
        <div className="time-picker-section">
          <label className="time-picker-label">Period</label>
          <div className="time-picker-period">
            <button
              className={`time-picker-period-btn ${isAM ? 'selected' : ''}`}
              onClick={() => handleTimeChange(hour, minute, true)}
            >
              AM
            </button>
            <button
              className={`time-picker-period-btn ${!isAM ? 'selected' : ''}`}
              onClick={() => handleTimeChange(hour, minute, false)}
            >
              PM
            </button>
          </div>
        </div>
      </div>
      
      <div className="time-picker-footer">
        <button 
          className="time-picker-confirm"
          onClick={handleConfirm}
        >
          Done
        </button>
      </div>
    </div>
  );
};

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled = false }) => {
  const [hour, setHour] = useState(2);
  const [minute, setMinute] = useState(0);
  const [isAM, setIsAM] = useState(true);

  // Parse the 24-hour time value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      const hour24 = h;
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      setHour(hour12);
      setMinute(m);
      setIsAM(hour24 < 12);
    }
  }, [value]);

  // Convert 12-hour time to 24-hour format
  const convertTo24Hour = (h12: number, minute: number, am: boolean): string => {
    let hour24 = h12;
    if (!am && h12 !== 12) hour24 += 12;
    if (am && h12 === 12) hour24 = 0;
    
    const hourStr = hour24.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    return `${hourStr}:${minuteStr}`;
  };

  const handleTimeChange = (newHour: number, newMinute: number, newIsAM: boolean) => {
    setHour(newHour);
    setMinute(newMinute);
    setIsAM(newIsAM);
    
    const time24 = convertTo24Hour(newHour, newMinute, newIsAM);
    onChange(time24);
  };

  const formatDisplayTime = () => {
    const hourStr = hour.toString();
    const minuteStr = minute.toString().padStart(2, '0');
    const period = isAM ? 'AM' : 'PM';
    return `${hourStr}:${minuteStr} ${period}`;
  };

  const openTimeModal = () => {
    if (disabled) return;
    
    const modalContent = (
      <TimeSelectionModal
        initialHour={hour}
        initialMinute={minute}
        initialIsAM={isAM}
        onTimeChange={handleTimeChange}
        onClose={() => closeModal()}
      />
    );

    showModal({
      title: 'Select Time',
      children: modalContent,
      hideActions: true,
      onClose: () => closeModal()
    });
  };

  return (
    <div className="time-picker-container">
      <div 
        className={`time-picker-input ${disabled ? 'disabled' : ''}`}
        onClick={openTimeModal}
      >
        <span className="time-display">{formatDisplayTime()}</span>
        <span className="time-picker-icon">🕐</span>
      </div>
    </div>
  );
};

export default TimePicker;
