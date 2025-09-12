# Google Drive Setup Modal Component

**HOMESERVER Backup System - Google Drive Integration Guide**

A comprehensive, user-friendly modal component for setting up Google Drive backup integration with the HOMESERVER backup system.

## Overview

The `GoogleDriveSetupModal` component provides a step-by-step guided experience for users to configure Google Drive as a backup destination. It handles the entire process from Google Cloud Console setup to credential configuration.

## Features

- **5-Step Guided Process**: Clear, sequential steps for Google Drive setup
- **Real-time JSON Validation**: Validates credentials JSON as user types
- **Interactive Progress Indicator**: Visual progress tracking through setup steps
- **Copy-to-Clipboard Functionality**: Easy copying of commands and sample data
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatic dark mode detection and styling
- **Advanced Options**: Manual configuration options for power users

## Component Props

```typescript
interface GoogleDriveSetupModalProps {
  isOpen: boolean;                    // Controls modal visibility
  onClose: () => void;               // Callback when modal is closed
  onCredentialsSubmit?: (credentials: string) => void;  // Callback when credentials are submitted
  className?: string;                // Additional CSS classes
}
```

## Usage Example

```tsx
import React, { useState } from 'react';
import GoogleDriveSetupModal from './GoogleDriveSetupModal';

const BackupSettings = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCredentialsSubmit = (credentials: string) => {
    // Send credentials to backend
    fetch('/api/backup/set-google-drive-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials_json: credentials })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Google Drive credentials configured successfully');
        // Refresh backup settings or show success message
      }
    });
  };

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        Configure Google Drive Backup
      </button>
      
      <GoogleDriveSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCredentialsSubmit={handleCredentialsSubmit}
      />
    </div>
  );
};
```

## Setup Steps

### Step 1: Google Cloud Project
- Navigate to Google Cloud Console
- Create or select a project
- Note the Project ID

### Step 2: Enable Google Drive API
- Go to APIs & Services → Library
- Search for "Google Drive API"
- Enable the API for the project

### Step 3: Create OAuth2 Credentials
- Navigate to APIs & Services → Credentials
- Create OAuth client ID
- Choose "Desktop application" type
- Download the JSON credentials file

### Step 4: Configure HOMESERVER
- Paste the credentials JSON into the modal
- Real-time validation ensures proper format
- Advanced options for manual configuration

### Step 5: Complete Setup
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
@app.route('/api/backup/set-google-drive-credentials', methods=['POST'])
def set_google_drive_credentials():
    try:
        credentials_json = request.json.get('credentials_json')
        
        # Validate JSON format
        json.loads(credentials_json)
        
        # Call backup CLI
        result = subprocess.run([
            'python3', 'backup', 'set-credentials-json', 
            'google_drive', '--json', credentials_json
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Credentials set successfully'})
        else:
            return jsonify({'success': False, 'error': result.stderr})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
```

## Styling

The component includes comprehensive CSS styling with:

- **Modern Design**: Clean, professional appearance
- **Color-coded Progress**: Visual step indicators
- **Interactive Elements**: Hover effects and transitions
- **Responsive Layout**: Mobile-friendly design
- **Dark Mode**: Automatic dark mode detection
- **Accessibility**: Proper contrast and focus states

## Validation

The component includes real-time validation for:

- **JSON Format**: Ensures valid JSON structure
- **Required Fields**: Checks for necessary OAuth2 fields
- **Visual Feedback**: Color-coded input states
- **Error Messages**: Clear validation messages

## Advanced Features

### Copy-to-Clipboard
- Sample credentials structure
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

## Testing

The component can be tested with sample credentials:

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

---

**Copyright (C) 2024 HOMESERVER LLC - All rights reserved.**
