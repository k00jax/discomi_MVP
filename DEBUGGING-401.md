# 🔍 Debugging 401 Unauthorized Errors - Diagnostic Guide

## Problem

Getting `401 unauthorized` when testing the webhook, even after registration.

## Root Causes (Pick One)

1. **Supabase not enabled** - `USE_SUPABASE` flag is false or missing
2. **Token mismatch** - Query param token doesn't match database token
3. **UID mismatch** - Query param uid doesn't match or is missing
4. **User not registered** - No row exists in Supabase for this uid
5. **Wrong deployment** - Testing against old code without Supabase

---

## Solution: Diagnostic Endpoint

We've added a **temporary diagnostic endpoint** to inspect the exact state of your configuration.

### Step 1: Set Admin Key in Vercel

**Why?** The diagnostic endpoint needs protection so it doesn't leak user tokens.

**How:**

```powershell
# Generate a random admin key
$adminKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "Your admin key: $adminKey"

# Set it in Vercel
echo $adminKey | vercel env add ADMIN_API_KEY production
```

Or in Vercel Dashboard:
1. Go to Settings → Environment Variables
2. Add `ADMIN_API_KEY` = `<random-long-string>`
3. Select **Production** environment

### Step 2: Redeploy

```powershell
vercel --prod --force
```

Wait ~2 minutes for deployment to complete.

### Step 3: Run Diagnostic

```powershell
# Replace with your values
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$ADMIN_KEY = "<paste your ADMIN_API_KEY here>"

.\test-diag.ps1 -Uid $UID -AdminKey $ADMIN_KEY
```

**Example Output:**

```
🔍 Diagnostic Check for UID: W7xTEw3Yjde3XSbUyS0ZSNlcb852

✅ Diagnostic Results:

USE_SUPABASE: True
Has Row: True

📊 User Config:
  UID: W7xTEw3Yjde3XSbUyS0ZSNlcb852
  Token Prefix: u_abc123def4…
  Webhook URL: https://discord.com/api/webhooks/...

🔗 Expected Webhook URL:
  https://discomi-mvp-ochre.vercel.app/api/webhook?token=u_abc123def456...&uid=W7xTEw3Yjde3XSbUyS0ZSNlcb852

💡 To test the webhook directly, run:
  .\test-webhook-direct.ps1 -Token "<full_token_from_supabase>" -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
```

### Step 4: Interpret Results

#### ✅ Good State

```json
{
  "USE_SUPABASE": true,
  "hasRow": true,
  "row": { ... },
  "expectedQueryExample": "..."
}
```

**Action**: Copy the **full token** from Supabase Table Editor and proceed to Step 5.

#### ❌ Bad State: USE_SUPABASE is false

```json
{
  "USE_SUPABASE": false,
  "hasRow": false
}
```

**Fix:**
```powershell
# Remove old flag (if exists)
vercel env rm USE_SUPABASE production

# Add correct flag
echo true | vercel env add USE_SUPABASE production

# Redeploy
vercel --prod --force
```

#### ❌ Bad State: hasRow is false

```json
{
  "USE_SUPABASE": true,
  "hasRow": false,
  "error": null
}
```

**Fix:** User not registered yet. Register first:

```powershell
$body = @{
  uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
  webhookUrl = "https://discord.com/api/webhooks/YOUR_WEBHOOK"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

#### ❌ Bad State: Error returned

```json
{
  "USE_SUPABASE": true,
  "hasRow": false,
  "error": "relation \"user_configs\" does not exist"
}
```

**Fix:** Supabase table not created. Run SQL schema from `SUPABASE-SETUP.md`.

---

## Step 5: Test Webhook Directly (Bypass Omi)

Once diagnostic shows good state, test the webhook with the exact token:

### Option A: Use Test Script

```powershell
# Get full token from Supabase dashboard → Table Editor → user_configs → your row
$FULL_TOKEN = "u_abc123def456789..."  # Paste from Supabase
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"

.\test-webhook-direct.ps1 -Token $FULL_TOKEN -Uid $UID
```

### Option B: Manual PowerShell

```powershell
$TOKEN = "u_abc123def456789..."  # From Supabase
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$URL = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=$TOKEN&uid=$UID"

