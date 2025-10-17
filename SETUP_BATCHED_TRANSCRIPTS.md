# Quick Setup for Batched Transcripts Testing

## Step 1: Create Supabase Table

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `supabase-migrations/transcript_sessions.sql`
5. Click "Run" to create the table

## Step 2: Add Environment Variables to Vercel

1. Go to https://vercel.com/k00jax/discomi-mvp/settings/environment-variables
2. Add these variables:

```
TRANSCRIPT_BATCH_ENABLED = true
TRANSCRIPT_BATCH_TIMEOUT = 30
TRANSCRIPT_STORE_KEYWORDS = store memory,save this,remember this
CRON_TOKEN = [generate a random string, e.g., use https://www.uuidgenerator.net/]
```

## Step 3: Update vercel.json with Your CRON_TOKEN

Edit `vercel.json` and replace `CRON_TOKEN_HERE` with the token you generated:

```json
{
  "crons": [
    {
      "path": "/api/cron-post-transcripts?token=YOUR_ACTUAL_TOKEN_HERE",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

Then commit and push:
```bash
git add vercel.json
git commit -m "Configure cron token"
git push
```

## Step 4: Wait for Deployment

Vercel will automatically deploy the feature branch. Wait ~1 minute.

## Step 5: Test!

### Test #1: Manual Trigger (immediate posting)
1. In Omi app, make sure trigger is "Transcript Processed"
2. Start recording
3. Say: "This is a test transcript. Store memory now."
4. Check Discord - message should appear within 5-10 seconds
5. Should see ONE message with all your text, not multiple

### Test #2: Timeout Trigger (30-second delay)
1. Start recording
2. Speak for 10-15 seconds (DON'T say "store memory")
3. Stop recording
4. Wait 30-60 seconds
5. Check Discord - message should appear
6. Should see ONE message with complete transcript

## Monitoring

**Check if batching is working:**
- Vercel logs should show: `[DiscOmi] Transcript session: ... | segments count: 1`
- Should NOT see Discord messages while recording
- Should see: `ok_batched` response (not `ok`)

**Check cron job:**
- Go to Vercel deployment logs
- Filter for "cron-post-transcripts"
- Should run every minute
- Should show: "Posted X sessions"

**Check Supabase:**
- Go to Supabase → Table Editor → transcript_sessions
- Should see rows with your session_id while recording
- After posting, `posted` column should be `true`

## Troubleshooting

**Still getting real-time messages?**
- Check TRANSCRIPT_BATCH_ENABLED=true in Vercel
- Redeploy after changing env vars
- Check logs for "ok_batched" not "ok"

**Messages never appear?**
- Check cron job is running (Vercel logs)
- Verify CRON_TOKEN matches in vercel.json and env vars
- Check Supabase table has data

**Need to manually trigger posting?**
```bash
curl "https://discomi-mvp-ochre.vercel.app/api/cron-post-transcripts?token=YOUR_CRON_TOKEN"
```

## Rollback to Master

If you want to go back to master branch behavior:
```bash
git checkout master
git push
```

Or just set:
```
TRANSCRIPT_BATCH_ENABLED = false
```
