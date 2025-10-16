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

// --- helpers to safely read unknown payloads ---
function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}
function pickStr(...vals: unknown[]): string | undefined {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}
function path(o: unknown, keys: string[]): unknown {
  let cur: unknown = o;
  for (const k of keys) {
    if (!isObj(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

// Extract the most likely fields from various Omi shapes
function extractFields(body: unknown) {
  const b = isObj(body) ? body : {};

  const id = pickStr(
    (b.id as string),
    (b["conversation_id"] as string),
    path(b, ["conversation", "id"]) as string,
    path(b, ["memory", "id"]) as string,
  ) || "unknown";

  const title = pickStr(
    (b["title"] as string),
    (b["summary"] as string),
    path(b, ["conversation", "title"]) as string,
    path(b, ["memory", "title"]) as string,
  ) || "New Omi memory";

  const text = pickStr(
    (b["text"] as string),
    (b["content"] as string),
    (b["transcript"] as string),
    path(b, ["memory", "text"]) as string,
    path(b, ["memory", "content"]) as string,
    path(b, ["message"]) as string,
  ) || "(no text)";

  const user = pickStr(
    path(b, ["user", "name"]) as string,
    (b["author"] as string),
    path(b, ["account", "name"]) as string,
    path(b, ["creator", "name"]) as string,
    path(b, ["owner", "name"]) as string,
  ) || "unknown";

  const ts = pickStr(
    (b["created_at"] as string),
    (b["createdAt"] as string),
    path(b, ["memory", "created_at"]) as string,
    path(b, ["conversation", "created_at"]) as string,
  ) || new Date().toISOString();

  const audio = pickStr(
    (b["audio_url"] as string),
    path(b, ["media", "audio_url"]) as string,
    path(b, ["memory", "audio_url"]) as string,
  );

  const link = pickStr(
    (b["url"] as string),
    (b["deep_link"] as string),
    path(b, ["links", "web"]) as string,
    path(b, ["memory", "url"]) as string,
  );

  return { id, title, text, user, ts, audio, link };
}

function toDiscordPayload(rawBody: OmiPayload | unknown) {
  const { id, title, text, user, ts, audio, link } = extractFields(rawBody);

  const raw = String(text || "");
  const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 400;
  const bodyText = raw.slice(0, limit);
  const desc = [
    `**${title}**`,
    `by **${user}** at ${ts}`,
    "",
    bodyText + (raw.length > limit ? "…" : "")
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
        fields: audio ? [{ name: "Audio", value: String(audio) }] : [],
      },
    ],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Always advertise what we accept
  res.setHeader("Allow", "POST, GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Temporary visibility (remove after debugging)
  console.log("[DiscOmi] method:", req.method, "path:", req.url, "qs:", req.query);

  switch (req.method) {
    case "GET":
      return res.status(200).send("ok");
    case "HEAD":
      return res.status(200).end();
    case "OPTIONS":
      return res.status(204).end();
    case "POST":
      break; // continue into POST logic below
    default:
      return res.status(405).send("method_not_allowed");
  }

  // ----- POST ONLY BELOW -----
  // Simple query-token auth
  const token = (req.query.token as string | undefined) ?? "";
  if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
    return res.status(401).send("unauthorized");
  }



  try {
    console.log("[DiscOmi] inbound keys:", Object.keys(req.body || {}));
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
