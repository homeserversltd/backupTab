import React, { useState, useEffect } from 'react';

const RestoreTab: React.FC = () => {
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');

  // Check debug status on component mount
  useEffect(() => {
    checkDebugStatus();
  }, []);

  const checkDebugStatus = async () => {
    try {
      const response = await fetch('/api/backup/debug/status');
      const data = await response.json();
      if (data.success) {
        setDebugEnabled(data.data.enabled);
        setDebugMessage(data.data.message || '');
      }
    } catch (error) {
      console.error('Failed to check debug status:', error);
    }
  };

  const toggleDebug = async () => {
    console.log('Debug button clicked! Current state:', debugEnabled);
    try {
      const response = await fetch('/api/backup/debug/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !debugEnabled })
      });
      
      const data = await response.json();
      console.log('Debug toggle response:', data);
      if (data.success) {
        setDebugEnabled(data.data.enabled);
        setDebugMessage(data.data.message || '');
      }
    } catch (error) {
      console.error('Failed to toggle debug:', error);
    }
  };

  console.log('RestoreTab rendering, debugEnabled:', debugEnabled);
  
  return (
    <div className="restore-tab">
      {/* Debug Controls */}
      <div className="debug-controls">
        <button 
          onClick={toggleDebug} 
          className={`debug-toggle ${debugEnabled ? 'enabled' : 'disabled'}`}
          title={debugEnabled ? 'Disable debug mode' : 'Enable debug mode'}
          style={{
            position: 'relative',
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
        >
          🐛 Debug {debugEnabled ? 'ON' : 'OFF'}
        </button>
        {debugMessage && (
          <div className="debug-message">
            {debugMessage}
          </div>
        )}
      </div>
      
      <div className="restore-placeholder">
        <div className="placeholder-content">
          <h3>Coming Soon</h3>
          <p>Backup restore and decryption features are currently under development.</p>
          
          <div className="feature-list">
            <h4>Planned Features:</h4>
            <ul>
              <li>Restore files from backup archives</li>
              <li>Decrypt backup files without full restore</li>
              <li>Selective file recovery</li>
              <li>Backup verification and integrity checks</li>
              <li>Backup history and version management</li>
            </ul>
          </div>
          
          <div className="status-note">
            <p><strong>Note:</strong> Your backups are safely encrypted and stored. This interface will provide easy access to restore functionality once implemented.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreTab;
