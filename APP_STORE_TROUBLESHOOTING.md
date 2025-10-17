# App Store Integration Troubleshooting Checklist

## Current Status:
- ✅ Developer Settings webhook works (tested successfully at 12:05)
- ❌ App Store integration not calling webhook (memory created at 12:09, no POST)
- ✅ Setup-complete being called (Omi sees the app is registered)
- ❌ No POST /api/webhook in logs when memory created via app store

## Key Observations:
1. setup-complete called with UID: W7xTEw3Yjde3XSbUyS0ZSNlcb852 (developer UID)
2. App store UID should be: GPW9BKkHYWMkGTv3iSndMRAPS2B2
3. No webhook POST at all = trigger not enabled OR Omi not sending

## Possible Causes:

### 1. TRIGGER NOT SET CORRECTLY
- Check: Is trigger set to "Conversation Creation"?
- Not: "Audio Bytes", "Transcript Processed", or "None"

### 2. IMPORT PERMISSIONS NOT ENABLED
- Check: Are these enabled?
  - ☐ Read Conversations
  - ☐ Read Memories
  - ☐ Create Conversations (optional)
- Without "Read Conversations/Memories", Omi won't send the data

### 3. APP NOT ACTUALLY INSTALLED FROM STORE
- Check: Are you using Developer Settings or App Store installation?
- Developer Settings uses different UID than App Store
- Logs show W7xTEw3Yjde3XSbUyS0ZSNlcb852 (developer) not GPW9BKkHYWMkGTv3iSndMRAPS2B2 (store)

### 4. WEBHOOK URL IN SUBMISSION INCORRECT
- Verify submitted URL is EXACTLY:
  https://discomi-mvp-ochre.vercel.app/api/webhook?app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1
- NO &uid= at the end
- NO typos in app token

### 5. APP STORE APPROVAL STATUS
- Check: Is app "Approved and published" or still "Pending review"?
- Some webhook features might not work until fully approved

### 6. CONVERSATION TOO SHORT
- Check: Was the conversation long enough? (30+ seconds recommended)
- Very short conversations might not trigger

### 7. UNINSTALL/REINSTALL NEEDED
- App store installation might be cached
- Try: Uninstall completely, reinstall from store
- Clear Omi app cache if possible

## Next Steps:

1. **VERIFY TRIGGER SETTING**
   - Open DiscOmi app settings
   - Check trigger is "Conversation Creation"
   - Save changes

2. **ENABLE IMPORT PERMISSIONS**
   - Check "Read Conversations"
   - Check "Read Memories"
   - Save changes

3. **CONFIRM INSTALLATION SOURCE**
   - Are you testing via App Store installation or Developer Settings?
   - setup-complete shows W7xTEw3Yjde3XSbUyS0ZSNlcb852 (developer UID)
   - This suggests you're NOT using app store installation

4. **TRY LONGER CONVERSATION**
   - Record 30-60 seconds of speech
   - Stop recording
   - Wait for memory to process

5. **CHECK APP STATUS**
   - Verify app is "Approved and published" in Omi dashboard
   - Not just "Pending review"

6. **TRY REINSTALLING**
   - Uninstall DiscOmi completely
   - Clear app cache if possible
   - Reinstall from App Store (not Developer Settings)
   - Reconnect Discord webhook

## Critical Question:
**Are you testing with Developer Settings or App Store installation?**

The logs show setup-complete being called with W7xTEw3Yjde3XSbUyS0ZSNlcb852, which is your developer UID.
If you're using Developer Settings, that's why it's not working - Developer Settings don't support the full trigger system.

**Developer Settings vs App Store:**
- Developer Settings: Manual webhook URL testing, limited trigger support
- App Store: Full integration, automatic trigger support, uses different UID

**To test App Store:**
1. Remove Developer Settings webhook
2. Install app from App Store
3. Connect Discord in app settings
4. Create conversation
5. Should use UID: GPW9BKkHYWMkGTv3iSndMRAPS2B2
