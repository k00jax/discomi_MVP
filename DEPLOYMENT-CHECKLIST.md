# 🚀 Supabase Migration Complete - Deployment Checklist

## ✅ Code Migration Status

**All code changes committed and pushed!**

- ✅ **Commit `b2dd307`**: Supabase migration (KV removed, Supabase added)
- ✅ **Commit `c4b72bf`**: Documentation updates (ARCHITECTURE.md, README.md)
- ✅ **Branch**: `master`
- ✅ **Remote**: `k00jax/discomi_MVP`

### Files Changed

```
lib/supabase.ts              ✅ NEW - Supabase admin client
types.ts                     ✅ UPDATED - UserConfig type (snake_case)
pages/api/register.ts        ✅ UPDATED - Supabase upsert
pages/api/webhook.ts         ✅ UPDATED - Supabase lookup
ARCHITECTURE.md              ✅ NEW - Complete architecture doc
README.md                    ✅ UPDATED - Removed KV references
SUPABASE-SETUP.md            ✅ NEW - Setup guide
package.json                 ✅ UPDATED - Removed @vercel/kv, added @supabase/supabase-js
package-lock.json            ✅ UPDATED - Dependencies
```

### No Errors

```bash
✅ webhook.ts    - No TypeScript errors
✅ register.ts   - No TypeScript errors
✅ supabase.ts   - No TypeScript errors
✅ types.ts      - No TypeScript errors
```

---

## 🎯 Next Steps (YOU NEED TO DO)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Choose organization and name (e.g., `discomi-prod`)
4. Select region closest to users
5. Set database password (save it!)
6. Wait ~2 minutes for initialization

### Step 2: Run SQL Schema

1. In Supabase dashboard → **SQL Editor**
2. Click **New query**
3. Copy/paste this schema:

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

4. Click **Run** (bottom right)
5. Verify: No errors, "Success. No rows returned"

### Step 3: Get Supabase Credentials

1. In Supabase dashboard → **Settings** → **API**
2. Copy **Project URL** (e.g., `https://abc123.supabase.co`)
3. Scroll down to **Project API keys**
4. Copy **`service_role`** key (the secret one, not anon!)
5. **⚠️ IMPORTANT**: This is a secret key - never commit to git!

### Step 4: Set Vercel Environment Variables

**Option A: Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Select project: `discomi-mvp`
3. Click **Settings** → **Environment Variables**
4. Add these variables for **Production** environment:

```
Key: SUPABASE_URL
Value: https://YOUR-PROJECT.supabase.co

Key: SUPABASE_SERVICE_ROLE
Value: eyJhbG...YOUR-SECRET-SERVICE-ROLE-KEY
```

**Option B: Vercel CLI**

```powershell
# From project root
vercel env add SUPABASE_URL production
# Paste: https://YOUR-PROJECT.supabase.co

vercel env add SUPABASE_SERVICE_ROLE production
# Paste: eyJhbG...YOUR-SECRET-SERVICE-ROLE-KEY
```

### Step 5: Remove Old Environment Variables (Optional Cleanup)

Remove these if they exist (no longer used):

```powershell
vercel env rm KV_REST_API_URL production
vercel env rm KV_REST_API_TOKEN production
vercel env rm KV_URL production
vercel env rm DISCORD_WEBHOOK_URL production
vercel env rm WEBHOOK_TOKEN production
vercel env rm USE_SUPABASE production
vercel env rm USE_KV production
```

Or in dashboard: Delete each one manually.

### Step 6: Deploy to Production

```powershell
# Force redeploy with new environment variables
vercel --prod --force
```

Wait ~2-3 minutes for deployment to complete.

### Step 7: Verify Deployment

```powershell
# Test version endpoint
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/version"

# Expected output:
# build: unknown (or your BUILD_ID if set)
# file: /var/task/pages/api/version.ts
# sha: c4b72bf...
```

If you get an error, check Vercel deployment logs.

### Step 8: Register Yourself

```powershell
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"  # Your Omi user ID
$WEBHOOK = "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"

$body = @{
  uid = $UID
  webhookUrl = $WEBHOOK
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://discomi-mvp-ochre.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

Write-Host "`n✅ Registration successful!" -ForegroundColor Green
Write-Host "Copy this URL into Omi app:`n" -ForegroundColor Cyan
$response.omiWebhook
```

**Expected output:**
```
✅ Registration successful!
Copy this URL into Omi app:

https://discomi-mvp-ochre.vercel.app/api/webhook?token=u_abc123def456...
```

### Step 9: Verify in Supabase

1. Go to Supabase dashboard → **Table Editor**
2. Click table: `user_configs`
3. You should see your record:
   - `uid`: Your Omi user ID
   - `webhook_url`: Your Discord webhook
   - `token`: Generated token (starts with `u_`)
   - `created_at`, `updated_at`: Timestamps

### Step 10: Test Webhook

```powershell
# Use the token from step 8
$TOKEN = "u_your_token_from_above"
$UID = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"

