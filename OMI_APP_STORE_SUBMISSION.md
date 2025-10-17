# DiscOmi App Store Submission Guide

## Overview
This guide provides all the information needed to submit DiscOmi to the Omi App Store so users can install and use it directly from their Omi device.

---

## Submission Information

### 1. App Name
```
DiscOmi
```

### 2. Webhook URL (Memory Creation Trigger)
```
https://discomi-mvp-ochre.vercel.app/api/webhook?app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1
```

**Note**: Omi will automatically append `&uid=USER_UID` when calling this webhook for each user.

### 3. Setup Completed URL (Optional but Recommended)
```
https://discomi-mvp-ochre.vercel.app/api/setup-complete
```

**What it does**: Returns `{"is_setup_completed": true/false}` based on whether the user has registered their Discord webhook URL.

### 4. App Home URL (Main Page)
```
https://discomi-mvp-ochre.vercel.app
```

**What it does**: 
- Main landing page shown when user opens DiscOmi from their Omi app list
- Omi appends `?uid=USER_UID` to this URL
- Shows setup status (connected vs. setup required)
- Provides "Setup" or "Change Discord Channel" button
- Displays app features and information

### 5. Auth/Setup URL (Where Users Configure)
```
https://discomi-mvp-ochre.vercel.app/setup
```

**What it does**: 
- Omi appends `?uid=USER_UID` to this URL when user clicks "Setup" button
- Setup page auto-fills the UID
- User enters their Discord webhook URL
- System registers the user and returns the complete webhook URL

### 6. Setup Instructions
```
# DiscOmi Setup Instructions

DiscOmi automatically posts your Omi memories to a Discord channel of your choice.

## Setup Steps:

1. **Get your Discord webhook URL:**
   - Open Discord and go to the channel where you want memories posted
   - Click the gear icon (Edit Channel)
   - Go to Integrations → Webhooks → New Webhook
   - Copy the webhook URL (starts with `https://discord.com/api/webhooks/...`)

2. **Complete DiscOmi setup:**
   - Click the "Setup" button in the Omi app
   - Paste your Discord webhook URL
   - Click "Register"
   - You're done!

3. **Start creating memories:**
   - Every memory you create will automatically post to your Discord channel
   - Each memory includes:
     - Title and summary
     - Full transcript
     - Category and emoji
     - Action items (if any)
     - Timestamp

## Features:
- ✅ Automatic posting to Discord
- ✅ Beautiful formatted messages with embeds
- ✅ Custom DiscOmi branding
- ✅ Category-based colors and emojis
- ✅ Action items tracking
- ✅ Multi-tenant support (each user has their own channel)

## Troubleshooting:
- **Not receiving messages?** Make sure your Discord webhook URL is correct
- **Want to change channels?** Run setup again with a new Discord webhook URL
- **Need help?** Contact support at [your contact info]

## Privacy:
- Your Discord webhook URL is stored securely
- Only you can see your memories
- We never store your memory content
- Data is encrypted in transit and at rest
```

### 6. App Description (for App Store Listing)
```
Transform your Omi memories into beautifully formatted Discord messages. DiscOmi automatically posts every memory you create to your chosen Discord channel, complete with formatted transcripts, action items, and category-based styling.
```

### 7. App Icon
Use the DiscOmi logo located at:
```
https://discomi-mvp-ochre.vercel.app/discomi.png
```

---

## Technical Details

### How It Works

1. **User installs DiscOmi from Omi App Store**
   - User clicks "Install" in the Omi app
   - Omi shows them the setup instructions
   - User clicks "Setup" which opens: `https://discomi-mvp-ochre.vercel.app/setup?uid=USER_UID`

2. **User completes setup**
   - Setup page auto-detects their UID from query parameter
   - User pastes their Discord webhook URL
   - Clicks "Register"
   - Backend creates user record in Supabase with:
     - UID (from Omi)
     - Discord webhook URL (from user)
     - Per-user token (auto-generated)

3. **Omi checks setup status**
   - Omi calls: `GET https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=USER_UID`
   - Returns: `{"is_setup_completed": true}` (user registered) or `false` (not registered)

