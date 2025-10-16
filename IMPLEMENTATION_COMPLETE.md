# DiscOmi - Implementation Complete ✅

## What Was Implemented

Your webhook handler now supports **Omi signature verification** as requested. The system accepts two authentication methods:

1. **Omi-signed requests** (production): Official Omi app requests with `x-omi-signature` header
2. **Token-based requests** (testing): Manual testing with `?token=...` parameter

## Key Changes

### 1. Webhook Handler (`pages/api/webhook.ts`)

- **Added `pickUid()` helper**: Extracts `uid` from query string OR request body
  - Query: `?uid=...` (Omi appends this)
  - Body: `body.uid`, `body.user.id`, `body.account.id`, etc.

- **Enhanced `verifySignature()`**: 
  - Returns `true` if `OMI_SIGNING_SECRET` not set (development mode)
  - Returns `false` if signature expected but missing/invalid (production mode)
  - Uses HMAC-SHA256 to verify `x-omi-signature` header

- **Updated authentication flow**:
  ```
  1. Extract uid from query or body
  2. Verify Omi signature
  3. If NOT signed → require token
  4. Look up user config in Supabase
  5. Post to Discord webhook
  ```

### 2. Test Script (`test-omi-signature.ps1`)

Comprehensive testing tool that validates:
- ✅ Omi-signed requests (with signature, no token)
- ✅ Token-based requests (with token, no signature)
- ✅ Rejection of unauthenticated requests

Usage:
```powershell
# Test with Omi signature
.\test-omi-signature.ps1 -Uid "YOUR_UID" -SigningSecret "YOUR_SECRET"

# Test with token
.\test-omi-signature.ps1 -Uid "YOUR_UID" -Token "YOUR_TOKEN"

# Test both
.\test-omi-signature.ps1 -Uid "YOUR_UID" -Token "YOUR_TOKEN" -SigningSecret "YOUR_SECRET"
```

### 3. Documentation (`OMI_SIGNATURE_SETUP.md`)

Complete setup guide covering:
- Environment variable configuration
- Security modes (development vs production)
- Testing procedures
- Omi app configuration
- Troubleshooting

## Current Status

### ✅ Completed
- [x] `pickUid()` function extracts uid from query or body
- [x] Signature verification with `OMI_SIGNING_SECRET`
- [x] Token-based fallback for manual testing
- [x] Backward compatibility maintained
- [x] All endpoints working (`/api/webhook`, `/api/setup-complete`, `/api/version`)
- [x] Test scripts created
- [x] Documentation complete
- [x] Deployed to production

### ⚙️ Production Deployment
- **URL**: `https://discomi-mvp-ochre.vercel.app`
- **Build**: `b7418bf` → `18a6e2f`
- **Commit**: "docs: clarify OMI_SIGNING_SECRET dev/prod modes"

### 🔐 Environment Variables

Current configuration:
| Variable | Status | Environment |
|----------|--------|-------------|
| `ADMIN_API_KEY` | ✅ Set | Production |
| `SUPABASE_URL` | ✅ Set | Production |
| `SUPABASE_SERVICE_ROLE` | ✅ Set | Production |
| `USE_SUPABASE` | ✅ Set | Production |
| `DEBUG` | ✅ Set | Production |
| `BUILD_ID` | ✅ Set | Production |
| `OMI_SIGNING_SECRET` | ⚠️ **Not Set** | - |

## Next Steps

### 1. Set `OMI_SIGNING_SECRET` (Required for Production Security)

```powershell
# Add the secret to Vercel Production environment
vercel env add OMI_SIGNING_SECRET production

# When prompted, paste your Omi signing secret
# (Get this from Omi team or developer dashboard)

# Redeploy
vercel --prod --force
```

⚠️ **Without this secret**, the webhook runs in development mode where signature verification always passes. This allows testing but is **not secure for production**.

### 2. Configure Omi App

In the Omi app, set your webhook URL:

```
https://discomi-mvp-ochre.vercel.app/api/webhook?uid=YOUR_UID
```

**No need to include `?token=...`** - Omi will:
- Automatically append `&uid=...` (or include in body)
- Add `x-omi-signature` header with valid signature
- Send memory payloads as JSON

### 3. Test with Real Omi Device

Once configured:
1. Create a memory with your Omi wearable
2. Check Discord for the embed
3. Verify custom avatar appears
4. Check Vercel logs if needed: `vercel logs --follow`