$payload = @{
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  structured = @{
    title    = "DiscOmi Self-Test"
    overview = "This payload bypasses Omi to prove the pipeline."
    category = "idea"
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Uri $URL -Method Post -ContentType "application/json" -Body $payload
```

### Expected Result

**PowerShell:**
```
✅ Success!
Response: ok
Check your Discord channel for the embed.
```

**Discord:**
```
💡 DiscOmi Self-Test

🎯 DiscOmi

This payload bypasses Omi to prove the pipeline.

When
Oct 16, 1:45 PM • just now

🎧 Conversation • unknown
Oct 16, 2025 1:45 PM
```

---

## Step 6: Troubleshoot If Still Failing

### Still Getting 401?

1. **Verify token exactly matches**
   - Go to Supabase dashboard → Table Editor → `user_configs`
   - Copy token field **exactly** (should start with `u_`)
   - Use that exact string in the `?token=...` parameter

2. **Check URL encoding**
   - If token has special characters, ensure it's URL-encoded
   - PowerShell script does this automatically with `[uri]::EscapeDataString()`

3. **Verify UID matches**
   - UID in query param must match UID in database row
   - Case-sensitive!

4. **Check deployment**
   ```powershell
   Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/version"
   # Should show commit sha: 18046e0 or later
   ```

### Getting 403 setup_required?

**Cause**: User exists but query returned no row

**Fix**: 
- Check Supabase project is active (not paused)
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` are correct in Vercel
- Check Vercel function logs for detailed Supabase error

### Getting 500 db_error?

**Cause**: Supabase query failed

**Fix**:
1. Check Vercel function logs for exact error
2. Verify Supabase credentials in Vercel env vars
3. Ensure table `user_configs` exists in Supabase
4. Check RLS policies are set correctly

---

## Step 7: Test with Real Omi Device

Once direct test works:

1. **Copy the webhook URL** from diagnostic output
2. **Open Omi app** → Settings → Developer → Webhook URL
3. **Paste the URL** (without the `&uid=...` part - Omi adds this)
4. **Create a memory** and watch it appear in Discord

**Example Omi webhook URL:**
```
https://discomi-mvp-ochre.vercel.app/api/webhook?token=u_abc123def456...
```

Omi automatically appends: `&uid=W7xTEw3Yjde3XSbUyS0ZSNlcb852`

---

## Cleanup After Debugging

Once everything works, remove the diagnostic endpoint:

```powershell
# Delete the diagnostic file
Remove-Item pages\api\diag.ts

# Remove admin key from Vercel
vercel env rm ADMIN_API_KEY production

# Commit cleanup
git add pages/api/diag.ts
git commit -m "chore: remove diagnostic endpoint"
git push
vercel --prod --force
```

**Or keep it** if you want to diagnose issues for other users later. Just keep `ADMIN_API_KEY` secret!

---

## Quick Reference: All Test Scripts

### 1. Diagnostic Check
```powershell
.\test-diag.ps1 -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852" -AdminKey "your-admin-key"
```

### 2. Direct Webhook Test (Bypass Omi)
```powershell
.\test-webhook-direct.ps1 -Token "u_abc123..." -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
```

### 3. Original Omi Payload Test
```powershell
.\test-omi-payload.ps1 -Token "u_abc123..." -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
```

---

## Common Mistakes

1. **Using registration response token directly**
   - ❌ Registration returns a **webhook URL**, not just the token
   - ✅ Extract token from the URL: `?token=u_abc123...` part

2. **Forgetting to redeploy after env var changes**
   - ❌ Changing env vars doesn't auto-redeploy
   - ✅ Always run `vercel --prod --force` after env changes

3. **Using wrong UID**
   - ❌ Testing with `test-user` but registered with real Omi UID
   - ✅ Use the **exact same UID** in both registration and webhook test

4. **URL encoding issues**
   - ❌ Manually constructing URLs with special characters
   - ✅ Use `[uri]::EscapeDataString()` in PowerShell or the test scripts

---

## Success Checklist

- [ ] `ADMIN_API_KEY` set in Vercel Production
- [ ] Deployed with `vercel --prod --force`
- [ ] Diagnostic shows `USE_SUPABASE: true`
- [ ] Diagnostic shows `hasRow: true`
- [ ] Got full token from Supabase Table Editor
- [ ] Direct webhook test returns `ok`
- [ ] Discord embed appears correctly
- [ ] Omi app configured with webhook URL (without `&uid=`)
- [ ] Real Omi memory posts to Discord

---

**Ready to diagnose!** Start with `.\test-diag.ps1` and follow the output.
