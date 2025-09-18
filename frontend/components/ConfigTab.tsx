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
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { 
  BackupConfig, 
  BackupTypeConfig, 
  DEFAULT_BACKUP_TYPES,
  getBackupTypeInfo, 
  generateBackupSummary, 
  getConfigurationSummary,
  validateBackupConfig
} from '../types';
import { useTooltip } from '../../../../src/hooks/useTooltip'; //donot touch this
import { showToast } from '../../../../src/components/Popup/PopupManager'; //donot touch this

interface ConfigTabProps {
  config: BackupConfig | null;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  onConfigUpdate?: (config: BackupConfig) => void;
}

interface BackupTypeConfigState {
  full: BackupTypeConfig;
  incremental: BackupTypeConfig;
  differential: BackupTypeConfig;
}


export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  updateConfig,
  onConfigUpdate
}) => {
  const [newFilePath, setNewFilePath] = useState('');
  const [encryptionEnabled, setEncryptionEnabled] = useState(config?.encryption_enabled || false);
  const [encryptionKey, setEncryptionKey] = useState(config?.encryption_key || '');
  const [encryptionSalt, setEncryptionSalt] = useState(config?.encryption_salt || '');
  const [version, setVersion] = useState<string>('1.0.0');
  const [recommendedPaths, setRecommendedPaths] = useState<string[]>([]);
  const [backupTypes, setBackupTypes] = useState<BackupTypeConfigState>({ ...DEFAULT_BACKUP_TYPES });
  const [activeBackupType, setActiveBackupType] = useState<'full' | 'incremental' | 'differential'>('incremental');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const tooltip = useTooltip();

  // Professional backup presets - the grunge way
  const backupPresets = [
    `/opt/gogs/repositories`,
    `/etc/postgresql/15/main`,
  ];

  // Get backup type information from utility module
  const BACKUP_TYPE_INFO = getBackupTypeInfo();

  // Load version info on component mount
  useEffect(() => {
    loadVersionInfo();
    initializeRecommendedPaths();
    loadBackupTypesFromConfig();
  }, []);

  // Load backup types from config when config changes
  useEffect(() => {
    loadBackupTypesFromConfig();
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


  const loadBackupTypesFromConfig = () => {
    if (!config) return;
    
    // Load backup types configuration if available
    let backupTypesConfig = { ...DEFAULT_BACKUP_TYPES };
    if (config.backupTypes) {
      try {
        const parsedBackupTypes = typeof config.backupTypes === 'string' 
          ? JSON.parse(config.backupTypes) 
          : config.backupTypes;
        backupTypesConfig = { ...DEFAULT_BACKUP_TYPES, ...parsedBackupTypes };
      } catch (e) {
        console.warn('Failed to parse backup types config, using defaults');
      }
    }
    
    setBackupTypes(backupTypesConfig);
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
    
    // Validate all backup type configurations
    const validationResults = Object.entries(backupTypes).map(([type, typeConfig]) => ({
      type,
      ...validateBackupConfig(typeConfig)
    }));
    
    const hasErrors = validationResults.some(result => !result.isValid);
    const allWarnings = validationResults.flatMap(result => result.warnings);
    
    if (hasErrors) {
      const errorMessages = validationResults
        .filter(result => !result.isValid)
        .flatMap(result => result.errors.map(error => `${result.type}: ${error}`));
      
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
      const updatedConfig = {
        ...config,
        encryption_enabled: encryptionEnabled,
        encryption_key: encryptionKey || null,
        encryption_salt: encryptionSalt || null,
        backupTypes: backupTypes
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
    setBackupTypes({ ...DEFAULT_BACKUP_TYPES });
    setActiveBackupType('incremental');
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

        {/* Backup Type Configuration */}
        <div className="config-section">
          <h4>Backup Type Configuration</h4>
          
          {/* Backup Type Selection */}
          <div className="form-group">
            <label>Active Backup Type</label>
            <div className="backup-type-selector">
              {BACKUP_TYPE_INFO.map(type => 
                tooltip.show(type.tooltip, (
                  <div
                    key={type.value}
                    className={`backup-type-option ${activeBackupType === type.value ? 'active' : ''}`}
                    onClick={() => setActiveBackupType(type.value as 'full' | 'incremental' | 'differential')}
                  >
                    <div className="backup-type-header">
                      <span className="backup-type-label">{type.label}</span>
                    </div>
                    <div className="backup-type-description">{type.description}</div>
                    <div className="backup-type-retention">
                      Retention: {backupTypes[type.value as keyof typeof backupTypes].retention.days} days
                      {backupTypes[type.value as keyof typeof backupTypes].retention.maxBackups && 
                        ` (max ${backupTypes[type.value as keyof typeof backupTypes].retention.maxBackups} backups)`
                      }
                    </div>
                    <div className="backup-type-summary">
                      {generateBackupSummary(
                        backupTypes[type.value as keyof typeof backupTypes], 
                        type.value === 'full' ? 'daily' : type.value === 'differential' ? 'daily' : 'daily'
                      )}
                    </div>
                  </div>
                ))
              )}
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
              {showAdvancedConfig ? 'Hide' : 'Show'} Advanced Configuration
            </button>
          </div>

          {/* Advanced Configuration Panel */}
          {showAdvancedConfig && (
            <div className="advanced-config-panel">
              <h5>Advanced Configuration - {activeBackupType.charAt(0).toUpperCase() + activeBackupType.slice(1)} Backup</h5>
              
              {/* Configuration Summary */}
              <div className="config-summary">
                <h6>Current Configuration Summary</h6>
                <div className="summary-grid">
                  {(() => {
                    const summary = getConfigurationSummary(backupTypes[activeBackupType]);
                    return Object.entries(summary).map(([key, value]) => (
                      <div key={key} className="summary-item">
                        <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
                      </div>
                    ));
                  })()}
                </div>
                <div className="backup-impact-summary">
                  <strong>Backup Impact:</strong> {generateBackupSummary(
                    backupTypes[activeBackupType],
                    activeBackupType === 'full' ? 'daily' : activeBackupType === 'differential' ? 'daily' : 'daily'
                  )}
                </div>
              </div>
              
              <div className="config-sections">
                {/* Retention Settings */}
                <div className="config-section">
                  <h6>Retention Policy</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Retention Days</label>
                      <input
                        type="number"
                        className="form-control"
                        value={backupTypes[activeBackupType].retention.days}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            retention: {
                              ...prev[activeBackupType].retention,
                              days: parseInt(e.target.value) || 30
                            }
                          }
                        }))}
                        min="1"
                        max="3650"
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Backups</label>
                      <input
                        type="number"
                        className="form-control"
                        value={backupTypes[activeBackupType].retention.maxBackups || ''}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            retention: {
                              ...prev[activeBackupType].retention,
                              maxBackups: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          }
                        }))}
                        min="1"
                        max="1000"
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={backupTypes[activeBackupType].retention.keepForever}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            retention: {
                              ...prev[activeBackupType].retention,
                              keepForever: e.target.checked
                            }
                          }
                        }))}
                      />
                      Keep forever (override retention days)
                    </label>
                  </div>
                </div>

                {/* Compression Settings */}
                <div className="config-section">
                  <h6>Compression</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={backupTypes[activeBackupType].compression.enabled}
                          onChange={(e) => setBackupTypes(prev => ({
                            ...prev,
                            [activeBackupType]: {
                              ...prev[activeBackupType],
                              compression: {
                                ...prev[activeBackupType].compression,
                                enabled: e.target.checked
                              }
                            }
                          }))}
                        />
                        Enable compression
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Algorithm</label>
                      <select
                        className="form-control"
                        value={backupTypes[activeBackupType].compression.algorithm}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            compression: {
                              ...prev[activeBackupType].compression,
                              algorithm: e.target.value as 'gzip' | 'lz4' | 'zstd'
                            }
                          }
                        }))}
                        disabled={!backupTypes[activeBackupType].compression.enabled}
                      >
                        <option value="gzip">Gzip (balanced)</option>
                        <option value="lz4">LZ4 (fast)</option>
                        <option value="zstd">Zstandard (efficient)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Level</label>
                      <input
                        type="range"
                        className="form-control"
                        min="1"
                        max="9"
                        value={backupTypes[activeBackupType].compression.level}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            compression: {
                              ...prev[activeBackupType].compression,
                              level: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
                            }
                          }
                        }))}
                        disabled={!backupTypes[activeBackupType].compression.enabled}
                      />
                      <span className="range-value">{backupTypes[activeBackupType].compression.level}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Settings */}
                <div className="config-section">
                  <h6>Performance</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Parallel Jobs</label>
                      <input
                        type="number"
                        className="form-control"
                        value={backupTypes[activeBackupType].performance.parallelJobs}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            performance: {
                              ...prev[activeBackupType].performance,
                              parallelJobs: parseInt(e.target.value) || 1
                            }
                          }
                        }))}
                        min="1"
                        max="16"
                      />
                    </div>
                    <div className="form-group">
                      <label>Chunk Size (MB)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={backupTypes[activeBackupType].performance.chunkSize}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            performance: {
                              ...prev[activeBackupType].performance,
                              chunkSize: parseInt(e.target.value) || 32
                            }
                          }
                        }))}
                        min="1"
                        max="1024"
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Bandwidth (KB/s)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={backupTypes[activeBackupType].performance.maxBandwidth || ''}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            performance: {
                              ...prev[activeBackupType].performance,
                              maxBandwidth: e.target.value ? parseInt(e.target.value) : null
                            }
                          }
                        }))}
                        min="1"
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                </div>

                {/* Verification Settings */}
                <div className="config-section">
                  <h6>Verification</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={backupTypes[activeBackupType].verification.enabled}
                          onChange={(e) => setBackupTypes(prev => ({
                            ...prev,
                            [activeBackupType]: {
                              ...prev[activeBackupType],
                              verification: {
                                ...prev[activeBackupType].verification,
                                enabled: e.target.checked
                              }
                            }
                          }))}
                        />
                        Enable verification
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={backupTypes[activeBackupType].verification.integrityCheck}
                          onChange={(e) => setBackupTypes(prev => ({
                            ...prev,
                            [activeBackupType]: {
                              ...prev[activeBackupType],
                              verification: {
                                ...prev[activeBackupType].verification,
                                integrityCheck: e.target.checked
                              }
                            }
                          }))}
                          disabled={!backupTypes[activeBackupType].verification.enabled}
                        />
                        Integrity check
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Verify Frequency</label>
                      <select
                        className="form-control"
                        value={backupTypes[activeBackupType].verification.frequency}
                        onChange={(e) => setBackupTypes(prev => ({
                          ...prev,
                          [activeBackupType]: {
                            ...prev[activeBackupType],
                            verification: {
                              ...prev[activeBackupType].verification,
                              frequency: e.target.value as 'every_backup' | 'weekly' | 'monthly'
                            }
                          }
                        }))}
                        disabled={!backupTypes[activeBackupType].verification.enabled}
                      >
                        <option value="every_backup">Every backup</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