4. **User creates a memory**
   - Omi calls: `POST https://discomi-mvp-ochre.vercel.app/api/webhook?app=APP_TOKEN&uid=USER_UID`
   - Payload: Full memory object (transcript, structured data, photos, etc.)
   - Backend looks up user's Discord webhook URL
   - Posts formatted message to their Discord channel

### Security

- **App-level token**: `app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1`
  - Prevents unauthorized webhook calls
  - Currently in "soft mode" (validates if provided, not required)
  - Can be enabled in strict mode via `REQUIRE_APP_TOKEN=true`

- **Per-user tokens**: Auto-generated when user registers
  - Format: `u_RANDOM_HEX`
  - Used for manual testing via Developer Settings
  - Optional when using app-level token

- **Omi signature verification**: (optional, not yet configured)
  - Set `OMI_SIGNING_SECRET` to enable
  - Validates `x-omi-signature` header
  - Bypasses token check if signature valid

### Multi-Tenant Architecture

- **Supabase database**: `user_configs` table
  - `uid`: Omi user ID (primary key)
  - `webhook_url`: User's Discord webhook URL
  - `token`: Per-user authentication token
  - `options`: JSON for future feature flags

- **Row Level Security**: Ensures users can only access their own data

- **Forgiving UID extraction**: Checks multiple sources for UID:
  - Query parameters: `uid`, `user_id`
  - Headers: `x-omi-user-id`, `x-user-id`
  - Body paths: `uid`, `user_id`, `user.id`, `account.id`, etc.

- **Single-user fallback**: (development/testing only)
  - If no UID found and exactly 1 user registered, uses that UID
  - Disabled in production multi-user scenarios

---

## Testing Before Submission

### Test 1: Setup Flow
```powershell
# Open in browser
https://discomi-mvp-ochre.vercel.app/setup?uid=TEST_UID_123

# Enter a test Discord webhook URL
# Click Register
# Should see success message with webhook URL
```

### Test 2: Setup Complete Endpoint
```powershell
# Check registered user
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=TEST_UID_123"
# Should return: {"is_setup_completed": true}

# Check unregistered user
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=NONEXISTENT"
# Should return: {"is_setup_completed": false}
```

### Test 3: Webhook Endpoint
```powershell
# Run test script
.\test-omi-official-format.ps1

# Should post to Discord successfully
```

---

## Post-Submission

After Omi approves your app:

1. **Monitor usage**: Check Supabase for new user registrations
2. **Watch errors**: Monitor Vercel logs for any issues
3. **Enable strict mode** (optional): Set `REQUIRE_APP_TOKEN=true` to enforce app token
4. **Set up Omi signature** (optional): Get signing secret from Omi and set `OMI_SIGNING_SECRET`

---

## URLs Summary

| Purpose | URL |
|---------|-----|
| Webhook | `https://discomi-mvp-ochre.vercel.app/api/webhook?app=APP_TOKEN` |
| Setup Page | `https://discomi-mvp-ochre.vercel.app/setup` |
| Setup Complete | `https://discomi-mvp-ochre.vercel.app/api/setup-complete` |
| Registration API | `https://discomi-mvp-ochre.vercel.app/api/register` |
| Diagnostic | `https://discomi-mvp-ochre.vercel.app/api/diag?uid=UID` |

---

## Environment Variables (Production)

```bash
APP_WEBHOOK_TOKEN="app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"
REQUIRE_APP_TOKEN="false"  # Set to "true" for strict mode
ADMIN_API_KEY="o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"
SUPABASE_URL="https://dogzalrwttgmoawyxjxc.supabase.co"
SUPABASE_SERVICE_ROLE="[service_role_key]"
USE_SUPABASE="true"
DEBUG="true"  # Set to "false" in production
BUILD_ID="discOmi-proof-001"
OMI_SIGNING_SECRET=""  # Optional, get from Omi
```

---

## Support

For questions or issues:
- GitHub: [your repo]
- Email: [your email]
- Discord: [your Discord server]
