# DiscOmi - Omi Memory Webhook Integration

## 🎯 What Changed

### 1. **Omi-Specific Payload Extraction** (`webhook.ts`)

**Before**: We were looking for flat fields like `title`, `text`, `user.name`  
**After**: Now correctly extracts from Omi's actual memory structure:

```typescript
// Omi Memory Structure:
{
  id: number,
  created_at: string,
  structured: {
    title: string,        // ← Primary title source
    overview: string,     // ← Primary text source
    emoji: string,
    category: string,
    action_items: [],
    events: []
  },
  transcript_segments: [  // ← Fallback if overview is empty
    { text: "..." },
    { text: "..." }
  ]
}
```

**Extraction Priority**:
1. **Title**: `structured.title` → fallbacks to old paths
2. **Body**: `structured.overview` → `summary` → **concatenated transcript_segments** → "(no text)"
3. **ID**: Direct `id` field
4. **Timestamp**: `created_at` field
5. **UID**: Extracted from query param `?uid=...` (Omi appends this)

### 2. **Setup Complete Endpoint** (`setup-complete.ts`)

**Before**: Returned plain text `"Omi × Discord connected."`  
**After**: Returns JSON as Omi expects:
```json
{ "is_setup_completed": true }
```

This matches the Omi developer documentation requirements.

---

## 📋 Testing

### Local Test (Development)
Run the test script:
```powershell
.\test-omi-payload.ps1
```

Or manually:
```powershell
$payload = @{
  id = 123
  created_at = "2024-07-22T23:59:45.910559+00:00"
  transcript_segments = @(
    @{ text = "Segment one." }, @{ text = "Segment two." }
  )
  structured = @{
    title = "Conversation Title"
    overview = "Brief overview from Omi."
    emoji = "🙂"
    category = "personal"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/webhook?token=YOUR_TOKEN&uid=test123" `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

### Production Test
```powershell
Invoke-RestMethod `
  -Uri "https://discomi-mvp-ochre.vercel.app/api/webhook?token=YOUR_TOKEN&uid=test123" `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

### Expected Discord Output
```
🔔 New Omi Conversation

**Conversation Title**
at 2024-07-22T23:59:45.910559+00:00

Brief overview from Omi.

Footer: Conversation ID: 123 • uid: test123
```

---

## 🚀 Deployment

1. **Push to GitHub**:
   ```bash
   git push origin master
   ```

2. **Vercel auto-deploys** from master branch

3. **Configure Omi App**:
   - Memory Creation Webhook: `https://discomi-mvp-ochre.vercel.app/api/webhook?token=YOUR_TOKEN`
   - Setup Completed URL: `https://discomi-mvp-ochre.vercel.app/api/setup-complete`

4. **Test with real Omi device**: Create a memory and check Discord

---

## 🔧 Environment Variables (Vercel)

Required:
- `DISCORD_WEBHOOK_URL` - Your Discord webhook URL
- `WEBHOOK_TOKEN` - Authentication token (in query param)

Optional:
- `OMI_SIGNING_SECRET` - For HMAC signature verification
- `POST_FULL_TEXT` - Set to `"true"` for 1900 char limit (default: 400)

---

## 📚 Key Features

✅ **Multi-format body parsing**: JSON, form-urlencoded, multipart, text  
✅ **Omi memory structure support**: `structured.*` and `transcript_segments[]`  
✅ **UID tracking**: Captures user ID from query params  
✅ **Fail-soft**: Shows raw JSON if expected fields missing  
✅ **HMAC signature verification**: Optional security layer  
✅ **Token authentication**: Required on all POST requests  
✅ **Transcript fallback**: Concatenates segments if overview is empty  

---

## 🎯 Next Steps

1. ✅ Deploy to production
2. ✅ Test with real Omi memory
3. 🔄 Verify Discord embed shows correct title and text
4. 🧹 Remove debug fields if everything works
5. 📊 Monitor Vercel logs for any issues
6. 🎨 Customize embed appearance (optional)

---

## 📖 Reference

- [Omi Developer Docs](https://docs.omi.me/developer/Memories/webhooks)
- Omi sends: `POST /api/webhook?uid=<user_id>&token=<your_token>`
- Body contains full memory object with `structured` and `transcript_segments`
