# 🔍 BUILD VERIFICATION TEST

## What We Just Added

**BUILD_ID**: `discOmi-omi-extractor-001`

This stamp proves:
1. ✅ Your request is hitting the NEW code
2. ✅ Using `toDiscordPayloadOmi()` (the Omi extractor)
3. ✅ Parsing `structured.title` and `structured.overview`

---

## ⏳ Wait for Deployment

Vercel is deploying now. Wait **60-90 seconds** before testing.

Check status: https://vercel.com/dashboard → discomi-mvp → Deployments

---

## 🧪 Run Test (PowerShell)

```powershell
.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0"
```

---

## ✅ Expected Results

### 1. PowerShell Response
```
ok:discOmi-omi-extractor-001
```
☝️ **This proves you're on the new build!**

### 2. Discord Embed

```
🔔 New Omi Conversation

**Conversation Title**
at 2024-07-22T23:59:45.910559+00:00

Brief overview from Omi.

📋 Fields:
- Debug-Build: discOmi-omi-extractor-001
- Debug-Extractor: toDiscordPayloadOmi
- Debug-Keys: id, created_at, structured, transcript_segments
- Debug-structured?: true

Footer: Conversation ID: 123
```

### 3. Vercel Function Logs

Should show:
```
[DiscOmi] keys: [ 'id', 'created_at', 'structured', 'transcript_segments' ]
```

---

## ✨ Success Indicators

| What to Check | Expected | Why It Matters |
|--------------|----------|----------------|
| PowerShell response | `ok:discOmi-omi-extractor-001` | Confirms new build is live |
| Title | "Conversation Title" | `structured.title` extracted correctly |
| Body | "Brief overview from Omi." | `structured.overview` extracted correctly |
| Debug-Build field | `discOmi-omi-extractor-001` | Right code path |
| Debug-Extractor field | `toDiscordPayloadOmi` | Right function called |
| Debug-Keys field | Contains "structured" | Payload parsed correctly |
| Debug-structured? | `true` | `structured` object exists |

---

## ❌ If Something's Wrong

### Still seeing "New Omi memory"?
- Check PowerShell response for build ID
- If no build ID → Deployment not complete or wrong URL
- If build ID present but wrong title → Check Vercel logs

### PowerShell returns just "ok"?
- Old build still cached
- Wait another minute and retry
- Check Vercel deployment status

### Discord embed missing debug fields?
- Discord API might be slow
- Wait 10 seconds and check again
- Or webhook URL might be wrong

---

## 🎯 Next Steps After Success

1. ✅ Confirm you see `ok:discOmi-omi-extractor-001`
2. ✅ Confirm Discord shows correct title and body
3. 🧹 Remove all debug fields (we'll do this together)
4. 🚀 Test with real Omi device
5. 🎉 Submit to Omi app store!

---

## 🔧 Manual Test (Alternative)

If script doesn't work, use this:

```powershell
$URL = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=kyle_4b6f9c2d570b4a51a9a0&uid=test123"

$payload = @{
  id = 123
  created_at = "2024-07-22T23:59:45.910559+00:00"
  structured = @{
    title = "Conversation Title"
    overview = "Brief overview from Omi."
    emoji = "🙂"
    category = "personal"
  }
  transcript_segments = @(
    @{ text = "Segment one." }
    @{ text = "Segment two." }
  )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri $URL -Method Post -ContentType "application/json; charset=utf-8" -Body $payload
Write-Host "Response: $response"
```

---

## 📞 Debugging Commands

### Check what's deployed
```powershell
# Test GET endpoint (should work immediately)
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/webhook"
# Returns: "ok"
```

### Search for old function calls
```powershell
# From project root
Get-ChildItem -Recurse -Include *.ts,*.tsx | Select-String "toDiscordPayload\(" | Where-Object { $_.Line -notmatch "toDiscordPayloadOmi" }
```

Should return NOTHING. If it finds anything, that's the problem!

---

**Ready to test!** Wait 60 seconds from push, then run the test. 🚀
