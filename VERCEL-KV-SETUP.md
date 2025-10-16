# DiscOmi - Vercel KV Setup Guide

## 🎯 What Changed

DiscOmi is now **fully multi-tenant**! Each user can:
- Register their own Discord webhook
- Get a unique, secure token
- Configure options (text length, audio links, transcript inclusion)
- Use their personalized Omi webhook URL

## 📋 Prerequisites

Before deploying, you need to set up Vercel KV (Redis):

### 1. Create Vercel KV Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (`discomi-mvp`)
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV (Redis)**
6. Name it: `discomi-kv`
7. Select region closest to your users
8. Click **Create**

### 2. Connect KV to Your Project

1. After creation, click **Connect to Project**
2. Select `discomi-mvp`
3. Select **Production** environment
4. Click **Connect**

This automatically adds these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### 3. Keep Existing Environment Variables

Make sure these are still set in Production:
- `BUILD_ID=discOmi-proof-001`
- `DEBUG=false` (or `true` for testing)
- Optional: `OMI_SIGNING_SECRET` for webhook signature verification

You can **remove** these (no longer needed):
- ~~`DISCORD_WEBHOOK_URL`~~ (now per-user)
- ~~`WEBHOOK_TOKEN`~~ (now per-user)

## 🚀 Deployment

```powershell
# Deploy with KV connected
vercel --prod --force
```

## 🎨 User Flow

### For End Users:

1. **Visit Setup Page**: `https://discomi-mvp-ochre.vercel.app/setup`

2. **Enter Information**:
   - Omi uid (usually auto-detected by Omi app)
   - Discord webhook URL from their server

3. **Get Personalized URL**:
   ```
   https://discomi-mvp-ochre.vercel.app/api/webhook?token=u_abc123...
   ```

4. **Paste into Omi App**:
   - Open Omi app settings
   - Find webhook configuration
   - Paste the provided URL
   - Omi automatically appends `&uid=<their_uid>`

5. **Test**:
   - Create a memory in Omi
   - Check their Discord channel for the embed

### For Developers (Testing):

```powershell
# Test registration
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"uid":"test-user","webhookUrl":"https://discord.com/api/webhooks/..."}'

# Response:
# {
#   "ok": true,
#   "omiWebhook": "https://discomi-mvp-ochre.vercel.app/api/webhook?token=u_..."
# }
```

## 🔧 Configuration Options

Users can optionally configure:

```json
{
  "uid": "user123",
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "options": {
    "includeTranscript": true,    // Include full transcript in body
    "includeAudio": true,          // Show audio link field
    "maxChars": 900                // Max characters (1-1900)
  }
}
```

## 📊 Data Structure in KV

```
Key: user:${uid}
Value: {
  webhookUrl: string,
  token: string,
  options: {
    includeTranscript: boolean,
    includeAudio: boolean,
    maxChars: number
  }
}
```

**Examples**:
- `user:kyle` → User Kyle's config
- `user:alice@example.com` → User Alice's config
- `user:abc-123-def` → User with UUID

## 🔐 Security Features

### Token Generation
- 48-character random hex tokens: `u_abc123def456...`
- Unique per user
- Idempotent: Re-registering keeps the same token

### Access Control
- Webhook requires both `token` and `uid` parameters
- Token must match user's stored token
- Returns `403 setup_required` if user not registered
- Returns `401 unauthorized` if token mismatch

### Privacy
- No memory content stored in KV
- Only webhook URLs and tokens persisted
- Direct relay to Discord
- Minimal logging (uid + status code only)

## 🧪 Testing Workflow

### 1. Register Test User

```powershell
$body = @{
  uid = "kyle"
  webhookUrl = "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
  options = @{
    maxChars = 900
    includeAudio = $true
    includeTranscript = $true
  }
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### 2. Test Webhook with Returned Token

```powershell
# Use the token from step 1
.\test-omi-payload.ps1 -Token "u_your_token_here" -Uid "kyle"
```

### 3. Verify in Discord

Check your Discord channel for:
- ✅ Title from Omi structured data
- ✅ Body/overview
- ✅ Conversation ID
- ✅ Optional audio link (if configured)
- ✅ No debug fields (if DEBUG=false)

### 4. Test Multiple Users

```powershell
# Register second user with different webhook
$body2 = @{
  uid = "alice"
  webhookUrl = "https://discord.com/api/webhooks/DIFFERENT_WEBHOOK"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body2
```

## 🐛 Debugging

### Enable DEBUG Mode

```powershell
# Set DEBUG to true
vercel env rm DEBUG production
echo true | vercel env add DEBUG production
vercel --prod --force
```

Debug fields will show:
- `Debug-Build`: Current build ID
- `Debug-Extractor`: Which extractor was used
- `Debug-Keys`: Payload keys received
- `Debug-structured?`: Whether structured field exists

### Disable DEBUG Mode

```powershell
# Set DEBUG to false
vercel env rm DEBUG production
echo false | vercel env add DEBUG production
vercel --prod --force
```

### View KV Data

```powershell
# Install Vercel CLI if needed
npm i -g vercel

# View all keys
vercel kv list discomi-kv

# Get specific user
vercel kv get user:kyle --db discomi-kv

# Delete user (if needed)
vercel kv del user:kyle --db discomi-kv
```

## 📈 Monitoring

### Successful Request
```
Status: 200
Response: "ok" (or "ok:BUILD_ID" if DEBUG=true)
Discord: Embed appears in user's channel
```

### Common Errors
- `400 missing_uid` - No `?uid=` parameter
- `401 unauthorized` - Token mismatch
- `403 setup_required` - User not registered
- `401 invalid_signature` - HMAC verification failed (if enabled)
- `500 missing_webhook` - User's webhookUrl is empty
- `502 discord_error` - Discord rejected the payload

## 🎯 Next Steps

### For Users:
1. Visit `/setup` page
2. Register Discord webhook
3. Copy provided Omi URL
4. Paste into Omi app
5. Start recording memories!

### For Developers:
1. Set up Vercel KV (if not done)
2. Deploy latest code
3. Test with `/setup` page
4. Monitor logs for issues
5. Adjust DEBUG flag as needed

## 🔄 Migration from Single-Tenant

If you were using the old single-tenant setup:

1. **Keep your existing setup working**:
   - Set `WEBHOOK_TOKEN` env var to your old token
   - Set `DISCORD_WEBHOOK_URL` to your Discord webhook
   
2. **Register yourself in KV**:
   ```powershell
   Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
     -Method Post `
     -ContentType "application/json" `
     -Body '{"uid":"your-uid","webhookUrl":"your-discord-webhook"}'
   ```

3. **Update Omi app** with new token from registration response

4. **Remove old env vars** once confirmed working:
   ```powershell
   vercel env rm WEBHOOK_TOKEN production
   vercel env rm DISCORD_WEBHOOK_URL production
   ```

---

**Version**: Multi-Tenant with Vercel KV  
**Git SHA**: `ea5b9c3`  
**Status**: Ready for production deployment  
**KV Required**: Yes - must be connected before deploying
