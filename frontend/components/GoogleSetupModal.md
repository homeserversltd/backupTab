# Google Setup Modal Component

**HOMESERVER Backup System - Unified Google Integration Guide**

A comprehensive, step-by-step modal component for setting up both Google Drive and Google Cloud Storage backup integration with the HOMESERVER backup system.

## Overview

The `GoogleSetupModal` component provides a unified, guided experience for users to configure either Google Drive or Google Cloud Storage as backup destinations. It handles the entire process from Google Cloud Console setup to credential configuration with a clear fork in the road for users to choose their preferred storage method.

## Features

- **7-Step Guided Process**: Clear, sequential steps for Google setup
- **Provider Selection**: Fork in the road to choose between Google Drive and Google Cloud Storage
- **Real-time JSON Validation**: Validates credentials JSON as user types
- **Interactive Progress Indicator**: Visual progress tracking through setup steps
- **Copy-to-Clipboard Functionality**: Easy copying of commands and sample data
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatic dark mode detection and styling
- **Advanced Options**: Manual configuration options for power users

## Component Props

```typescript
interface GoogleSetupModalProps {
  isOpen: boolean;                    // Controls modal visibility
  onClose: () => void;               // Callback when modal is closed
  onCredentialsSubmit?: (provider: 'google_drive' | 'google_cloud_storage', credentials: string) => void;  // Callback when credentials are submitted
  className?: string;                // Additional CSS classes
}
```

## Usage Example

```tsx
import React, { useState } from 'react';
import GoogleSetupModal from './GoogleSetupModal';

const BackupSettings = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCredentialsSubmit = (provider: 'google_drive' | 'google_cloud_storage', credentials: string) => {
    // Send credentials to backend
    fetch('/api/backup/set-google-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider: provider,
        credentials_json: credentials 
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log(`${provider} credentials configured successfully`);
        // Refresh backup settings or show success message
      }
    });
  };

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        Configure Google Backup
      </button>
      
      <GoogleSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCredentialsSubmit={handleCredentialsSubmit}
      />
    </div>
  );
};
```

## Setup Steps

### Step 1: Create Google Account
- Sign up for Google Cloud Console
- Accept terms of service and billing terms
- Enable billing (required for both services)

### Step 2: Create Google Cloud Project
- Create a new project in Google Cloud Console
- Name the project (e.g., "HOMESERVER-Backups")
- Note the Project ID for later use

### Step 3: Enable Required APIs
- Navigate to APIs & Services → Library
- Search for and enable both:
  - **Google Drive API** (for Google Drive backup)
  - **Cloud Storage API** (for Google Cloud Storage backup)
- Verify both APIs appear in "Enabled APIs & services" list

### Step 4: Choose Your Backup Method
**Fork in the road** - Users choose between:

#### Google Drive Option
- Uses OAuth2 authentication
- Files stored in "HOMESERVER Backups" folder
- Easy to access and manage
- 15GB free storage

#### Google Cloud Storage Option
- Uses Service Account authentication
- Files stored in custom bucket
- More control and scalability
- Pay-per-use pricing

### Step 5: Create Credentials
**Google Drive Path:**
- Go to APIs & Services → Credentials
- Create OAuth Client ID
- Choose "Desktop application" type
- Download the JSON credentials file

**Google Cloud Storage Path:**
- Navigate to IAM & Admin → Service Accounts
- Create service account
- Assign "Storage Admin" role
- Create and download JSON key

### Step 6: Configure HOMESERVER
- Paste credentials JSON into the modal
- Real-time validation ensures proper format
- For Google Cloud Storage: Set project ID and bucket name
- Advanced options for manual configuration

### Step 7: Complete Setup
- Confirmation of successful configuration
- Next steps and testing instructions
- Copy-paste commands for testing

## Backend Integration

The modal expects the backend to handle credential submission via the `onCredentialsSubmit` callback. The backend should:

1. **Validate the JSON format** (already done in frontend)
2. **Call the backup CLI** with the credentials
3. **Update the configuration** in settings.json
4. **Return success/failure status**

