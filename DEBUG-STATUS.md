# 🔍 Debug Deployment - Testing Omi Structured Payload

## What We Just Did

Added debug fields to verify that the webhook is:
1. ✅ Receiving the `structured` object
2. ✅ Parsing it correctly
3. ✅ Using `toDiscordPayloadOmi()` function

## Current Code State

### Webhook Handler (`pages/api/webhook.ts`)
- ✅ Raw body mode enabled (`bodyParser: false`)
- ✅ Uses `toDiscordPayloadOmi(bodyUnknown, uid)` - THE CORRECT FUNCTION
- ✅ Debug fields added to show:
  - `Debug-Keys`: Top 20 keys from the payload
  - `Debug-structured?`: Whether `structured` object exists

### Expected Next Test Result

When you run the test:
```powershell
.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0"
```

**Discord should show**:
```
🔔 New Omi Conversation

**Conversation Title**
at 2024-07-22T23:59:45.910559+00:00

Brief overview from Omi.

📋 Fields:
- Debug-Keys: id, created_at, structured, transcript_segments
- Debug-structured?: true

Footer: Conversation ID: 123 • uid: [your_uid_if_included]
```

### What This Proves

✅ **If you see this**:
- Title = "Conversation Title" → `structured.title` is being extracted
- Body = "Brief overview from Omi." → `structured.overview` is being extracted
- Debug-structured? = true → Payload structure is correct

❌ **If you still see**:
- Title = "New Omi memory" → Not using new extractor (cache issue?)
- Body = "(no text)" → `structured.overview` is empty or missing
- Debug-Keys missing `structured` → Payload format is different than expected

## Troubleshooting

### If Title/Body Still Wrong

1. **Check Vercel Deployment**:
   - Go to https://vercel.com/dashboard
   - Find your `discomi-mvp` project
   - Check that the latest deployment is LIVE and READY
   - Look at the commit hash - should match `9184038`

2. **Check Function Logs**:
   - Vercel → Project → Functions → webhook
   - Look for console output from your test
   - Should see the parsed payload structure

3. **Clear Any CDN Cache**:
   - Vercel auto-invalidates on deploy, but if using Cloudflare or similar, flush cache

### If Debug Fields Don't Appear

The deployment might not be live yet. Wait 30-60 seconds after push and try again.

## After Successful Test

Once you confirm:
- ✅ Title shows "Conversation Title"
- ✅ Body shows "Brief overview from Omi."
- ✅ Debug fields show `structured: true`

Then remove the debug block:
```ts
// DELETE THESE LINES (around line 175 in webhook.ts):
const b = (typeof bodyUnknown === "object" && bodyUnknown) ? (bodyUnknown as Record<string, unknown>) : {};
const hasStructured = Object.prototype.hasOwnProperty.call(b, "structured");
const keys = Object.keys(b).slice(0, 20).join(", ");

(discordPayload.embeds[0].fields ||= []).push(
  { name: "Debug-Keys", value: keys || "(no keys)" },
  { name: "Debug-structured?", value: String(hasStructured) }
);
```

Commit, push, and you're production-ready! 🚀

## Testing Commands

### Local (if running dev server)
```powershell
.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0"
# Edit script to change URL to http://localhost:3000/api/webhook
```

### Production (current)
```powershell
.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0"
# Uses https://discomi-mvp-ochre.vercel.app/api/webhook
```

### With UID (simulates Omi's query param)
Manually test with curl/PowerShell:
```powershell
$URL = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=kyle_4b6f9c2d570b4a51a9a0&uid=test-user-123"
# ... rest of test
```

## Next Steps

1. ⏳ Wait for Vercel deployment to complete (~1 minute)
2. ✅ Run test script: `.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0"`
3. 👀 Check Discord for the embed with debug fields
4. 🎯 If successful, remove debug block and redeploy
5. 🎤 Create real Omi memory and celebrate! 🎉
