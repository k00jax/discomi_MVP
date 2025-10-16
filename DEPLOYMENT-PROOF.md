# 🔍 DEPLOYMENT VERIFICATION - Proof of Life

## Problem: We're Talking to the Wrong Deploy!

Your Discord posts haven't changed, which means the code we're editing isn't what `discomi-mvp-ochre.vercel.app` is serving.

---

## ✅ Step 1: Add BUILD_ID Environment Variable in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project: **discomi-mvp** (or whatever project owns the domain)
3. Click: **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `BUILD_ID`
   - **Value**: `discOmi-proof-001`
   - **Environments**: ✅ Production (ONLY)
5. Click **Save**

---

## ✅ Step 2: Verify Domain Ownership

1. In Vercel → Your Project → **Settings** → **Domains**
2. **CRITICAL CHECK**: Is `discomi-mvp-ochre.vercel.app` listed here?

### If YES ✅
Continue to step 3.

### If NO ❌
You have two options:

**Option A**: Change your test URL to the domain that IS listed
**Option B**: Add `discomi-mvp-ochre.vercel.app` to this project's domains

---

## ✅ Step 3: Verify Root Directory

1. In Vercel → Your Project → **Settings** → **General**
2. Find: **Root Directory**
3. **Should be**: BLANK (empty) or `.` (dot)
4. **Should NOT be**: Any Windows path like `C:\Users\...`

If it's wrong:
- Clear it
- Click **Save**
- Redeploy

---

## ✅ Step 4: Force Deploy with Clear Cache

1. In Vercel → Your Project → **Deployments**
2. Click the ⋮ menu on the latest deployment
3. Click **Redeploy**
4. ✅ Check **"Use existing Build Cache"** → **OFF** (clear it)
5. Click **Redeploy**
6. Wait for deployment to complete (~2-3 minutes)

---

## ✅ Step 5: Test Version Endpoint (Proof of Life!)

Open in your browser:
```
https://discomi-mvp-ochre.vercel.app/api/version
```

### Expected Response:
```json
{
  "build": "discOmi-proof-001",
  "file": "/var/task/pages/api/version.ts",
  "sha": "46e3e58..."
}
```

### ❌ If you see `"build": "unknown"`
- The BUILD_ID environment variable didn't save properly
- Go back to Step 1
- Make sure you selected **Production** environment
- Redeploy again

### ❌ If you get 404
- The domain doesn't point to this project
- Go back to Step 2
- Use the correct domain

---

## ✅ Step 6: Test Webhook with PowerShell

```powershell
$URL = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=kyle_4b6f9c2d570b4a51a9a0"

$payload = @{
  id = 123
  created_at = "2024-07-22T23:59:45.910559+00:00"
  structured = @{ 
    title = "Conversation Title"
    overview = "Brief overview from Omi."
  }
  transcript_segments = @(
    @{ text = "Segment one." }
    @{ text = "Segment two." }
  )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri $URL -Method Post -ContentType "application/json; charset=utf-8" -Body $payload
Write-Host "Response: $response"
```

### Expected Response:
```
Response: ok:discOmi-proof-001
```

### Expected Discord Embed:
```
🔔 New Omi Conversation

**Conversation Title**
at 2024-07-22T23:59:45.910559+00:00

Brief overview from Omi.

📋 Fields:
- Debug-Build: discOmi-proof-001
- Debug-Extractor: toDiscordPayloadOmi
- Debug-Keys: id, created_at, structured, transcript_segments
- Debug-structured?: true

Footer: Conversation ID: 123
```

---

## 🎯 Success Checklist

| Step | Check | Status |
|------|-------|--------|
| 1 | BUILD_ID env var set to `discOmi-proof-001` | ⬜ |
| 2 | Domain `discomi-mvp-ochre.vercel.app` in project | ⬜ |
| 3 | Root Directory is blank or `.` | ⬜ |
| 4 | Redeployed with clear cache | ⬜ |
| 5 | `/api/version` shows `discOmi-proof-001` | ⬜ |
| 6 | Webhook returns `ok:discOmi-proof-001` | ⬜ |
| 7 | Discord shows correct title/body | ⬜ |
| 8 | Discord shows Debug-Build field | ⬜ |

---

## 🚨 Still Not Working?

### Nuclear Option: Fresh Project

If steps 1-6 don't work, create a **brand new** Vercel project:

1. Vercel Dashboard → **Add New** → **Project**
2. Import the same GitHub repo: `k00jax/discomi_MVP`
3. Let Vercel assign a fresh domain (like `discomi-mvp-abc123.vercel.app`)
4. Add `BUILD_ID=discOmi-proof-001` to environment variables
5. Deploy
6. Test with the NEW domain
7. Update Omi webhook URL to the new domain

This eliminates all cross-project confusion.

---

## 📊 Check Vercel Function Logs

While testing:

1. Vercel → Project → **Functions** tab
2. Click: `webhook`
3. You should see logs like:
   ```
   [DiscOmi] build discOmi-proof-001 keys: [ 'id', 'created_at', 'structured', 'transcript_segments' ]
   ```

If you see different build ID or no logs → wrong project/deployment.

---

## 🎉 After Verification

Once you see:
- ✅ `/api/version` returns `discOmi-proof-001`
- ✅ Webhook returns `ok:discOmi-proof-001`
- ✅ Discord shows correct title and body
- ✅ Debug fields appear

Then we know:
1. You're hitting the RIGHT deployment
2. The Omi extractor IS working
3. We can remove debug fields and ship!

---

**Start with Step 1!** Add the BUILD_ID environment variable in Vercel, then work through each step. 🎯
