# DiscOmi — Omi AI to Discord Integration

## What it does

Posts your Omi memories to your Discord channel with:
- ✅ **Multi-tenant** - Each user gets their own config
- ✅ **Self-service** - Register yourself via web form
- ✅ **Secure** - Per-user tokens, no shared credentials
- ✅ **Rich embeds** - Category-based emoji and colors
- ✅ **Clean design** - Simple, distraction-free Discord messages

## Architecture

- **Storage**: Supabase (PostgreSQL with Row Level Security)
- **Deployment**: Vercel serverless functions
- **Security**: Per-user tokens, HMAC signature verification
- **Privacy**: No memory content stored, direct relay only

## Quick Start

### 1. Prerequisites

- Supabase project ([create one](https://supabase.com/dashboard))
- Vercel account ([sign up](https://vercel.com/signup))
- Discord webhook URL ([guide](https://support.discord.com/hc/en-us/articles/228383668))

### 2. Setup Supabase

See **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)** for detailed instructions.

**Quick version:**
1. Create Supabase project
2. Run SQL schema from `SUPABASE-SETUP.md`
3. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` key

### 3. Deploy to Vercel

```bash
# Clone repo
git clone https://github.com/k00jax/discomi_MVP.git
cd discomi_MVP

# Install dependencies
npm install

# Deploy to Vercel
vercel --prod
```

### 4. Set Environment Variables

In Vercel dashboard → Project → Settings → Environment Variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-secret-service-role-key

# Optional
BUILD_ID=v1.0
DEBUG=false
```

### 5. Register Yourself

Visit your deployment's `/setup` page:
```
https://your-domain.vercel.app/setup
```

Or use the API directly:
```powershell
$body = @{
  uid = "your-omi-user-id"
  webhookUrl = "https://discord.com/api/webhooks/YOUR_WEBHOOK"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://your-domain.vercel.app/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Save the `omiWebhook` URL returned!

### 6. Configure Omi App

1. Open Omi app
2. Go to **Settings** → **Developer** → **Webhook URL**
3. Paste your `omiWebhook` URL
4. Omi will automatically append your `uid`
5. Create a memory and watch it appear in Discord! 🎉

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | Supabase service role key (secret!) | `eyJhbG...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `BUILD_ID` | Deployment version identifier | `unknown` |
| `DEBUG` | Show debug fields in Discord embeds | `false` |
| `OMI_SIGNING_SECRET` | HMAC signature verification key | (none) |
| `NEXT_PUBLIC_BOT_NAME` | Discord bot display name | `DiscOmi` |
| `NEXT_PUBLIC_BOT_AVATAR_URL` | Bot avatar image URL | Omi icon |
| `NEXT_PUBLIC_OMI_ICON_URL` | Omi icon URL | Default icon |

## API Endpoints

### `POST /api/register`

Register a new user with their Discord webhook.

**Request:**
```json
{
  "uid": "your-omi-user-id",
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "options": {
    "includeTranscript": true,
    "maxChars": 900
  }
}
```

**Response:**
```json
{
  "ok": true,
  "omiWebhook": "https://domain/api/webhook?token=u_abc123..."
}
```

### `POST /api/webhook?token=<token>&uid=<uid>`

Receives Omi memory and posts to Discord.

**Called by**: Omi app (automatically when you create a memory)

**Response:**
- `200 ok` - Success
- `400 missing_uid` - No uid parameter
- `401 unauthorized` - Invalid token
- `403 setup_required` - User not registered

### `GET /api/version`

Deployment verification endpoint.

**Response:**
```json
{
  "build": "v1.0",
  "file": "/var/task/pages/api/version.ts",
  "sha": "b2dd307..."
}
```

### `GET /api/setup-complete`

Omi app store requirement.

**Response:**
```json
{
  "is_setup_completed": true
}
```

## Testing

### Test Registration

```powershell
.\test-omi-payload.ps1 -Token "your-token" -Uid "your-uid"
```

Or manually:
```powershell
$payload = @{
  id = 123
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  structured = @{
    title = "Test Memory"
    overview = "This is a test from DiscOmi!"
    category = "personal"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://your-domain/api/webhook?token=YOUR_TOKEN&uid=YOUR_UID" `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

## Privacy & Security

- ✅ **No data storage** - Memory content never stored, only relayed
- ✅ **Row Level Security** - Supabase RLS enforces server-only access
- ✅ **Per-user tokens** - 48-character random tokens, unique per user
- ✅ **Service role only** - Client-side queries impossible
- ✅ **HMAC verification** - Optional signature validation
- ✅ **Minimal logging** - Only UIDs and status codes logged

## Documentation

- **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)** - Complete setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design
- **[DISCORD-EMBED-SHOWCASE.md](./DISCORD-EMBED-SHOWCASE.md)** - Embed examples

## Troubleshooting

### "db_error" on registration

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` are set in Vercel
- Check Supabase project is active (not paused)
- Verify SQL schema was executed

### "setup_required" on webhook

- Register first via `/api/register`
- Verify user exists in Supabase Table Editor
- Check correct `uid` in webhook URL

### Discord embed not appearing

- Test Discord webhook URL directly
- Check Vercel function logs for errors
- Verify webhook URL in database is correct

See **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)** for complete troubleshooting guide.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/k00jax/discomi_MVP/issues)
- **Omi Docs**: [docs.omi.me](https://docs.omi.me)
- **Discord**: [Omi Community](https://discord.gg/omi)

