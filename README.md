# DiscOmi — Omi to Discord relay

## What it does
Posts new Omi memories into Discord via channel webhooks. Token secured. Optional short vs full text.

## Requirements
- Discord channel webhook URL
- Vercel project for serverless deploy

## Environment variables
- DISCORD_WEBHOOK_URL: Default Discord webhook
- WEBHOOK_TOKEN: Shared secret required in the webhook URL as ?token=...
- OMI_SIGNING_SECRET: Optional request signature check
- POST_FULL_TEXT: "true" or "false" to control body length

## Deploy
1) Fork or import this repo into Vercel.
2) Set env vars for Preview and Production.
3) Deploy. Confirm `/api/setup-complete` returns 200.

## Omi setup
Webhook URL:
https://<your-domain>/api/webhook?token=<WEBHOOK_TOKEN>

Setup Completed URL:
https://<your-domain>/api/setup-complete

## Test
curl -X POST "https://<your-domain>/api/webhook?token=<WEBHOOK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test memory","text":"Hello from DiscOmi","user":{"name":"Kyle"}}'

## Privacy
Stateless relay. No data stored. Only transient processing in serverless runtime. Logs limited to function logs for debugging.
