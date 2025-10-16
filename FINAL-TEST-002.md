# 🚀 FINAL VERIFICATION TEST - BUILD 002

## Current Status

✅ **BUILD_ID**: `discOmi-omi-extractor-002`  
✅ **Extractor**: `toDiscordPayloadOmi()` (THE ONLY ONE)  
✅ **Config**: Raw body mode ON (`bodyParser: false`)  
✅ **Response**: Returns `ok:discOmi-omi-extractor-002`  
✅ **Debug**: 4 fields showing build, extractor, keys, and structured status  
✅ **Logging**: Shows build ID and keys in Vercel logs  

---

## ⏳ Wait for Deployment

Deployment is processing now. Wait **60-90 seconds**.

Monitor: https://vercel.com/dashboard → discomi-mvp → Deployments

---

## 🧪 Run Test

```powershell
.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0"
```

OR manually:

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

Invoke-RestMethod -Uri $URL -Method Post -ContentType "application/json; charset=utf-8" -Body $payload
```

---

## ✅ Expected Results

### 1. PowerShell Response
```
ok:discOmi-omi-extractor-002
```

### 2. Discord Embed
```
🔔 New Omi Conversation

**Conversation Title**
at 2024-07-22T23:59:45.910559+00:00

Brief overview from Omi.

📋 Fields:
- Debug-Build: discOmi-omi-extractor-002
- Debug-Extractor: toDiscordPayloadOmi
- Debug-Keys: id, created_at, structured, transcript_segments
- Debug-structured?: true

Footer: Conversation ID: 123
```

### 3. Vercel Function Logs
```
[DiscOmi] build discOmi-omi-extractor-002 keys: [ 'id', 'created_at', 'structured', 'transcript_segments' ]
```

---

## 🎯 Success Checklist

| Check | Expected Value | Status |
|-------|---------------|--------|
| PowerShell response | `ok:discOmi-omi-extractor-002` | ⬜ |
| Title | "Conversation Title" | ⬜ |
| Body | "Brief overview from Omi." | ⬜ |
| Debug-Build | `discOmi-omi-extractor-002` | ⬜ |
| Debug-Extractor | `toDiscordPayloadOmi` | ⬜ |
| Debug-Keys | Contains "structured" | ⬜ |
| Debug-structured? | `true` | ⬜ |

---

## 🔍 Code Verification Done

**Already verified**:
- ✅ No old `toDiscordPayload()` function exists
- ✅ Only calls `toDiscordPayloadOmi(bodyUnknown, uid)`
- ✅ Config has `bodyParser: false`
- ✅ Response returns `ok:${BUILD_ID}`
- ✅ Debug fields inject BUILD_ID and extractor name
- ✅ Console logs include build ID and keys

**This MUST work now!**

---

## 📊 Vercel Logs Check

1. Go to: https://vercel.com/dashboard
2. Select project: `discomi-mvp`
3. Click: **Functions** tab
4. Click: `webhook` function
5. Run your test
6. You should see:
   ```
   [DiscOmi] build discOmi-omi-extractor-002 keys: [ 'id', 'created_at', 'structured', 'transcript_segments' ]
   ```

---

## ❌ Troubleshooting

### If response is just "ok" (no build ID)
- **Cause**: Old deployment still cached
- **Fix**: Wait another minute, try again
- **Check**: Vercel deployment status

### If you get 500 error
- **Cause**: Code error (unlikely - we verified no old function)
- **Fix**: Check Vercel function logs for error message
- **Action**: Share the error with me

### If Discord shows wrong title/body
- **Cause**: `structured` extraction not working
- **Fix**: Check Debug-Keys field - does it include "structured"?
- **If no**: Payload format is different than expected
- **If yes**: The extractor logic needs adjustment

### If no Discord message at all
- **Cause**: Discord webhook URL might be wrong or rate limited
- **Fix**: Check Vercel logs for "Discord error"

---

## 🎉 After Success

Once you see:
- ✅ `ok:discOmi-omi-extractor-002`
- ✅ Title = "Conversation Title"
- ✅ Body = "Brief overview from Omi."

We'll:
1. Remove all 4 debug fields
2. Clean up the console.log
3. Bump to BUILD_ID 003 (clean production)
4. Deploy final version
5. Test with real Omi device
6. **Ship it!** 🚀

---

**Test in 60 seconds!** The deployment should be ready. This time it WILL work! 💪
