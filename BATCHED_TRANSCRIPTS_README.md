# Batched Transcripts Feature

## Overview
Instead of posting multiple Discord messages in real-time as you speak, this feature batches all transcript segments for a conversation and posts **one complete message** when:
1. **Recording stops and 30 seconds pass** (configurable timeout)
2. **User says a trigger phrase** like "store memory", "save this", or "remember this"

## Setup

### 1. Create Supabase Table
Run the SQL in `supabase-migrations/transcript_sessions.sql` in your Supabase SQL editor.

### 2. Environment Variables
Add these to your Vercel environment variables:

```env
# Enable batching (default: true)
TRANSCRIPT_BATCH_ENABLED=true

# Timeout before posting (default: 30 seconds)
TRANSCRIPT_BATCH_TIMEOUT=30

# Trigger phrases (comma-separated, case-insensitive)
TRANSCRIPT_STORE_KEYWORDS=store memory,save this,remember this

# Cron job auth token (generate a random string)
CRON_TOKEN=your_random_token_here
```

### 3. Configure Vercel Cron
The `vercel.json` file is already configured to run the cron job every minute.

**Update the CRON_TOKEN** in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron-post-transcripts?token=YOUR_CRON_TOKEN",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

### 4. Deploy
```bash
git add -A
git commit -m "Add batched transcripts feature"
git push origin feature/batched-transcripts
```

Vercel will automatically deploy the feature branch.

## How It Works

### Real-time Batching
1. User starts recording in Omi
2. As they speak, Omi sends "Transcript Processed" webhooks with segments
3. Each segment is stored in `transcript_sessions` table
4. No Discord message posted yet (status 200 "ok_batched")

### Posting Trigger #1: Timeout
- Cron job runs every minute
- Finds sessions where `last_segment_at` > 30 seconds ago
- Posts complete message to Discord
- Marks session as `posted = true`

### Posting Trigger #2: User Command
- User says "store memory" (or other configured keyword)
- Immediately posts all accumulated segments
- Marks session as `posted = true`

### Discord Message Format
```
💬 Batched Transcript
[Full combined text from all segments]

Started: 2 minutes ago
Segments: 15
Session • abc123xyz
```

## Testing

### Test Manual Trigger
1. Set Omi trigger to "Transcript Processed"
2. Start recording
3. Say: "This is a test. Store memory."
4. Check Discord - message should appear immediately

### Test Timeout Trigger
1. Start recording
2. Speak for 10-15 seconds
3. Stop recording
4. Wait 30+ seconds
5. Check Discord - message should appear

### Test API Endpoints

**Check session status:**
```bash
curl https://your-domain.vercel.app/api/batch-transcripts?session_id=abc123
```

**Manually trigger cron:**
```bash
curl "https://your-domain.vercel.app/api/cron-post-transcripts?token=YOUR_CRON_TOKEN"
```

## Troubleshooting

### Messages still posting in real-time
- Check `TRANSCRIPT_BATCH_ENABLED=true` in Vercel env
- Redeploy after changing env variables

### Messages never post (even after timeout)
- Check Vercel cron logs
- Verify cron job is configured correctly
- Try manual cron trigger

### Missing segments
- Check Supabase `transcript_sessions` table
- Verify segments are being stored

### Cleanup old sessions
The cron job automatically deletes sessions older than 24 hours where `posted = true`.

## Rollback

To disable batching and go back to real-time posting:

```env
TRANSCRIPT_BATCH_ENABLED=false
```

Or switch Omi trigger back to "Conversation Creation" (if it starts working).
