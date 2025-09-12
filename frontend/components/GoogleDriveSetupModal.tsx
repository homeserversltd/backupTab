/**
 * HOMESERVER Google Drive Setup Modal Component
 * Comprehensive setup guide for Google Drive backup integration
 */

import React, { useState } from 'react';

interface GoogleDriveSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsSubmit?: (credentials: string) => void;
  className?: string;
}

export const GoogleDriveSetupModal: React.FC<GoogleDriveSetupModalProps> = ({
  isOpen,
  onClose,
  onCredentialsSubmit,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [credentialsJson, setCredentialsJson] = useState('');
  const [isValidJson, setIsValidJson] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const totalSteps = 5;

  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const hasRequiredFields = parsed.installed && 
        parsed.installed.client_id && 
        parsed.installed.client_secret && 
        parsed.installed.project_id;
      setIsValidJson(hasRequiredFields);
      return hasRequiredFields;
    } catch {
      setIsValidJson(false);
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setCredentialsJson(value);
    validateJson(value);
  };

  const handleSubmit = () => {
    if (isValidJson && onCredentialsSubmit) {
      onCredentialsSubmit(credentialsJson);
      onClose();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sampleCredentials = {
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

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${className}`}>
      <div className="modal-content google-drive-setup-modal">
        <div className="modal-header">
          <h2>Google Drive Backup Setup</h2>
          <button className="modal-close" onClick={onClose}>×</button>
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
                    {i === 0 && 'Google Cloud'}
                    {i === 1 && 'API Setup'}
                    {i === 2 && 'Credentials'}
                    {i === 3 && 'Configuration'}
                    {i === 4 && 'Complete'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="setup-content">
            {currentStep === 1 && (
              <div className="setup-step">
                <h3>1. Create Google Cloud Project</h3>
                <div className="step-instructions">
                  <div className="instruction-item">
                    <div className="instruction-number">1</div>
                    <div className="instruction-text">
                      <strong>Go to Google Cloud Console</strong>
                      <p>Visit <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a></p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">2</div>
                    <div className="instruction-text">
                      <strong>Create or Select Project</strong>
                      <p>Create a new project or select an existing one for your HOMESERVER backup system</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">3</div>
                    <div className="instruction-text">
                      <strong>Note Project ID</strong>
                      <p>You'll need the Project ID for the next step. It's visible in the project selector dropdown.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="setup-step">
                <h3>2. Enable Google Drive API</h3>
                <div className="step-instructions">
                  <div className="instruction-item">
                    <div className="instruction-number">1</div>
                    <div className="instruction-text">
                      <strong>Navigate to APIs & Services</strong>
                      <p>In the Google Cloud Console, go to "APIs & Services" → "Library"</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">2</div>
                    <div className="instruction-text">
                      <strong>Search for Google Drive API</strong>
                      <p>Search for "Google Drive API" and click on it</p>
                    </div>
                  </div>
                  
                  <div className="instruction-item">
                    <div className="instruction-number">3</div>
                    <div className="instruction-text">
                      <strong>Enable the API</strong>
                      <p>Click "Enable" to activate the Google Drive API for your project</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="setup-step">
                <h3>3. Create OAuth2 Credentials</h3>
                <div className="step-instructions">
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
                </div>

                <div className="credentials-preview">
                  <h4>Your credentials file should look like this:</h4>
                  <div className="code-block">
                    <pre>{JSON.stringify(sampleCredentials, null, 2)}</pre>
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(JSON.stringify(sampleCredentials, null, 2))}
                    >
                      Copy Sample
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="setup-step">
                <h3>4. Configure HOMESERVER Backup</h3>
                <div className="credentials-input">
                  <label htmlFor="credentials-json">
                    <strong>Paste your credentials JSON here:</strong>
                  </label>
                  <textarea
                    id="credentials-json"
                    value={credentialsJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder="Paste the contents of your downloaded credentials.json file here..."
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
                        <li>Place the credentials.json file in the backup directory</li>
                        <li>Use the CLI command: <code>python3 backup set-credentials-json google_drive --json 'YOUR_JSON_HERE'</code></li>
                        <li>Enable the provider: <code>python3 backup enable-provider google_drive</code></li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="setup-step">
                <h3>5. Setup Complete!</h3>
                <div className="completion-message">
                  <div className="success-icon">✓</div>
                  <h4>Google Drive backup is now configured</h4>
                  <p>Your HOMESERVER will now be able to create backups and store them in your Google Drive.</p>
                </div>

                <div className="next-steps">
                  <h4>What happens next:</h4>
                  <ul>
                    <li>First backup will open a browser for Google authentication</li>
                    <li>Sign in to your Google account and authorize the app</li>
                    <li>Future backups will run automatically without browser prompts</li>
                    <li>Backups will be stored in a "HOMESERVER Backups" folder in your Google Drive</li>
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

export default GoogleDriveSetupModal;