## Authentication Flow

### With `OMI_SIGNING_SECRET` Set (Production Mode)

| Request Type | Signature | Token | Result |
|-------------|-----------|-------|--------|
| Omi app | ✅ Valid | Not needed | ✅ Posts to Discord |
| Manual test | ❌ None | ✅ Valid | ✅ Posts to Discord |
| Unauthenticated | ❌ Invalid | ❌ Invalid | ❌ 401 unauthorized |

### Without `OMI_SIGNING_SECRET` (Development Mode)

| Request Type | Signature | Token | Result |
|-------------|-----------|-------|--------|
| Any | Any | Any | ✅ Posts to Discord (⚠️ insecure) |

## Testing Results

### ✅ Token-Based Authentication (Backward Compatible)
```powershell
PS> .\test-webhook-direct.ps1 -Token "u_74f4b11a04a3e65d8b5ae47298bb8fa3aefe6c3666a0747c" -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
✅ Success!
Response: ok
Check your Discord channel for the embed.
```

### ✅ Setup Complete Endpoint
```powershell
PS> Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete"
is_setup_completed: True
```

### ✅ Version Endpoint
```powershell
PS> Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/version"
build: discOmi-proof-001
sha: 18a6e2ffa20d43db210d31a97a4106bcbb419bfb
```

## API Endpoints Summary

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/api/webhook` | POST | Receive Omi memories | Signature OR Token |
| `/api/setup-complete` | GET | Omi setup check | None |
| `/api/version` | GET | Build info | None |
| `/setup` | GET | User registration page | None |
| `/api/register` | POST | User registration | None |

## Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | `missing_uid` | No `uid` in query or body |
| 401 | `unauthorized` | Invalid/missing token (when signature not valid) |
| 403 | `setup_required` | User not registered in Supabase |
| 500 | `missing_webhook` | User config missing Discord webhook URL |
| 500 | `db_error` | Supabase query failed |
| 502 | `discord_error` | Discord webhook POST failed |

## Files Changed

1. **`pages/api/webhook.ts`**
   - Added `pickUid()` to extract uid from query or body
   - Enhanced `verifySignature()` with security comments
   - Updated handler to check signature first, then token
   - Moved body parsing before uid extraction

2. **`test-omi-signature.ps1`** (new)
   - Comprehensive test script for signature verification
   - Tests 3 scenarios: signed, token-based, unauthenticated
   - UTF-8 encoding configured

3. **`OMI_SIGNATURE_SETUP.md`** (new)
   - Complete setup guide
   - Security mode documentation
   - Troubleshooting section

## Troubleshooting

### "missing_uid" Error
- Ensure Omi webhook URL includes `?uid=YOUR_UID`
- Or verify Omi includes `uid` in request body

### "unauthorized" Error with Omi App
- Set `OMI_SIGNING_SECRET` in Vercel Production
- Verify secret matches what Omi is using
- Check logs: `vercel logs --follow`

### "setup_required" Error
- User hasn't registered yet
- Go to `/setup` page
- Enter Discord webhook URL

### Signature Verification Not Working
- Ensure `OMI_SIGNING_SECRET` is exactly the same on both sides
- Check for trailing newlines or quotes in the secret
- Verify Omi is sending `x-omi-signature` header

## Commands Quick Reference

```powershell
# Test token-based auth
.\test-webhook-direct.ps1 -Token "YOUR_TOKEN" -Uid "YOUR_UID"

# Test signature auth
.\test-omi-signature.ps1 -Uid "YOUR_UID" -SigningSecret "YOUR_SECRET"

# Check environment variables
vercel env ls

# Add signing secret
vercel env add OMI_SIGNING_SECRET production

# Deploy to production
vercel --prod --force

# View logs
vercel logs --follow

# Check API status
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/version"
```

## What You Need To Do

1. **Get your `OMI_SIGNING_SECRET`** from Omi team/dashboard
2. **Add it to Vercel**: `vercel env add OMI_SIGNING_SECRET production`
3. **Redeploy**: `vercel --prod --force`
4. **Configure Omi app** with webhook URL: `https://discomi-mvp-ochre.vercel.app/api/webhook?uid=YOUR_UID`
5. **Test** with a real Omi memory

That's it! Everything else is ready to go. 🚀
