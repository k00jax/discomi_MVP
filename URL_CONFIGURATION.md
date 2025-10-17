# Omi App Store Submission - URL Configuration

## Quick Answer

**App Home URL**: `https://discomi-mvp-ochre.vercel.app`  
**Auth URL**: `https://discomi-mvp-ochre.vercel.app/setup`

Use **different URLs** for each field.

---

## Explanation

### **App Home URL** (Main Page)
- **Purpose**: The landing page users see when they open your app from their Omi app list
- **URL**: `https://discomi-mvp-ochre.vercel.app`
- **What happens**:
  - Omi appends `?uid=USER_UID` when user opens the app
  - Shows setup status (✅ Connected or ⚠️ Setup Required)
  - Displays app features and information
  - Provides button to go to setup page if needed

### **Auth URL** (Setup/Configuration Page)
- **Purpose**: Where users actually configure and authenticate your app
- **URL**: `https://discomi-mvp-ochre.vercel.app/setup`
- **What happens**:
  - Omi appends `?uid=USER_UID` when user clicks "Setup"
  - User enters their Discord webhook URL
  - System registers the user
  - User is ready to start using the app

---

## User Journey

1. **User installs DiscOmi from Omi App Store**
2. **User clicks "Open App"** → Redirected to App Home URL (`/?uid=XXX`)
   - Sees "⚠️ Setup Required" status
   - Clicks "Setup DiscOmi" button
3. **User is redirected to Auth URL** (`/setup?uid=XXX`)
   - Enters Discord webhook URL
   - Clicks "Register"
4. **User returns to App Home** (can reopen from Omi)
   - Now sees "✅ Connected to Discord" status
   - Can click "Change Discord Channel" if needed

---

## Complete Submission Info

Use this information when submitting to Omi App Store:

| Field | Value |
|-------|-------|
| **App Name** | DiscOmi |
| **Webhook URL** | `https://discomi-mvp-ochre.vercel.app/api/webhook?app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1` |
| **App Home URL** | `https://discomi-mvp-ochre.vercel.app` |
| **Auth URL** | `https://discomi-mvp-ochre.vercel.app/setup` |
| **Setup Complete URL** | `https://discomi-mvp-ochre.vercel.app/api/setup-complete` |
| **App Icon** | `https://discomi-mvp-ochre.vercel.app/discomi.png` |

---

## Testing

### Test App Home URL
```
https://discomi-mvp-ochre.vercel.app?uid=TEST_UID_123
```
- Should show "⚠️ Setup Required" (if not registered)
- Should show "Setup DiscOmi" button
- Click button → redirects to `/setup?uid=TEST_UID_123`

### Test Auth URL
```
https://discomi-mvp-ochre.vercel.app/setup?uid=TEST_UID_123
```
- Should auto-fill UID
- Enter Discord webhook URL
- Click Register
- Should show success message

### Test After Registration
```
https://discomi-mvp-ochre.vercel.app?uid=TEST_UID_123
```
- Should now show "✅ Connected to Discord"
- Should show "Change Discord Channel" button

---

## Why Separate URLs?

- **App Home**: Information and status dashboard
- **Auth URL**: Actual configuration/registration form

This separation allows:
- Users to check status without re-registering
- Better UX with clear status indication
- Ability to change settings later ("Change Discord Channel")
- Omi to know when setup is complete via the setup-complete endpoint