### Backend API Endpoint Example

```python
@app.route('/api/backup/set-google-credentials', methods=['POST'])
def set_google_credentials():
    try:
        data = request.json
        provider = data.get('provider')
        credentials_json = data.get('credentials_json')
        
        # Validate provider
        if provider not in ['google_drive', 'google_cloud_storage']:
            return jsonify({'success': False, 'error': 'Invalid provider'})
        
        # Validate JSON format
        json.loads(credentials_json)
        
        # Call backup CLI
        result = subprocess.run([
            'python3', 'backup', 'set-credentials-json', 
            provider, '--json', credentials_json
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            return jsonify({'success': True, 'message': f'{provider} credentials set successfully'})
        else:
            return jsonify({'success': False, 'error': result.stderr})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
```

## Provider Comparison

| Feature | Google Drive | Google Cloud Storage |
|---------|--------------|---------------------|
| **Authentication** | OAuth2 | Service Account |
| **Storage Location** | Personal Drive folder | Dedicated bucket |
| **Access Method** | Browser-based auth | Programmatic access |
| **Free Tier** | 15GB | 5GB |
| **Pricing** | Fixed plans | Pay-per-use |
| **Use Case** | Personal backups | Enterprise/professional |
| **Setup Complexity** | Medium | High |
| **Scalability** | Limited | Unlimited |

## Styling

The component includes comprehensive CSS styling with:

- **Modern Design**: Clean, professional appearance with Google branding
- **Provider Cards**: Visual comparison between Google Drive and Cloud Storage
- **Color-coded Progress**: Visual step indicators
- **Interactive Elements**: Hover effects and transitions
- **Responsive Layout**: Mobile-friendly design
- **Dark Mode**: Automatic dark mode detection
- **Accessibility**: Proper contrast and focus states

## Validation

The component includes real-time validation for:

- **JSON Format**: Ensures valid JSON structure
- **Provider-specific Fields**: Checks for necessary OAuth2 or Service Account fields
- **Visual Feedback**: Color-coded input states
- **Error Messages**: Clear validation messages

## Advanced Features

### Copy-to-Clipboard
- Sample credentials structure for both providers
- Test commands
- Manual configuration commands

### Advanced Options
- Manual file placement instructions
- CLI command examples
- Alternative configuration methods

### Responsive Design
- Mobile-optimized layout
- Flexible progress indicator
- Touch-friendly controls
- Grid layout for provider selection

## Testing

The component can be tested with sample credentials:

### Google Drive Sample
```json
{
  "installed": {
    "client_id": "test-client-id.apps.googleusercontent.com",
    "project_id": "test-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "test-client-secret",
    "redirect_uris": ["http://localhost"]
  }
}
```

### Google Cloud Storage Sample
```json
{
  "type": "service_account",
  "project_id": "test-project-id",
  "private_key_id": "test-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nTEST_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "test@test-project-id.iam.gserviceaccount.com",
  "client_id": "test-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project-id.iam.gserviceaccount.com"
}
```

## Dependencies

- React 16.8+ (hooks support)
- Modern browser with clipboard API support
- CSS custom properties support for theming

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Accessibility

- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus management
- ARIA labels and descriptions

## Customization

The component can be customized through:

- **CSS Custom Properties**: Theme colors and spacing
- **Props**: Behavior and appearance options
- **CSS Classes**: Additional styling via className prop
- **Event Handlers**: Custom callback implementations

## Security Considerations

- **No Credential Storage**: Credentials are only passed to backend
- **Validation**: Frontend validates format before submission
- **HTTPS Required**: Should only be used over secure connections
- **Input Sanitization**: Backend should sanitize all inputs

## Future Enhancements

- **Multiple Provider Support**: Extend to other cloud providers
- **Credential Management**: Edit/update existing credentials
- **Test Connection**: Real-time connection testing
- **Progress Tracking**: Upload progress during first authentication
- **Error Recovery**: Better error handling and recovery options
- **Provider Recommendations**: Suggest best provider based on use case

---

**Copyright (C) 2024 HOMESERVER LLC - All rights reserved.**
