# DiscOmi - Supabase Setup Guide

## 🎯 Migration Complete

DiscOmi now uses **Supabase** instead of Vercel KV for multi-tenant user configuration storage.

## 📋 Prerequisites

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New project**
3. Choose organization and region
4. Set database password (save it!)
5. Wait for project to initialize (~2 minutes)

### 2. Run SQL Schema

In your Supabase project:

1. Go to **SQL Editor**
2. Click **New query**
3. Paste and run this schema:

```sql
create table if not exists user_configs (
  uid text primary key,
  webhook_url text not null,
  token text not null,
  options jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_user_configs_updated on user_configs;
create trigger trg_user_configs_updated
before update on user_configs
for each row execute procedure set_updated_at();

alter table user_configs enable row level security;

drop policy if exists service_read_write on user_configs;
create policy service_read_write on user_configs
  for all
  to service_role
  using (true)
  with check (true);
```

### 3. Get API Credentials

In your Supabase project:

1. Go to **Settings** → **API**
2. Copy **Project URL** (e.g., `https://abc123.supabase.co`)
3. Copy **service_role key** (under "Project API keys" - this is the secret key)

## 🔧 Environment Variables (Vercel)

Add these to your Vercel project (**Production** environment):

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key-here

# Optional - controls which storage backend to use
USE_SUPABASE=true
```

**CRITICAL SECURITY NOTES:**
- ✅ **DO** use `SUPABASE_SERVICE_ROLE` (no NEXT_PUBLIC prefix)
- ❌ **DO NOT** create `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE`
- ✅ `SUPABASE_URL` can be public (it's just the endpoint)
- 🔒 Service role key must stay server-only (API routes only)

### Setting Environment Variables in Vercel

```powershell
# Method 1: Vercel Dashboard
# 1. Go to https://vercel.com/dashboard
# 2. Select project: discomi-mvp
# 3. Click: Settings → Environment Variables
# 4. Add each variable for Production environment

# Method 2: CLI (from project root)
vercel env add SUPABASE_URL production
# Paste your URL when prompted

vercel env add SUPABASE_SERVICE_ROLE production
# Paste your service role key when prompted
```

## 🚀 Deployment

```powershell
# Deploy to production
vercel --prod --force
```

## 🧪 Testing

### 1. Register a Test User

```powershell
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"  # Your Omi user ID
$HOOK = "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"

$body = @{
  uid = $UID
  webhookUrl = $HOOK
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

Write-Host "Response:" -ForegroundColor Green
$response
```

**Expected Response:**
```json
{
  "ok": true,
  "omiWebhook": "https://discomi-mvp-ochre.vercel.app/api/webhook?token=u_abc123..."
}
```

### 2. Verify in Supabase

In Supabase dashboard:

1. Go to **Table Editor** → `user_configs`
2. You should see your user record with:
   - `uid`: Your user ID
   - `webhook_url`: Your Discord webhook
   - `token`: Generated 48-char token (starts with `u_`)
   - `options`: JSON object with defaults
   - `created_at`, `updated_at`: Timestamps

### 3. Test Webhook

```powershell
.\test-omi-payload.ps1 -Token "u_your_token_from_above" -Uid "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
```

**Expected Result:**
- PowerShell returns: `ok` (or `ok:BUILD_ID` if DEBUG=true)
- Discord shows embed with title and description

### 4. Configure Omi App

1. Open Omi app
2. Go to **Settings** → **Developer** → **Webhook URL**
3. Paste the `omiWebhook` URL from step 1
4. Omi will automatically append `&uid=<your_uid>`
5. Create a test memory in Omi
6. Check your Discord channel for the embed

## 📊 Data Structure

### Table: `user_configs`

| Column | Type | Description |
|--------|------|-------------|
| `uid` | text (PK) | User's unique identifier from Omi |
| `webhook_url` | text | User's Discord webhook URL |
| `token` | text | Generated authentication token (48 chars) |
| `options` | jsonb | User preferences (includeTranscript, maxChars) |
| `created_at` | timestamptz | When user registered |
| `updated_at` | timestamptz | Last updated (auto-updated via trigger) |

### Options Schema

```typescript
{
  includeTranscript?: boolean,  // Default: true
  maxChars?: number              // Default: 900, Max: 1900
}
```

## 🔐 Security Features

### Row Level Security (RLS)

- ✅ RLS enabled on `user_configs` table
- ✅ Only `service_role` can read/write (server API routes only)
- ✅ No public access
- ✅ No client-side queries possible

### Token Authentication

- 48-character random hex tokens (`u_` + 24 bytes)
- Unique per user
- Required for all webhook POST requests
- Validated server-side against Supabase record

### Service Role vs Anon Key

- **service_role**: Full access, bypasses RLS - **NEVER expose to client**
- **anon key**: Public, respects RLS - not used in DiscOmi (server-only app)

## 🛠️ Troubleshooting

### "db_error" on Registration

**Cause**: Supabase credentials not set or incorrect

**Fix:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` in Vercel env vars
2. Check they're set for **Production** environment
3. Redeploy with `vercel --prod --force`

### "setup_required" on Webhook

**Cause**: User not registered yet

**Fix:**
1. Run registration endpoint first (step 1 in Testing)
2. Verify user exists in Supabase Table Editor
3. Use correct `uid` in webhook query param

### "unauthorized" on Webhook

**Cause**: Token doesn't match Supabase record

**Fix:**
1. Check token in webhook URL matches the token returned from registration
2. Verify Omi is appending correct `&uid=...` parameter
3. Re-register if needed (will keep same token)

### RLS Policy Errors

**Cause**: Service role policy not created correctly

**Fix:**
1. Re-run the SQL schema (step 2 in Prerequisites)
2. Verify in Supabase: **Authentication** → **Policies** → `user_configs` table
3. Should see `service_read_write` policy with `service_role` target

## 🔄 Migration from Vercel KV

If you're upgrading from KV:

1. **Export existing users** (if needed):
   - Old KV keys were `user:${uid}`
   - Run a script to fetch all KV keys and migrate to Supabase

2. **Update env vars**:
   - Remove: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`
   - Add: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`

3. **Schema changes**:
   - Old: `webhookUrl` → New: `webhook_url`
   - Old: `includeAudio` option removed (not used)
   - New: `uid` is now stored in table (was only in key before)

4. **Redeploy**:
   ```bash
   git pull
   vercel --prod --force
   ```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Omi Developer Docs](https://docs.omi.me/developer/Memories/webhooks)

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] SQL schema executed successfully
- [ ] `SUPABASE_URL` set in Vercel Production
- [ ] `SUPABASE_SERVICE_ROLE` set in Vercel Production (no NEXT_PUBLIC prefix!)
- [ ] Deployed to production with `vercel --prod --force`
- [ ] Test registration returns `omiWebhook` URL
- [ ] User record visible in Supabase Table Editor
- [ ] Test webhook with PowerShell script succeeds
- [ ] Discord embed appears in channel
- [ ] Omi app configured with webhook URL
- [ ] Real Omi memory posts to Discord successfully

---

**You're all set!** 🚀 DiscOmi is now running on Supabase with secure multi-tenant user configuration storage.