.\test-omi-payload.ps1 -Token $TOKEN -Uid $UID
```

**Expected:**
- PowerShell: `Response: ok`
- Discord: Embed appears with title and description

### Step 11: Configure Omi App

1. Open Omi app on your device
2. Go to **Settings** → **Developer** → **Webhook URL**
3. Paste the `omiWebhook` URL from step 8
4. Save

**Note**: Omi automatically appends `&uid=<your_uid>` to the URL.

### Step 12: Create Real Memory

1. Use your Omi device
2. Have a conversation or take notes
3. Let Omi process the memory
4. Check your Discord channel

**Expected:**
- Discord embed with:
  - Category emoji (🧠 💼 📅 ✅ 💡 🎧)
  - Title from structured data
  - Overview or transcript
  - Timestamp
  - Color-coded by category

---

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] SQL schema executed (no errors)
- [ ] `SUPABASE_URL` set in Vercel Production
- [ ] `SUPABASE_SERVICE_ROLE` set in Vercel Production
- [ ] Old env vars removed (KV_*, DISCORD_WEBHOOK_URL, WEBHOOK_TOKEN)
- [ ] Deployed with `vercel --prod --force`
- [ ] `/api/version` returns valid response
- [ ] Registration successful, token received
- [ ] User record visible in Supabase Table Editor
- [ ] Test webhook returns `ok`
- [ ] Discord embed appears correctly
- [ ] Omi app configured with webhook URL
- [ ] Real Omi memory posts to Discord

---

## 🛑 Troubleshooting

### Registration fails with "db_error"

**Cause**: Supabase not configured or credentials wrong

**Fix**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` in Vercel
2. Check Supabase project is active (dashboard shows green status)
3. Verify SQL schema was executed successfully
4. Check Vercel function logs for detailed error

### Webhook returns "setup_required"

**Cause**: User not registered yet

**Fix**:
1. Register first (step 8)
2. Verify user exists in Supabase Table Editor
3. Use exact same `uid` in webhook URL

### Webhook returns "unauthorized"

**Cause**: Token doesn't match

**Fix**:
1. Copy token exactly from registration response
2. Verify Omi is appending correct `&uid=...`
3. Re-register if token was regenerated

### Discord embed doesn't appear

**Cause**: Discord webhook URL invalid or rate limited

**Fix**:
1. Test Discord webhook directly:
   ```powershell
   $payload = @{ content = "Test from DiscOmi" } | ConvertTo-Json
   Invoke-RestMethod -Uri "YOUR_DISCORD_WEBHOOK" -Method Post -ContentType "application/json" -Body $payload
   ```
2. Check Vercel function logs for Discord errors
3. Verify webhook URL in Supabase is correct (no typos)

### Vercel deployment fails

**Cause**: Missing dependencies or build errors

**Fix**:
1. Check Vercel deployment logs for errors
2. Verify `package.json` has `@supabase/supabase-js`
3. Ensure `node_modules` is not committed to git
4. Try: `rm -rf node_modules package-lock.json && npm install`

---

## 📚 Reference Documentation

- **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)** - Detailed setup guide with examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design decisions
- **[README.md](./README.md)** - Project overview and quick start

---

## 🔐 Security Reminders

- ✅ Never commit `SUPABASE_SERVICE_ROLE` to git
- ✅ Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE` (client exposure)
- ✅ Service role should only be in server files (`lib/supabase.ts`, API routes)
- ✅ Row Level Security is enabled on `user_configs` table
- ✅ RLS policy grants access only to `service_role`
- ✅ User tokens are 48 characters, cryptographically random
- ✅ No memory content is logged or stored

---

## 🎯 What Changed in This Migration

### Removed

- ❌ `@vercel/kv` package
- ❌ All KV imports and code
- ❌ `USE_KV` flag
- ❌ `DISCORD_WEBHOOK_URL` env var (now per-user)
- ❌ `WEBHOOK_TOKEN` env var (now per-user)
- ❌ Single-tenant fallback code

### Added

- ✅ `@supabase/supabase-js` package
- ✅ `lib/supabase.ts` - Admin client
- ✅ Supabase config lookups in webhook handler
- ✅ Per-user configuration storage
- ✅ `ARCHITECTURE.md` - Complete documentation
- ✅ Updated `README.md` with Supabase instructions

### Changed

- 🔄 `UserConfig` type now has `uid` and uses `webhook_url` (snake_case)
- 🔄 `register.ts` now upserts to Supabase instead of KV
- 🔄 `webhook.ts` now queries Supabase instead of KV
- 🔄 All authentication now Supabase-based

---

**Status**: ✅ **Code is ready! Just need to configure Supabase and deploy.**

Follow the steps above in order. Each step depends on the previous one.

Good luck! 🚀
