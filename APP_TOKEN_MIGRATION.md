# App-Level Token Migration Guide

## ✅ Implementation Complete!

Your webhook now has app-level token protection with a smooth migration path.

## Current Status

### Environment Variables (Production) ✅
- `APP_WEBHOOK_TOKEN` = `app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1`
- `REQUIRE_APP_TOKEN` = `false` (soft mode, backward compatible)

### Test Results ✅
```powershell
PS> .\test-app-token.ps1

Test 1: Good app token          ✅ Success! (posted to Discord)
Test 2: Bad app token           ✅ Correctly rejected (401)
Test 3: No app token            ✅ Success (soft mode allows this)
```

### Security Mode: Soft (Current)
- ✅ Requests **with** correct `?app=...` → **Accepted**
- ❌ Requests **with** wrong `?app=...` → **Rejected** (401)
- ✅ Requests **without** `?app=...` → **Accepted** (backward compatible)

## How It Works

### Code Gate (in `/api/webhook`)
```typescript
// ========== APP-LEVEL TOKEN GATE ==========
const requireApp = String(process.env.REQUIRE_APP_TOKEN || "false").toLowerCase() === "true";
const appParam = (req.query.app as string) || "";
const appEnv = process.env.APP_WEBHOOK_TOKEN || "";

if (requireApp) {
  // Strict mode: app token is mandatory
  if (!appEnv || appParam !== appEnv) {
    return res.status(401).send("unauthorized");
  }
} else {
  // Soft mode: if app token is provided, validate it (helps catch typos during setup)
  if (appParam && appEnv && appParam !== appEnv) {
    return res.status(401).send("unauthorized");
  }
}
// ==========================================
```

### Logic Table

| REQUIRE_APP_TOKEN | ?app parameter | Behavior |
|-------------------|----------------|----------|
| `false` (soft) | Correct token | ✅ Accept |
| `false` (soft) | Wrong token | ❌ Reject (401) |
| `false` (soft) | Not provided | ✅ Accept (backward compatible) |
| `true` (strict) | Correct token | ✅ Accept |
| `true` (strict) | Wrong token | ❌ Reject (401) |
| `true` (strict) | Not provided | ❌ Reject (401) |

## Migration Steps

### Phase 1: Testing (Current) ✅
**Status**: Soft mode, existing integrations still work

```powershell
# Test good token
.\test-app-token.ps1
# Result: All 3 tests pass ✅

# Check configuration
.\test-app-status.ps1
# Result: Shows "soft mode" ✅
```

### Phase 2: Update Omi Configuration
**Action**: Update Omi app webhook URL

**Old URL** (still works):
```
https://discomi-mvp-ochre.vercel.app/api/webhook
```

**New URL** (with app token):
```
https://discomi-mvp-ochre.vercel.app/api/webhook?app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1
```

Omi will automatically append `&uid=<user_id>` to each request.

**Where to update**:
1. Open Omi app
2. Go to **Settings → Developer → Webhook URL**
3. Paste the new URL with `?app=...`
4. Save

### Phase 3: Verify Omi Calls
**Action**: Confirm Omi is using the new URL with app token

1. Create a test memory with Omi device
2. Check Discord for the embed
3. Check Vercel logs: `vercel logs --follow`
4. Look for successful POST requests with `?app=...`

**Diagnostic command**:
```powershell
# With the token Omi should be using
.\test-app-status.ps1 -AppToken "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"

# Expected output:
# appParamMatch: true
# reason: "Valid app token (soft mode)"
```

### Phase 4: Enable Strict Mode
**Action**: Once confirmed Omi calls include app token, enforce it for everyone

```powershell
# Set the toggle to require app token
vercel env add REQUIRE_APP_TOKEN production
# When prompted, enter: true

# Redeploy
vercel --prod --force

# Verify strict mode is active
.\test-app-status.ps1
# Expected: "requireApp": true
```

**After enabling strict mode**:
```powershell
# Test again to confirm behavior
.\test-app-token.ps1

# Expected results:
# Test 1 (good token): ✅ Success
# Test 2 (bad token):  ✅ Rejected (401)
# Test 3 (no token):   ❌ Rejected (401) ← Changed!
```

### Phase 5: Production (Final State)
**Status**: Strict mode, app token mandatory

