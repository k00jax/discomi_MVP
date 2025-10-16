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

// --- helpers ---
function isObj(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object"; }
function pickStr(...vals: unknown[]): string | undefined {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}
function path(o: unknown, keys: string[]): unknown {
  let cur: unknown = o;
  for (const k of keys) { if (!isObj(cur)) return undefined; cur = cur[k]; }
  return cur;
}

// Extract across common shapes
function extractFields(body: unknown) {
  const b = isObj(body) ? body : {};

  const id = pickStr(
    b["id"], b["conversation_id"],
    path(b, ["conversation","id"]), path(b, ["memory","id"]),
    path(b, ["data","id"]), path(b, ["event","id"])
  ) || "unknown";

  const title = pickStr(
    b["title"], b["summary"],
    path(b, ["conversation","title"]), path(b, ["memory","title"]),
    path(b, ["data","title"]), path(b, ["event","title"])
  ) || "New Omi memory";

  const text = pickStr(
    b["text"], b["content"], b["transcript"],
    path(b, ["memory","text"]), path(b, ["memory","content"]),
    path(b, ["conversation","summary"]),
    path(b, ["message"]), path(b, ["data","text"]),
  ) || "(no text)";

  const user = pickStr(
    path(b, ["user","name"]),
    path(b, ["user","display_name"]),
    b["author"], path(b, ["account","name"]),
    path(b, ["creator","name"]), path(b, ["owner","name"])
  ) || "unknown";

  const ts = pickStr(
    b["created_at"], b["createdAt"],
    path(b, ["memory","created_at"]), path(b, ["conversation","created_at"]),
    b["timestamp"]
  ) || new Date().toISOString();

  const audio = pickStr(
    b["audio_url"], path(b, ["media","audio_url"]),
    path(b, ["memory","audio_url"])
  );

  const link = pickStr(
    b["url"], b["deep_link"],
    path(b, ["links","web"]), path(b, ["memory","url"]),
    path(b, ["conversation","url"])
  );

  return { id, title, text, user, ts, audio, link };
}

function toDiscordPayload(rawBody: unknown) {
  // Log top-level keys for one run
  try {
    const keys = isObj(rawBody) ? Object.keys(rawBody) : [];
    console.log("[DiscOmi] inbound keys:", keys);
  } catch {}

  const { id, title, text, user, ts, audio, link } = extractFields(rawBody);

  const raw = String(text || "");
  const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 400;
  const bodyText = raw.slice(0, limit);

  const fields: Array<{name:string; value:string}> = [];
  if (audio) fields.push({ name: "Audio", value: String(audio) });

  // Optional debug: include first 900 chars of raw JSON so we can see the shape
  if (process.env.DEBUG_RAW === "true") {
    try {
      const dbg = JSON.stringify(rawBody, null, 2);
      fields.push({ name: "Debug", value: "```json\n" + dbg.slice(0, 900) + (dbg.length > 900 ? "…":"") + "\n```" });
    } catch {}
  }

  return {
    content: null,
    embeds: [{
      title: "New Omi Conversation",
      description: [
        `**${title}**`,
        `by **${user}** at ${ts}`,
        "",
        bodyText + (raw.length > limit ? "…" : "")
      ].join("\n"),
      url: link || undefined,
      timestamp: new Date().toISOString(),
      footer: { text: `Conversation ID: ${id}` },
      fields
    }],
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
    // Using parsed JSON; switch to raw bytes only if Omi requires exact-byte HMAC
    const raw = JSON.stringify(req.body ?? {});
    if (!verifySignature(req, raw)) return res.status(401).send("invalid_signature");
    if (!DISCORD_WEBHOOK_URL) return res.status(500).send("missing_webhook");

    // toDiscordPayload now logs keys and handles debug mode internally
    const payload = toDiscordPayload(req.body ?? {});

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
