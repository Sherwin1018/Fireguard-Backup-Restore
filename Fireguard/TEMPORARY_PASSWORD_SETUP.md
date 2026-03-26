# Temporary Password Email Implementation Guide

This guide explains how to set up the temporary password feature for user registration in FireGuard.

## Overview

When a user creates an account:

1. A **temporary password** is automatically generated
2. An **email is sent** to the user with the temporary password
3. User logs in with the temporary password
4. User **must change the password** on first login (optional enforcement)

## Components Created/Modified

### 1. **Cloud Functions** (`functions/index.js`)

- Handles sending temporary passwords via email
- Uses **Firebase Cloud Functions** and **Nodemailer**
- Sends formatted email with temporary credentials

### 2. **Register Page** (`src/pages/RegisterPage.jsx`)

- Modified to generate temporary passwords instead of user-provided passwords
- Calls Cloud Function to send email
- Redirects to login page after registration
- Users input: Name, Email only (no password field)

### 3. **Change Password Modal** (`src/components/ChangePasswordModal.jsx`)

- Reusable modal component for changing passwords
- Requires current password for security
- Validates passwords match
- Can be used in SettingsPage or as part of first-login flow

### 4. **Settings Page** (`src/pages/SettingsPage.jsx`)

- Added "Account Security" section
- Button to open "Change Password" modal
- Users can change their password anytime

## Setup Instructions

### Step 1: Install Dependencies

In the `functions/` directory, install required packages:

```bash
cd functions
npm install
```

This installs:

- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Cloud Functions SDK
- `nodemailer` - Email sending library

### Step 2: Configure Email Service

#### Option A: Using Gmail (Recommended)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an **App Password**:

   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password

3. Set Firebase environment variables:
   ```bash
   firebase functions:config:set gmail.user="your-email@gmail.com" gmail.pass="your-app-password"
   ```

#### Option B: Using Other Email Services

Update the `transporter` configuration in `functions/index.js`:

```javascript
const transporter = nodemailer.createTransport({
  service: "your-email-service", // e.g., "sendgrid", "mailgun"
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

### Step 3: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This deploys the `sendTemporaryPassword` function to Firebase.

### Step 4: Update Email Template (Optional)

In `functions/index.js`, customize the email HTML template:

- Change the login URL from `http://localhost:5173/login` to your production URL
- Customize the message and branding
- Add company logo or other details

### Step 5: Test the Implementation

1. Run your app locally:

   ```bash
   npm run dev
   ```

2. Go to the Registration page
3. Fill in: Name and Email only
4. Click "Create account"
5. Check the email inbox for the temporary password
6. Log in with email and temporary password
7. Go to Settings → "Change Password" to change it

## Database Structure

### Firestore - User Document

```json
{
  "uid": "user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "user",
  "createdAt": "timestamp",
  "needsPasswordChange": true,
  "temporaryPasswordSet": true
}
```

## Security Considerations

1. **Temporary Password Expiry**: Consider adding expiry logic in the Cloud Function (currently set to never expire)
2. **Password Requirements**: Enforce strong password requirements when changing password
3. **Email Verification**: Optional - require email verification before account activation
4. **Audit Logging**: Log when passwords are changed for security audit trails
5. **Rate Limiting**: Add rate limiting to prevent abuse of password reset

## Optional Enhancements

### Force Password Change on First Login

To enforce password change on first login:

1. Update Dashboard.jsx to check `needsPasswordChange` flag:

   ```jsx
   const user = auth.currentUser;
   const userDoc = await getDoc(doc(firestore, "users", user.uid));

   if (userDoc.data()?.needsPasswordChange) {
     // Show modal forcing password change
   }
   ```

2. After password change, update the flag:
   ```jsx
   await updateDoc(doc(firestore, "users", user.uid), {
     needsPasswordChange: false,
   });
   ```

### Add Email Verification

Add to RegisterPage after account creation:

```jsx
await sendEmailVerification(user);
// User must verify email before password reset
```

### Customizable Temporary Passwords

Current implementation generates random 12-character passwords. To customize:

```javascript
// In RegisterPage.jsx - generateTemporaryPassword function
function generateTemporaryPassword() {
  const length = 16; // Change length
  const charset = "ABC123"; // Use specific characters only
  // ... rest of function
}
```

## Troubleshooting

### Email Not Sending

1. Check Firebase Cloud Functions logs:

   ```bash
   firebase functions:log
   ```

2. Verify Gmail app password is correct
3. Ensure 2FA is enabled on Gmail account
4. Check spam/promotions folder

### Function Deployment Issues

1. Ensure you're in the `functions/` directory
2. Check Node.js version: `node --version` (should be 18+)
3. Verify `firebase.json` exists in root directory
4. Clear cache: `rm -rf node_modules && npm install`

### Client-Side Issues

1. Ensure `firebase-functions` is installed in main project
2. Check browser console for errors
3. Verify Cloud Function name matches: `sendTemporaryPassword`
4. Check Firebase rules allow callable functions

## Future Enhancements

- [ ] SMS-based temporary password delivery
- [ ] QR code for two-factor authentication setup
- [ ] Passwordless authentication (magic links)
- [ ] OAuth integration (Google, GitHub)
- [ ] Password history to prevent reuse
- [ ] Account lockout after failed login attempts
