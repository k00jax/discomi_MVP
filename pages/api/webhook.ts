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
    // Visibility
    const ct = String(req.headers["content-type"] || "");
    console.log("[DiscOmi] inbound", { method: req.method, ct, hasBody: !!req.body });

    // Parse body across content types
    let bodyUnknown: unknown = req.body;
    if (typeof req.body === "string") {
      try { bodyUnknown = JSON.parse(req.body); } catch { bodyUnknown = req.body; }
    }

    // Helper utils
    const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
    const pickStr = (...vals: unknown[]) => {
      for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
      return undefined;
    };
    const path = (o: unknown, keys: string[]): unknown => {
      let cur: unknown = o;
      for (const k of keys) { if (!isObj(cur)) return undefined; cur = cur[k]; }
      return cur;
    };

    // Try common Omi shapes and generic "data" envelopes
    const b = isObj(bodyUnknown) ? bodyUnknown : {};
    const envelope = (isObj(b.data) ? b.data : b) as Record<string, unknown>;

    const id = pickStr(
      envelope.id, envelope.conversation_id,
      path(envelope, ["conversation","id"]), path(envelope, ["memory","id"])
    ) || "unknown";

    const title = pickStr(
      envelope.title, envelope.summary,
      path(envelope, ["conversation","title"]), path(envelope, ["memory","title"])
    ) || "New Omi memory";

    let text = pickStr(
      envelope.text, envelope.content, envelope.transcript,
      path(envelope, ["memory","text"]), path(envelope, ["memory","content"]),
      path(envelope, ["conversation","summary"]), path(envelope, ["message"])
    );

    const user = pickStr(
      path(envelope, ["user","name"]), path(envelope, ["user","display_name"]),
      envelope.author, path(envelope, ["account","name"]),
      path(envelope, ["creator","name"]), path(envelope, ["owner","name"])
    ) || "unknown";

    const ts = pickStr(
      envelope.created_at, envelope.createdAt,
      path(envelope, ["memory","created_at"]), path(envelope, ["conversation","created_at"]),
      envelope.timestamp
    ) || new Date().toISOString();

    const audio = pickStr(
      envelope.audio_url, path(envelope, ["media","audio_url"]),
      path(envelope, ["memory","audio_url"])
    );
    const link = pickStr(
      envelope.url, envelope.deep_link,
      path(envelope, ["links","web"]), path(envelope, ["memory","url"]),
      path(envelope, ["conversation","url"])
    );

    // Fail-soft: if no text, show first 400 chars of raw JSON
    let debugField: { name: string; value: string } | undefined;
    if (!text) {
      const dbg = (() => { try { return JSON.stringify(bodyUnknown); } catch { return String(bodyUnknown); } })() || "";
      text = dbg ? dbg.slice(0, 400) + (dbg.length > 400 ? "…" : "") : "(no text)";
      debugField = { name: "Debug", value: "Payload keys: " + Object.keys(b).join(", ") };
    }

    // Description with length control
    const raw = String(text || "");
    const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 400;
    const bodyText = raw.slice(0, limit);

    const discordPayload = {
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
        fields: [
          ...(audio ? [{ name: "Audio", value: String(audio) }] : []),
          ...(debugField ? [debugField] : []),
        ]
      }],
    };

    const r = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Discord error:", r.status, err);
      return res.status(502).send("discord_error");
    }
    return res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    return res.status(500).send("server_error");
  }
}