- All requests must include `?app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1`
- Replay attacks prevented (can't just copy `uid` from logs)
- Per-user tokens still required (multi-tenant security maintained)
- Only Omi (with the app token) can call the webhook

## Testing Commands

### Test all scenarios
```powershell
# Run comprehensive tests
.\test-app-token.ps1

# Test 1: Good token (always should work)
# Test 2: Bad token (always should fail)
# Test 3: No token (depends on REQUIRE_APP_TOKEN)
```

### Check configuration status
```powershell
# Without app token parameter
.\test-app-status.ps1

# With correct app token parameter
.\test-app-status.ps1 -AppToken "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"

# With wrong app token parameter
.\test-app-status.ps1 -AppToken "WRONG"
```

### Manual webhook test with app token
```powershell
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$APP = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"
$URL = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$APP&uid=$UID"

$body = @{
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  structured = @{ 
    title = "Manual test with app token"
    overview = "Testing app-level security."
  }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri $URL -Method Post -ContentType "application/json" -Body $body
```

## Diagnostic Endpoint

**URL**: `/api/app-status`  
**Auth**: Requires `x-admin-key` header (ADMIN_API_KEY)

**Returns**:
- Current `REQUIRE_APP_TOKEN` setting
- Whether `APP_WEBHOOK_TOKEN` is set
- Whether request includes `?app=...`
- Whether provided token matches
- Interpretation of what would happen
- Next steps

**Usage**:
```powershell
# Check status
.\test-app-status.ps1 -AdminKey "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"

# Check status with token
.\test-app-status.ps1 -AdminKey "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg" -AppToken "app_..."
```

## Token Details

**Token**: `app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1`

**Properties**:
- Prefix: `app_` (identifies it as an app-level token)
- Length: 67 characters total (4 char prefix + 63 char hex)
- Format: URL-safe, no confusing characters
- Strength: 252 bits of entropy (63 hex digits)

**Rotation** (if needed):
1. Generate new token: `app_` + 63 random hex digits
2. Update Vercel: `vercel env add APP_WEBHOOK_TOKEN production`
3. Update Omi webhook URL with new token
4. Redeploy: `vercel --prod --force`

## Security Benefits

### Before App Token
- Anyone with a `uid` could test the webhook
- Replay attacks possible (copy uid from logs)
- No way to revoke access globally

### After App Token (Strict Mode)
- ✅ App token required (prevents unauthorized testing)
- ✅ Replay attacks mitigated (need both app token and uid)
- ✅ Global revocation possible (rotate app token)
- ✅ Per-user tokens still enforced (multi-tenant security)
- ✅ Omi signature verification still works

## Multi-Layer Security

Your webhook now has **three** layers of security:

1. **App-level token** (`?app=...`): Proves request is from authorized app (Omi)
2. **Omi signature** (`x-omi-signature`): Proves request is genuinely from Omi servers (not spoofed)
3. **Per-user token** (Supabase lookup): Proves user is registered and Discord webhook is valid

**Authentication flow**:
```
Request → App token valid? → Omi signature valid? → User token valid? → Process
          ↓ No                ↓ No                  ↓ No
          401                 401                   401
```

## Troubleshooting

### "unauthorized" with correct token
- Check token doesn't have extra spaces/newlines
- Verify `APP_WEBHOOK_TOKEN` in Vercel matches exactly
- Run `.\test-app-status.ps1 -AppToken "your-token"` to debug

### Omi calls failing after Phase 4
- Verify Omi webhook URL includes `?app=...`
- Check Vercel logs: `vercel logs --follow`
- Temporarily set `REQUIRE_APP_TOKEN=false` to debug

### Test 2 (bad token) passes when it shouldn't
- Verify `APP_WEBHOOK_TOKEN` is set in Vercel Production
- Redeploy after setting env vars
- Run `.\test-app-status.ps1` to check configuration

## Files Modified

1. **`pages/api/webhook.ts`** - Added app token gate at handler start
2. **`pages/api/app-status.ts`** - New diagnostic endpoint
3. **`test-app-token.ps1`** - Comprehensive test script (3 scenarios)
4. **`test-app-status.ps1`** - Configuration diagnostic script

## Next Steps

1. ✅ **Phase 1 Complete**: Testing in soft mode
2. ⏳ **Phase 2**: Update Omi app webhook URL with `?app=...`
3. ⏳ **Phase 3**: Verify Omi calls work with app token
4. ⏳ **Phase 4**: Set `REQUIRE_APP_TOKEN=true` and redeploy
5. ⏳ **Phase 5**: Monitor production, keep strict mode enabled

## Summary

- ✅ Code deployed and tested
- ✅ Environment variables set
- ✅ Soft mode active (backward compatible)
- ✅ All test scenarios pass
- ✅ Diagnostic endpoint working
- ⏳ Ready to update Omi configuration

When you're ready to enforce the app token, just:
1. Update Omi webhook URL
2. Verify it works
3. Set `REQUIRE_APP_TOKEN=true`
4. Redeploy

No breaking changes until you flip the switch! 🚀
