# DiscOmi - Multi-Tenant Setup Complete

## ✅ Security Features Implemented

### 1. **UID Requirement**
- All POST requests must include `?uid=<user_id>` parameter
- Returns `400 missing_uid` if uid is not provided
- Enables per-user tracking and future multi-tenant support

### 2. **Token Authentication**
- Validates `?token=<token>` against `WEBHOOK_TOKEN` environment variable
- Returns `401 unauthorized` if token doesn't match
- Single-tenant guard prevents unauthorized usage

### 3. **Optional HMAC Signature Verification**
- Verifies `X-Omi-Signature` header if `OMI_SIGNING_SECRET` is set
- Returns `401 invalid_signature` if signature check fails
- Provides additional security layer for production use

### 4. **DEBUG Flag System**
- Controlled via `DEBUG` environment variable (`true` or `false`)
- When `DEBUG=true`: Shows build ID, extractor name, payload keys, structured field presence
- When `DEBUG=false`: Clean output with minimal response
- Toggle without code changes: `vercel env add DEBUG production`

## 🔧 Current Configuration

### Environment Variables (Vercel)
```
DISCORD_WEBHOOK_URL=<your_discord_webhook_url>
WEBHOOK_TOKEN=kyle_4b6f9c2d570b4a51a9a0
BUILD_ID=discOmi-proof-001
DEBUG=true (for initial testing, set to false later)
OMI_SIGNING_SECRET=<optional>
```

### Webhook URL Format
```
https://discomi-mvp-ochre.vercel.app/api/webhook?token=<token>&uid=<user_id>
```

**Example for Omi app:**
```
https://discomi-mvp-ochre.vercel.app/api/webhook?token=kyle_4b6f9c2d570b4a51a9a0&uid=kyle
```

## 📝 Testing Workflow

### 1. Test with PowerShell Script
```powershell
.\test-omi-payload.ps1 -Token "kyle_4b6f9c2d570b4a51a9a0" -Uid "kyle"
```

### 2. Test with Live Omi Device
1. Open Omi app settings
2. Set webhook URL to: `https://discomi-mvp-ochre.vercel.app/api/webhook?token=kyle_4b6f9c2d570b4a51a9a0&uid=kyle`
3. Create a test memory with distinctive text
4. Check Discord for embed with:
   - ✅ Title from `structured.title`
   - ✅ Body from `structured.overview` or transcript
   - ✅ Conversation ID (numeric ID properly converted)
   - ✅ Debug fields (if DEBUG=true)

### 3. Verify Version
```powershell
Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/version"
```

## 🚀 Production Deployment

### When Ready to Ship:

1. **Set DEBUG to false**
   ```powershell
   vercel env rm DEBUG production
   echo false | vercel env add DEBUG production
   vercel --prod --force
   ```

2. **Verify clean output**
   - Test webhook should return simple `ok` (not `ok:BUILD_ID`)
   - Discord embeds should have no debug fields
   - Only title, body, timestamp, conversation ID, and optional audio link

## 🔮 Future Multi-Tenant Expansion

**Ready for Vercel KV integration:**

Replace single-tenant check with:
```typescript
// In webhook handler, after uid extraction:
const user = await kv.get<UserCfg>(`user:${uid}`);
if (!user) return res.status(403).send("setup_required");
if (String(req.query.token) !== user.token) return res.status(401).send("unauthorized");

// Use user's Discord webhook:
const DISCORD_URL = user.discord_webhook_url;
```

**Setup flow:**
1. User visits `/setup` page
2. Enters their Discord webhook URL
3. System generates unique token
4. Returns personalized webhook URL: `https://discomi-mvp-ochre.vercel.app/api/webhook?token=<generated>&uid=<user_id>`
5. User pastes into Omi app

## 📊 Numeric ID Fix

**Problem**: Omi sends `id` as number, not string  
**Solution**: Added `strOrNum()` and `pickSN()` helpers that accept both string and number types

**Extractors updated:**
- `id`: Uses `pickSN()` to handle numeric IDs
- `created_at`: Uses `pickSN()` to handle numeric timestamps
- Properly coerces to string for Discord embed footer

## 🎯 Current Status

- ✅ Multi-tenant safeguards active
- ✅ UID requirement enforced
- ✅ Token authentication working
- ✅ Numeric ID handling fixed
- ✅ DEBUG flag system operational
- ✅ Clean typed extractors (no `any` types)
- ✅ Version endpoint for deployment verification

**Git SHA**: `3c9d045`  
**BUILD_ID**: `discOmi-proof-001`  
**Status**: Ready for live Omi testing

## 📋 Next Steps

1. **Live test with Omi device** - Verify title, overview, and conversation ID appear correctly
2. **Flip DEBUG to false** - Remove debug fields for production
3. **Monitor first memories** - Ensure extraction works consistently
4. **Optional**: Add Vercel KV for true multi-tenant support
5. **Optional**: Create `/setup` page for user onboarding

---

**Built with**: Next.js 15, TypeScript, Vercel Serverless Functions  
**Repository**: `k00jax/discomi_MVP`  
**Domain**: `discomi-mvp-ochre.vercel.app`
