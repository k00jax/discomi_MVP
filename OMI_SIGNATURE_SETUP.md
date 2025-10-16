# Omi Signature Verification Setup

## Overview

DiscOmi now supports **Omi signature verification** so that official Omi app requests don't need a per-user token. The webhook accepts two authentication methods:

1. **Omi-signed requests**: Official requests from Omi app with `x-omi-signature` header (no token needed)
2. **Token-based requests**: Manual testing with `?token=...` parameter (when no signature present)

## Setting up OMI_SIGNING_SECRET

### 1. Get your signing secret from Omi

Contact the Omi team or check your Omi developer dashboard for your `OMI_SIGNING_SECRET`. This is a shared secret used to verify that requests are genuinely from Omi.

### 2. Add to Vercel environment variables

```powershell
# Add to Production environment
vercel env add OMI_SIGNING_SECRET production

# When prompted, paste your secret (e.g., "your-secret-key-here")
```

### 3. Redeploy

```powershell
vercel --prod --force
```

## Testing

### Test with Omi signature (no token needed):

```powershell
.\test-omi-signature.ps1 -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852" -SigningSecret "your-omi-signing-secret"
```

### Test with token (manual testing):

```powershell
.\test-omi-signature.ps1 -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852" -Token "u_74f4b11a04a3e65d8b5ae47298bb8fa3aefe6c3666a0747c"
```

### Test both:

```powershell
.\test-omi-signature.ps1 -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852" -Token "u_74f4b11a04a3e65d8b5ae47298bb8fa3aefe6c3666a0747c" -SigningSecret "your-omi-signing-secret"
```

## How it works

### Webhook authentication flow:

```
┌─────────────────────────────────────────────────┐
│ 1. Request arrives at /api/webhook              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. Extract uid from query (?uid=...) or body    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. Verify x-omi-signature header                │
│    (using OMI_SIGNING_SECRET)                   │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
    ✅ Signed      ❌ Not signed
         │               │
         │               ▼
         │     ┌──────────────────┐
         │     │ Check ?token=... │
         │     └────┬────────┬────┘
         │          ▼        ▼
         │      ✅ Match  ❌ No match
         │          │        │
         │          │        ▼
         │          │   401 unauthorized
         │          │
         └──────────┴────────┐
                             ▼
              ┌──────────────────────────┐
              │ 4. Look up user config   │
              │    in Supabase by uid    │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ 5. Post to Discord       │
              └──────────────────────────┘
```

## Configuration in Omi App

When you configure DiscOmi in the Omi app:

1. Go to **Settings → Developer → Webhook URL**
2. Enter: `https://discomi-mvp-ochre.vercel.app/api/webhook?uid=YOUR_UID`
3. Omi will automatically:
   - Append `&uid=...` (or include it in the body)
   - Add `x-omi-signature` header with HMAC-SHA256 signature
   - Send memory payloads as JSON

No need to include `?token=...` in the Omi app! The signature handles authentication.

## Endpoints

- **`/api/webhook`** - Main webhook endpoint (requires uid + signature OR token)
- **`/api/setup-complete`** - Returns `{"is_setup_completed": true}` (Omi checks this)
- **`/api/version`** - Shows build info
- **`/setup`** - User setup page (register Discord webhook)

## Troubleshooting

### "unauthorized" error with Omi app:

1. Check that `OMI_SIGNING_SECRET` is set in Vercel Production
2. Verify the secret matches what Omi is using
3. Check webhook logs: `vercel logs --follow`

### "missing_uid" error:

1. Make sure Omi webhook URL includes `?uid=YOUR_UID`
2. Or ensure Omi includes `uid` in the request body

### "setup_required" error:

1. User hasn't registered yet
2. Go to `/setup` and enter Discord webhook URL
