/**
 * HOMESERVER Google Setup Modal Component
 * Unified setup guide for Google Drive and Google Cloud Storage backup integration
 */

import React, { useState } from 'react';

interface GoogleSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsSubmit?: (provider: 'google_drive' | 'google_cloud_storage', credentials: string) => void;
  className?: string;
}

export const GoogleSetupModal: React.FC<GoogleSetupModalProps> = ({
  isOpen,
  onClose,
  onCredentialsSubmit,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<'google_drive' | 'google_cloud_storage' | null>(null);
  const [credentialsJson, setCredentialsJson] = useState('');
  const [projectId, setProjectId] = useState('');
  const [bucketName, setBucketName] = useState('homeserver-backups');
  const [isValidJson, setIsValidJson] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const totalSteps = 6;

  const validateJson = (jsonString: string, provider: 'google_drive' | 'google_cloud_storage') => {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (provider === 'google_drive') {
        const hasRequiredFields = parsed.installed && 
          parsed.installed.client_id && 
          parsed.installed.client_secret && 
          parsed.installed.project_id;
        setIsValidJson(hasRequiredFields);
        return hasRequiredFields;
      } else {
        const hasRequiredFields = parsed.type === 'service_account' && 
          parsed.project_id && 
          parsed.private_key && 
          parsed.client_email;
        setIsValidJson(hasRequiredFields);
        return hasRequiredFields;
      }
    } catch {
      setIsValidJson(false);
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setCredentialsJson(value);
    if (selectedProvider) {
      validateJson(value, selectedProvider);
      
      // Auto-extract project_id if present
      try {
        const parsed = JSON.parse(value);
        if (parsed.project_id) {
          setProjectId(parsed.project_id);
        }
      } catch {
        // Ignore JSON parsing errors during typing
      }
    }
  };

  const handleSubmit = () => {
    if (isValidJson && selectedProvider && onCredentialsSubmit) {
      onCredentialsSubmit(selectedProvider, credentialsJson);
      onClose();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetModal = () => {
    setCurrentStep(1);
    setSelectedProvider(null);
    setCredentialsJson('');
    setProjectId('');
    setBucketName('homeserver-backups');
    setIsValidJson(false);
    setShowAdvanced(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getSampleCredentials = (provider: 'google_drive' | 'google_cloud_storage') => {
    if (provider === 'google_drive') {
      return {
        "installed": {
          "client_id": "your-client-id.apps.googleusercontent.com",
          "project_id": "your-project-id",
          "auth_uri": "https://accounts.google.com/o/oauth2/auth",
          "token_uri": "https://oauth2.googleapis.com/token",
          "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
          "client_secret": "your-client-secret",
          "redirect_uris": ["http://localhost"]
        }
      };
    } else {
      return {
        "type": "service_account",
        "project_id": "your-project-id",
        "private_key_id": "your-private-key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
        "client_email": "your-service-account@your-project-id.iam.gserviceaccount.com",
        "client_id": "your-client-id",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${className}`}>
      <div className="modal-content google-setup-modal">
        <div className="modal-header">
          <h2>Google Backup Setup</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Progress Indicator */}
          <div className="setup-progress">
            <div className="progress-steps">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div 
                  key={i + 1}
                  className={`progress-step ${currentStep >= i + 1 ? 'active' : ''}`}
                >
                  <div className="step-number">{i + 1}</div>
                  <div className="step-label">
                    {i === 0 && 'Account'}
                    {i === 1 && 'Project'}
                    {i === 2 && 'API'}
                    {i === 3 && 'Choose'}
                    {i === 4 && 'Credentials'}
                    {i === 5 && 'Complete'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="setup-content">
            {currentStep === 1 && (
              <div className="setup-step">
                <h3>1. Create Google Account</h3>
                <div className="step-instructions">
                  <div className="instruction-item">
                    <div className="instruction-number">1</div>
                    <div className="instruction-text">
                      <strong>Sign up for Google Cloud</strong>
                      <p>Visit <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a> and sign in with your Google account</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">2</div>
                    <div className="instruction-text">
                      <strong>Accept Terms</strong>
                      <p>Accept the Google Cloud Platform terms of service and billing terms</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">3</div>
                    <div className="instruction-text">
                      <strong>Enable Billing</strong>
                      <p>Add a payment method to enable billing (required for both services)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="setup-step">
                <h3>2. Create Google Cloud Project</h3>
                <div className="step-instructions">
                  <div className="instruction-item">
                    <div className="instruction-number">1</div>
                    <div className="instruction-text">
                      <strong>Create New Project</strong>
                      <p>Click "Select a project" → "New Project" in the Google Cloud Console</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">2</div>
                    <div className="instruction-text">
                      <strong>Name Your Project</strong>
                      <p>Give it a name like "HOMESERVER-Backups" and note the Project ID</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">3</div>
                    <div className="instruction-text">
                      <strong>Select Project</strong>
                      <p>Make sure your new project is selected in the project dropdown</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="setup-step">
                <h3>3. Enable Required APIs</h3>
                <div className="step-instructions">
                  <div className="instruction-item">
                    <div className="instruction-number">1</div>
                    <div className="instruction-text">
                      <strong>Go to APIs & Services</strong>
                      <p>In the Google Cloud Console, go to "APIs & Services" → "Library"</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">2</div>
                    <div className="instruction-text">
                      <strong>Search for APIs</strong>
                      <p>Search for and enable both:</p>
                      <ul>
                        <li><strong>Google Drive API</strong> (for Google Drive backup)</li>
                        <li><strong>Cloud Storage API</strong> (for Google Cloud Storage backup)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">3</div>
                    <div className="instruction-text">
                      <strong>Verify APIs are Enabled</strong>
                      <p>Go to "APIs & Services" → "Enabled APIs & services" to confirm both APIs appear in the list</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="setup-step">
                <h3>4. Choose Your Backup Method</h3>
                <div className="provider-selection">
                  <div className="provider-options">
                    <div 
                      className={`provider-option ${selectedProvider === 'google_drive' ? 'selected' : ''}`}
                      onClick={() => setSelectedProvider('google_drive')}
                    >
                      <div className="provider-icon">📁</div>
                      <h4>Google Drive</h4>
                      <p>Store backups in your personal Google Drive</p>
                      <ul>
                        <li>Uses OAuth2 authentication</li>
                        <li>Files stored in "HOMESERVER Backups" folder</li>
                        <li>Easy to access and manage</li>
                        <li>15GB free storage</li>
                      </ul>
                    </div>
                    
                    <div 
                      className={`provider-option ${selectedProvider === 'google_cloud_storage' ? 'selected' : ''}`}
                      onClick={() => setSelectedProvider('google_cloud_storage')}
                    >
                      <div className="provider-icon">☁️</div>
                      <h4>Google Cloud Storage</h4>
                      <p>Store backups in a dedicated cloud bucket</p>
                      <ul>
                        <li>Uses Service Account authentication</li>
                        <li>Files stored in custom bucket</li>
                        <li>More control and scalability</li>
                        <li>Pay-per-use pricing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && selectedProvider && (
              <div className="setup-step">
                <h3>5. Create Credentials</h3>
                <div className="step-instructions">
                  {selectedProvider === 'google_drive' ? (
                    <>
                      <div className="instruction-item">
                        <div className="instruction-number">1</div>
                        <div className="instruction-text">
                          <strong>Go to Credentials</strong>
                          <p>Navigate to "APIs & Services" → "Credentials"</p>
                        </div>
                      </div>
                      
                      <div className="instruction-item">
                        <div className="instruction-number">2</div>
                        <div className="instruction-text">
                          <strong>Create OAuth Client ID</strong>
                          <p>Click "Create Credentials" → "OAuth client ID"</p>
                        </div>
                      </div>
                      
                      <div className="instruction-item">
                        <div className="instruction-number">3</div>
                        <div className="instruction-text">
                          <strong>Choose Application Type</strong>
                          <p>Select "Desktop application" as the application type</p>
                        </div>
                      </div>
                      
                      <div className="instruction-item">
                        <div className="instruction-number">4</div>
                        <div className="instruction-text">
                          <strong>Download Credentials</strong>
                          <p>Download the JSON file containing your OAuth2 credentials</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="instruction-item">
                        <div className="instruction-number">1</div>
                        <div className="instruction-text">
                          <strong>Navigate to IAM & Admin</strong>
                          <p>Go to "IAM & Admin" → "Service Accounts"</p>
                        </div>
                      </div>
                      
                      <div className="instruction-item">
                        <div className="instruction-number">2</div>
                        <div className="instruction-text">
                          <strong>Create Service Account</strong>
                          <p>Click "Create Service Account" and give it a name like "homeserver-backup"</p>
                        </div>
                      </div>
                      
                      <div className="instruction-item">
                        <div className="instruction-number">3</div>
                        <div className="instruction-text">
                          <strong>Assign Roles</strong>
                          <p>Add the "Storage Admin" role to the service account</p>
                        </div>
                      </div>
                      
                      <div className="instruction-item">
                        <div className="instruction-number">4</div>
                        <div className="instruction-text">
                          <strong>Create Key</strong>
                          <p>Click on the service account → "Keys" → "Add Key" → "Create new key" → "JSON"</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="credentials-preview">
                  <h4>Your credentials file should look like this:</h4>
                  <div className="code-block">
                    <pre>{JSON.stringify(getSampleCredentials(selectedProvider), null, 2)}</pre>
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(JSON.stringify(getSampleCredentials(selectedProvider), null, 2))}
                    >
                      Copy Sample
                    </button>
                  </div>
                </div>

                {selectedProvider === 'google_cloud_storage' && (
                  <div className="configuration-form">
                    <div className="form-group">
                      <label htmlFor="project-id">
                        <strong>Project ID *</strong>
                      </label>
                      <input
                        id="project-id"
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="your-project-id"
                        className="form-input"
                      />
                      <small>Your Google Cloud project ID (will be auto-filled from credentials)</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="bucket-name">
                        <strong>Bucket Name *</strong>
                      </label>
                      <input
                        id="bucket-name"
                        type="text"
                        value={bucketName}
                        onChange={(e) => setBucketName(e.target.value)}
                        placeholder="homeserver-backups"
                        className="form-input"
                      />
                      <small>Name for your backup bucket (must be globally unique)</small>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 6 && selectedProvider && (
              <div className="setup-step">
                <h3>6. Configure HOMESERVER Backup</h3>
                <div className="credentials-input">
                  <label htmlFor="credentials-json">
                    <strong>Paste your credentials JSON here:</strong>
                  </label>
                  <textarea
                    id="credentials-json"
                    value={credentialsJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={`Paste the contents of your downloaded ${selectedProvider === 'google_drive' ? 'credentials.json' : 'service account key'} file here...`}
                    rows={12}
                    className={`credentials-textarea ${isValidJson ? 'valid' : credentialsJson ? 'invalid' : ''}`}
                  />
                  <div className="validation-message">
                    {isValidJson ? (
                      <span className="valid-message">✓ Valid credentials format detected</span>
                    ) : credentialsJson ? (
                      <span className="invalid-message">✗ Invalid JSON format or missing required fields</span>
                    ) : (
                      <span className="info-message">Paste your credentials JSON above</span>
                    )}
                  </div>
                </div>

                <div className="advanced-options">
                  <button 
                    className="toggle-advanced"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </button>
                  
                  {showAdvanced && (
                    <div className="advanced-content">
                      <h4>Manual Configuration (Advanced Users)</h4>
                      <p>If you prefer to configure manually, you can:</p>
                      <ul>
                        <li>Place the credentials file in the backup directory as <code>{selectedProvider === 'google_drive' ? 'google_drive_credentials.json' : 'gcs_credentials.json'}</code></li>
                        <li>Use the CLI command: <code>python3 backup set-credentials-json {selectedProvider} --json 'YOUR_JSON_HERE'</code></li>
                        {selectedProvider === 'google_cloud_storage' && (
                          <>
                            <li>Set project ID: <code>python3 backup set-config google_cloud_storage project_id 'YOUR_PROJECT_ID'</code></li>
                            <li>Set bucket name: <code>python3 backup set-config google_cloud_storage bucket_name 'YOUR_BUCKET_NAME'</code></li>
                          </>
                        )}
                        <li>Enable the provider: <code>python3 backup enable-provider {selectedProvider}</code></li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 7 && selectedProvider && (
              <div className="setup-step">
                <h3>7. Setup Complete!</h3>
                <div className="completion-message">
                  <div className="success-icon">✓</div>
                  <h4>{selectedProvider === 'google_drive' ? 'Google Drive' : 'Google Cloud Storage'} backup is now configured</h4>
                  <p>Your HOMESERVER will now be able to create backups and store them in your {selectedProvider === 'google_drive' ? 'Google Drive' : 'Google Cloud Storage bucket'}.</p>
                </div>

                <div className="next-steps">
                  <h4>What happens next:</h4>
                  <ul>
                    {selectedProvider === 'google_drive' ? (
                      <>
                        <li>First backup will open a browser for Google authentication</li>
                        <li>Sign in to your Google account and authorize the app</li>
                        <li>Future backups will run automatically without browser prompts</li>
                        <li>Backups will be stored in a "HOMESERVER Backups" folder in your Google Drive</li>
                      </>
                    ) : (
                      <>
                        <li>Bucket will be created automatically if it doesn't exist</li>
                        <li>Backups will be stored in the <code>{bucketName}</code> bucket</li>
                        <li>Files will be organized with timestamps and metadata</li>
                        <li>You can monitor usage and costs in the Google Cloud Console</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="test-options">
                  <h4>Test your setup:</h4>
                  <div className="test-commands">
                    <code>python3 backup test-providers</code>
                    <button onClick={() => copyToClipboard('python3 backup test-providers')}>
                      Copy
                    </button>
                  </div>
                  <div className="test-commands">
                    <code>python3 backup create --items /tmp/test.txt</code>
                    <button onClick={() => copyToClipboard('python3 backup create --items /tmp/test.txt')}>
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="setup-navigation">
            <button 
              className="nav-button secondary"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </button>
            
            <div className="step-indicator">
              Step {currentStep} of {totalSteps}
            </div>
            
            {currentStep < totalSteps ? (
              <button 
                className="nav-button primary"
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                disabled={
                  (currentStep === 4 && !selectedProvider) ||
                  (currentStep === 5 && selectedProvider === 'google_cloud_storage' && (!projectId || !bucketName))
                }
              >
                Next
              </button>
            ) : (
              <button 
                className="nav-button primary"
                onClick={handleSubmit}
                disabled={!isValidJson}
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSetupModal;
