/**
 * HOMESERVER Backup Config Tab Component
 * Backup configuration and file management
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, 
  faEdit, 
  faCog,
  faSave,
  faSpinner,
  faCheckCircle,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { 
  BackupConfig, 
  BackupTypeConfig, 
  DEFAULT_BACKUP_TYPES,
  getBackupTypeInfo, 
  generateBackupSummary, 
  getConfigurationSummary,
  validateBackupConfig,
  GenericBackupConfig,
  GENERIC_BACKUP_TYPES,
  getGenericBackupTypeInfo,
  getDefaultGenericConfig,
  validateGenericBackupConfig,
  convertGenericToLegacy,
  convertLegacyToGeneric
} from '../types';
import { useTooltip } from '../../../../src/hooks/useTooltip'; //donot touch this
import { showToast } from '../../../../src/components/Popup/PopupManager'; //donot touch this

interface ConfigTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  onConfigUpdate?: (config: BackupConfig) => void;
  activeBackupType?: 'full' | 'incremental' | 'differential' | null; // From schedule tab
  hasActiveSchedule?: boolean; // Whether there's an active schedule
}

interface GenericBackupConfigState {
  full: GenericBackupConfig;
  incremental: GenericBackupConfig;
  differential: GenericBackupConfig;
}


export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  updateConfig,
  onConfigUpdate,
  activeBackupType = null,
  hasActiveSchedule = false
}) => {
  const [newFilePath, setNewFilePath] = useState('');
  const [encryptionEnabled, setEncryptionEnabled] = useState(config?.encryption_enabled || false);
  const [encryptionKey, setEncryptionKey] = useState(config?.encryption_key || '');
  const [encryptionSalt, setEncryptionSalt] = useState(config?.encryption_salt || '');
  const [version, setVersion] = useState<string>('1.0.0');
  const [recommendedPaths, setRecommendedPaths] = useState<string[]>([]);
  const [genericBackupConfig, setGenericBackupConfig] = useState<GenericBackupConfigState>({
    full: getDefaultGenericConfig('full'),
    incremental: getDefaultGenericConfig('incremental'),
    differential: getDefaultGenericConfig('differential')
  });
  // Remove local activeBackupType state - it comes from schedule tab now
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const tooltip = useTooltip();

  // Professional backup presets - the grunge way
  const backupPresets = [
    `/opt/gogs/repositories`,
    `/etc/postgresql/15/main`,
  ];

  // Get generic backup type information from utility module
  const GENERIC_BACKUP_TYPE_INFO = getGenericBackupTypeInfo();

  // Load version info on component mount
  useEffect(() => {
    loadVersionInfo();
    initializeRecommendedPaths();
    loadGenericBackupConfigFromConfig();
  }, []);

  // Load generic backup config from config when config changes
  useEffect(() => {
    loadGenericBackupConfigFromConfig();
  }, [config]);

  // Initialize recommended paths by filtering out already added ones
  const initializeRecommendedPaths = () => {
    if (!config?.backup_items) {
      setRecommendedPaths(backupPresets);
      return;
    }
    
    const availablePresets = backupPresets.filter(preset => 
      !config.backup_items.includes(preset)
    );
    setRecommendedPaths(availablePresets);
  };

  // Update recommended paths when config changes
  useEffect(() => {
    initializeRecommendedPaths();
  }, [config?.backup_items]);

  const loadVersionInfo = async () => {
    try {
      const response = await fetch('/api/backup/version');
      const data = await response.json();
      if (data.success) {
        setVersion(data.data.version);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load version info';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };


  const loadGenericBackupConfigFromConfig = () => {
    if (!config) return;
    
    // Load generic backup configuration if available
    let genericConfig = {
      full: getDefaultGenericConfig('full'),
      incremental: getDefaultGenericConfig('incremental'),
      differential: getDefaultGenericConfig('differential')
    };
    
    if (config.backupTypes) {
      try {
        const parsedBackupTypes = typeof config.backupTypes === 'string' 
          ? JSON.parse(config.backupTypes) 
          : config.backupTypes;
        
        // Convert legacy config to generic format if needed
        if (parsedBackupTypes.full) {
          genericConfig.full = convertLegacyToGeneric(parsedBackupTypes.full);
        }
        if (parsedBackupTypes.incremental) {
          genericConfig.incremental = convertLegacyToGeneric(parsedBackupTypes.incremental);
        }
        if (parsedBackupTypes.differential) {
          genericConfig.differential = convertLegacyToGeneric(parsedBackupTypes.differential);
        }
      } catch (e) {
        console.warn('Failed to parse backup types config, using defaults');
      }
    }
    
    setGenericBackupConfig(genericConfig);
  };


  const handleAddFile = async () => {
    if (!newFilePath.trim() || !config) return;
    
    try {
      const updatedConfig = {
        ...config,
        backup_items: [...(config.backup_items || []), newFilePath.trim()]
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        showToast({
          message: 'File added to backup list successfully',
          variant: 'success',
          duration: 3000
        });
        setNewFilePath('');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add file to backup list';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  const handleAddRecommendedPath = async (path: string) => {
    if (!config) return;
    
    try {
      const updatedConfig = {
        ...config,
        backup_items: [...(config.backup_items || []), path]
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        showToast({
          message: `Added ${path} to backup list`,
          variant: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add recommended path';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  const handleRemoveFile = async (index: number) => {
    if (!config) return;
    
    try {
      const removedPath = config.backup_items?.[index];
      const updatedConfig = {
        ...config,
        backup_items: config.backup_items?.filter((_, i) => i !== index) || []
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        // Return to recommended list if it was a preset
        if (removedPath && backupPresets.includes(removedPath)) {
          setRecommendedPaths(prev => [...prev, removedPath]);
        }
        
        showToast({
          message: 'File removed from backup list successfully',
          variant: 'success',
          duration: 3000
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove file from backup list';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    // Additional validation for incremental/differential backup logic
    const additionalErrors: string[] = [];
    const additionalWarnings: string[] = [];
    
    if (activeBackupType === 'incremental' || activeBackupType === 'differential') {
      const typeConfig = genericBackupConfig[activeBackupType];
      const interval = typeConfig.userConfig.fullRefreshInterval || 4;
      const unit = typeConfig.userConfig.fullRefreshIntervalUnit || 'weeks';
      const intervalDays = unit === 'weeks' ? interval * 7 : interval * 30;
      const retentionCount = typeConfig.userConfig.retentionCount;
      
      // If retention count is less than or equal to interval days, it's essentially daily full backups
      if (retentionCount <= intervalDays) {
        additionalWarnings.push(`${activeBackupType} backup with ${retentionCount} retention and ${interval} ${unit} interval is essentially daily full backups - consider using full backup type instead`);
      }
      
      // If retention count is much higher than interval, warn about storage usage
      if (retentionCount > intervalDays * 3) {
        additionalWarnings.push(`High retention count (${retentionCount} days) with ${interval} ${unit} interval will use significant storage space`);
      }
    }
    
    // Validate all generic backup type configurations
    const validationResults = Object.entries(genericBackupConfig).map(([type, typeConfig]) => ({
      type,
      ...validateGenericBackupConfig(typeConfig)
    }));
    
    const hasErrors = validationResults.some(result => !result.isValid) || additionalErrors.length > 0;
    const allWarnings = [...validationResults.flatMap(result => result.warnings), ...additionalWarnings];
    
    if (hasErrors) {
      const errorMessages = [
        ...validationResults
          .filter(result => !result.isValid)
          .flatMap(result => result.errors.map(error => `${result.type}: ${error}`)),
        ...additionalErrors
      ];
      
      showToast({
        message: `Configuration errors: ${errorMessages.join(', ')}`,
        variant: 'error',
        duration: 6000
      });
      return;
    }
    
    if (allWarnings.length > 0) {
      showToast({
        message: `Configuration warnings: ${allWarnings.join(', ')}`,
        variant: 'warning',
        duration: 5000
      });
    }
    
    setIsSaving(true);
    try {
      // Convert generic configs to legacy format for backend compatibility
      const legacyBackupTypes = {
        full: convertGenericToLegacy(genericBackupConfig.full),
        incremental: convertGenericToLegacy(genericBackupConfig.incremental),
        differential: convertGenericToLegacy(genericBackupConfig.differential)
      };
      
      const updatedConfig = {
        ...config,
        encryption_enabled: encryptionEnabled,
        encryption_key: encryptionKey || null,
        encryption_salt: encryptionSalt || null,
        backupTypes: legacyBackupTypes
      };
      
      const success = await updateConfig(updatedConfig);
      if (success) {
        // Update the main config state if callback is provided
        if (onConfigUpdate) {
          onConfigUpdate(updatedConfig);
        }
        
        showToast({
          message: 'Configuration saved successfully',
          variant: 'success',
          duration: 3000
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      showToast({
        message: errorMessage,
        variant: 'error',
        duration: 4000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setEncryptionEnabled(false);
    setEncryptionKey('');
    setEncryptionSalt('');
    setGenericBackupConfig({
      full: getDefaultGenericConfig('full'),
      incremental: getDefaultGenericConfig('incremental'),
      differential: getDefaultGenericConfig('differential')
    });
    setShowAdvancedConfig(false);
    showToast({
      message: 'Settings reset to defaults',
      variant: 'info',
      duration: 3000
    });
  };

  if (!config) {
    return (
      <div className="config-tab">
        <div className="loading-state">
          <span>Loading backup configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="config-tab">
      <div className="config-panel">
        <h3>Backup Configuration</h3>
        
        <div className="config-section">
          <h4>Files & Directories to Backup</h4>
          
          {/* Recommended Paths Header Bar */}
          {recommendedPaths.length > 0 && (
            <div className="recommended-paths">
              <div className="recommended-header">
                <h5>Recommended</h5>
                <span className="recommended-count">{recommendedPaths.length} available</span>
              </div>
              <div className="recommended-pills">
                {recommendedPaths.map((path, index) => (
                  <button
                    key={index}
                    className="recommended-pill"
                    onClick={() => handleAddRecommendedPath(path)}
                    title={`Add ${path} to backup list`}
                  >
                    {path}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Input Section */}
          <div className="file-selection">
            <div className="file-input-group">
              <input
                type="text"
                placeholder="Enter file or directory path (manual entry)"
                className="file-path-input"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFile()}
              />
              <button 
                className="action-button secondary"
                onClick={handleAddFile}
                disabled={!newFilePath.trim()}
              >
                Add
              </button>
            </div>
            
            {/* Current Backup Items */}
            <div className="file-list">
              <div className="file-list-header">
                <h5>Current Backup Items ({config.backup_items?.length || 0})</h5>
              </div>
              {config.backup_items?.map((item, index) => (
                <div key={index} className="file-item">
                  <span className="file-path">{item}</span>
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveFile(index)}
                    title="Remove file from backup list"
                  >
                    ×
                  </button>
                </div>
              ))}
              {(!config.backup_items || config.backup_items.length === 0) && (
                <div className="empty-state">
                  <span>No backup items configured. Add paths manually or use recommended presets above.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Encryption Settings */}
        <div className="config-section">
          <h4>Encryption Settings</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <div className="checkbox-container">
                {tooltip.show(
                  'Encrypts data for cloud providers only - local NAS backups are never encrypted to avoid unnecessary overhead',
                  <>
                    <input
                      id="encryption-enabled"
                      type="checkbox"
                      checked={encryptionEnabled}
                      onChange={(e) => setEncryptionEnabled(e.target.checked)}
                    />
                    <label htmlFor="encryption-enabled">Enable Encryption (Cloud Providers Only)</label>
                  </>
                )}
              </div>
            </div>
            {encryptionEnabled && (
              <>
                <div className="setting-item">
                  <label htmlFor="encryption-key">Encryption Key</label>
                  <input
                    id="encryption-key"
                    type="password"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="form-input"
                  />
                  <small className="field-help">
                    Leave empty to auto-generate a secure key
                  </small>
                </div>
                <div className="setting-item">
                  <label htmlFor="encryption-salt">Encryption Salt</label>
                  <input
                    id="encryption-salt"
                    type="password"
                    value={encryptionSalt}
                    onChange={(e) => setEncryptionSalt(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="form-input"
                  />
                  <small className="field-help">
                    Leave empty to auto-generate a secure salt
                  </small>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Backup Type Configuration - Only show if there's an active schedule */}
        {hasActiveSchedule && activeBackupType && (
          <div className="config-section">
            <h4>Backup Type Configuration</h4>
            
            {/* Current Active Backup Type Display */}
            <div className="form-group">
              <div className="active-backup-type-display">
                {(() => {
                  const typeInfo = GENERIC_BACKUP_TYPE_INFO.find(type => type.value === activeBackupType);
                  if (!typeInfo) return null;
                  
                  return (
                    <div className="backup-type-display-card active">
                      <div className="backup-type-retention">
                        {(() => {
                          const retentionCount = genericBackupConfig[activeBackupType].userConfig.retentionCount;
                          const interval = genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval;
                          const unit = genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit;
                          
                          if (activeBackupType === 'full') {
                            return `Retaining ${retentionCount} days of backups (${retentionCount} full backups)`;
                          } else if (activeBackupType === 'incremental' || activeBackupType === 'differential') {
                            const intervalDays = unit === 'weeks' ? (interval || 4) * 7 : (interval || 4) * 30;
                            
                            if (retentionCount <= intervalDays) {
                              return `Retaining ${retentionCount} days of backups (${retentionCount} full backups - essentially daily full backups)`;
                            } else {
                              return `Retaining ${retentionCount} days of backups (full backup every ${interval} ${unit}, ${activeBackupType} backups daily)`;
                            }
                          }
                          return `Retaining ${retentionCount} days of backups`;
                        })()}
                        <div className="storage-projection">
                          {(() => {
                            const retentionDays = genericBackupConfig[activeBackupType].userConfig.retentionCount;
                            let estimatedStorage = '1GB';
                            
                            if (activeBackupType === 'full') {
                              // Full backups: retention days * 1GB per backup
                              estimatedStorage = `${retentionDays}GB`;
                            } else if (activeBackupType === 'incremental') {
                              // Incremental: mix of full backups + daily incrementals
                              const fullIntervalDays = genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit === 'weeks' 
                                ? (genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval ?? 4) * 7
                                : (genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval ?? 4) * 30;
                              const fullBackups = Math.ceil(retentionDays / fullIntervalDays);
                              // Each day gets one incremental backup (0.1GB), plus full backups (1GB each)
                              const totalStorage = fullBackups + (retentionDays * 0.1);
                              estimatedStorage = `${Math.round(totalStorage * 100) / 100}GB`;
                            } else if (activeBackupType === 'differential') {
                              // Differential: mix of full backups + growing differentials
                              const fullIntervalDays = genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit === 'weeks' 
                                ? (genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval ?? 4) * 7
                                : (genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval ?? 4) * 30;
                              const fullBackups = Math.ceil(retentionDays / fullIntervalDays);
                              // Each day gets one differential backup (0.3GB), plus full backups (1GB each)
                              const totalStorage = fullBackups + (retentionDays * 0.3);
                              estimatedStorage = `${Math.round(totalStorage * 100) / 100}GB`;
                            }
                            
                            return `This will turn 1GB into ${estimatedStorage}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Advanced Configuration Toggle */}
            <div className="form-group">
              <button
                type="button"
                className="advanced-config-toggle"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              >
                <FontAwesomeIcon icon={showAdvancedConfig ? faEye : faEdit} />
                {showAdvancedConfig ? 'Hide' : 'Show'} Configuration for {activeBackupType.charAt(0).toUpperCase() + activeBackupType.slice(1)} Backup
              </button>
            </div>

          {/* User Configuration Panel */}
          {showAdvancedConfig && (
            <div className="advanced-config-panel">
              <h5>Configuration - {activeBackupType.charAt(0).toUpperCase() + activeBackupType.slice(1)} Backup</h5>
              
              
              <div className="config-sections">
                {/* Retention Settings */}
                <div className="config-section">
                  <h6>Retention Policy</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Number of Backups to Keep</label>
                      <input
                        type="number"
                        className="form-control"
                        value={genericBackupConfig[activeBackupType].userConfig.retentionCount}
                        onChange={(e) => setGenericBackupConfig(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            userConfig: {
                              ...prev[activeBackupType].userConfig,
                              retentionCount: parseInt(e.target.value) || 1
                            }
                          }
                        }))}
                        min="1"
                        max={(() => {
                          if (activeBackupType === 'incremental' || activeBackupType === 'differential') {
                            // For incremental/differential, max retention should be reasonable based on frequency
                            const interval = genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval || 4;
                            const unit = genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit || 'weeks';
                            const intervalDays = unit === 'weeks' ? interval * 7 : interval * 30;
                            // Allow up to 2x the interval for reasonable retention
                            return Math.min(intervalDays * 2, 365);
                          }
                          return GENERIC_BACKUP_TYPE_INFO.find(t => t.value === activeBackupType)?.constraints.maxRetentionCount || 100;
                        })()}
                      />
                      <small className="field-help">
                        {(() => {
                          if (activeBackupType === 'incremental' || activeBackupType === 'differential') {
                            const interval = genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval || 4;
                            const unit = genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit || 'weeks';
                            const intervalDays = unit === 'weeks' ? interval * 7 : interval * 30;
                            const retentionCount = genericBackupConfig[activeBackupType].userConfig.retentionCount;
                            
                            if (retentionCount <= intervalDays) {
                              return `System manages intelligent rotation to keep this many backups (${retentionCount} days = ${retentionCount} full backups)`;
                            } else {
                              return `System manages intelligent rotation to keep this many backups (${retentionCount} days = mix of full and ${activeBackupType} backups)`;
                            }
                          }
                          return 'System manages intelligent rotation to keep this many backups';
                        })()}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Full Backup Frequency for Incremental and Differential */}
                {(activeBackupType === 'incremental' || activeBackupType === 'differential') && (
                  <div className="config-section">
                    <h6>Full Backup Frequency</h6>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Frequency Interval</label>
                        <input
                          type="number"
                          className="form-control"
                          value={genericBackupConfig[activeBackupType].userConfig.fullRefreshInterval || 4}
                          onChange={(e) => setGenericBackupConfig(prev => ({
                            ...prev,
                            [activeBackupType]: {
                              ...prev[activeBackupType],
                              userConfig: {
                                ...prev[activeBackupType].userConfig,
                                fullRefreshInterval: parseInt(e.target.value) || 1
                              }
                            }
                          }))}
                          min="1"
                          max={genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit === 'months' ? 12 : 52}
                        />
                      </div>
                      <div className="form-group">
                        <label>Interval Unit</label>
                        <select
                          className="form-control"
                          value={genericBackupConfig[activeBackupType].userConfig.fullRefreshIntervalUnit || 'weeks'}
                          onChange={(e) => setGenericBackupConfig(prev => ({
                            ...prev,
                            [activeBackupType]: {
                              ...prev[activeBackupType],
                              userConfig: {
                                ...prev[activeBackupType].userConfig,
                                fullRefreshIntervalUnit: e.target.value as 'weeks' | 'months'
                              }
                            }
                          }))}
                        >
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>
                    <small className="field-help">
                      System will automatically create full backups at this interval and run {activeBackupType} backups daily
                    </small>
                  </div>
                )}

              </div>
            </div>
          )}
          </div>
        )}

        <div className="config-actions">
          <button 
            className="action-button primary"
            onClick={handleSaveConfig}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                Save Configuration
              </>
            )}
          </button>
          <button 
            className="action-button secondary"
            onClick={handleResetToDefaults}
          >
            Reset to Defaults
          </button>
        </div>


        {/* About Section */}
        <div className="config-section">
          <h4>About & Updates</h4>
          <div className="about-content">
            <div className="about-info">
              <div className="info-item">
                <strong>Version:</strong> {version}
              </div>
              <div className="info-item">
                <strong>Tab Name:</strong> backupTab
              </div>
              <div className="info-item">
                <strong>Author:</strong> HOMESERVER LLC
              </div>
              <div className="info-item">
                <strong>Description:</strong> HOMESERVER Professional Backup System
              </div>
              <div className="info-item">
                <strong>Repository:</strong> <a href="https://github.com/homeserversltd/backupTab" target="_blank" rel="noopener noreferrer" className="github-link">GitHub - backupTab</a>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigTab;
