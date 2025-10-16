import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || ""; // optional

function verifySignature(req: NextApiRequest, rawBody: string): boolean {
  if (!OMI_SIGNING_SECRET) return true;
  const header = (req.headers["x-omi-signature"] as string) || "";
  const hmac = crypto.createHmac("sha256", OMI_SIGNING_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};

function toDiscordPayload(body: any) {
  const id = body.id || body.conversation_id || "unknown";
  const title = body.title || body.summary || "New Omi memory";
  const text = body.text || body.content || "(no text)";
  const user = body.user?.name || body.author || "unknown";
  const ts = body.created_at || new Date().toISOString();
  const audio = body.audio_url || body.media?.audio_url;
  const link = body.url || body.deep_link;

  const desc = [
    `**${title}**`,
    `by **${user}** at ${ts}`,
    "",
    (text || "").slice(0, 1200) + (text && text.length > 1200 ? "…" : ""),
  ].join("\n");

  return {
    content: null,
    embeds: [
      {
        title: "New Omi Conversation",
        description: desc,
        url: link || undefined,
        timestamp: new Date().toISOString(),
        footer: { text: `Conversation ID: ${id}` },
        fields: audio ? [{ name: "Audio", value: audio }] : [],
      },
    ],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Grab raw body for signature verification if Omi sends one
  // Next.js doesn’t expose raw by default; for v1 we’ll accept parsed JSON.
  // If Omi requires exact raw bytes, we’ll switch to an edge/middleware reader.

  if (req.method !== "POST") return res.status(405).send("method_not_allowed");

  try {
    const raw = JSON.stringify(req.body || {});
    if (!verifySignature(req, raw)) return res.status(401).send("invalid_signature");
    if (!DISCORD_WEBHOOK_URL) return res.status(500).send("missing_webhook");

    const payload = toDiscordPayload(req.body || {});
    const r = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Discord error:", err);
      return res.status(502).send("discord_error");
    }

    return res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    return res.status(500).send("server_error");
  }
}
