import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || "";
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "";

// ---- Types for the Omi webhook body ----
type OmiUser = { name?: string };
type OmiMedia = { audio_url?: string };

interface OmiPayload {
  id?: string;
  conversation_id?: string;
  title?: string;
  summary?: string;
  text?: string;
  content?: string;
  user?: OmiUser;
  author?: string;
  created_at?: string;
  audio_url?: string;
  media?: OmiMedia;
  url?: string;
  deep_link?: string;
}

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
    bodyParser: { sizeLimit: "2mb" },
  },
};

function toDiscordPayload(body: OmiPayload) {
  const id = body.id || body.conversation_id || "unknown";
  const title = body.title || body.summary || "New Omi memory";
  const text = body.text || body.content || "(no text)";
  const user = body.user?.name || body.author || "unknown";
  const ts = body.created_at || new Date().toISOString();
  const audio = body.audio_url || body.media?.audio_url;
  const link = body.url || body.deep_link;

  const desc =
    [`**${title}**`, `by **${user}** at ${ts}`, "", (text || "").slice(0, 1200) + ((text?.length || 0) > 1200 ? "…" : "")]
      .join("\n");

  return {
    content: null,
    embeds: [
      {
        title: "New Omi Conversation",
        description: desc,
        url: link || undefined,
        timestamp: new Date().toISOString(),
        footer: { text: `Conversation ID: ${id}` },
        fields: audio ? [{ name: "Audio", value: String(audio) }] : [],
      },
    ],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow health checks and preflight
  if (req.method === "GET") return res.status(200).send("ok");
  if (req.method === "HEAD") return res.status(200).end();
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET, HEAD, OPTIONS");
    return res.status(405).send("method_not_allowed");
  }

  // Simple query-token auth (POST only)
  const token = (req.query.token as string | undefined) ?? "";
  if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
    return res.status(401).send("unauthorized");
  }


  try {
    // Using parsed JSON; switch to raw bytes only if Omi requires exact-byte HMAC
    const raw = JSON.stringify(req.body ?? {});
    if (!verifySignature(req, raw)) return res.status(401).send("invalid_signature");
    if (!DISCORD_WEBHOOK_URL) return res.status(500).send("missing_webhook");

    // Narrow to our known shape
    const payload = toDiscordPayload((req.body ?? {}) as OmiPayload);

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
