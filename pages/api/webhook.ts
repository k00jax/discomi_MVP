import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { Readable } from "stream";

// ---------- Next config: read raw bytes ourselves ----------
export const config = { api: { bodyParser: false } };
const BUILD_ID = process.env.BUILD_ID || "unknown";

// ---------- ENV ----------
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || "";
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "";

// ---------- Typed helpers ----------
type UnknownRec = Record<string, unknown>;
const asRec = (v: unknown): UnknownRec =>
  v && typeof v === "object" ? (v as UnknownRec) : {};

const str = (v: unknown | undefined): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

// Accept string or number and return string
const strOrNum = (v: unknown): string | undefined => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
};

function pick(...vals: Array<unknown>): string | undefined {
  for (const v of vals) {
    const s = str(v);
    if (s) return s;
  }
  return undefined;
}

function pickSN(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    const s = strOrNum(v);
    if (s) return s;
  }
  return undefined;
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of (req as unknown as Readable)) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
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

// ---------- Omi shapes ----------
type Seg = { text?: string };
type Structured = { title?: string; overview?: string };

// ---------- Extractors tuned for Omi ----------
function extractFromOmiMemory(body: unknown) {
  const b = asRec(body);

  const structured = asRec(b["structured"]) as Structured;
  const segments = (Array.isArray(b["transcript_segments"])
    ? (b["transcript_segments"] as unknown[])
    : []
  ).map((x) => asRec(x) as Seg);

  const id =
    pickSN(b["id"], b["conversation_id"], asRec(b["conversation"])["id"], asRec(b["memory"])["id"]) ??
    "unknown";

  const created_at =
    pickSN(
      b["created_at"],
      asRec(b["memory"])["created_at"],
      asRec(b["conversation"])["created_at"]
    ) ?? new Date().toISOString();

  const title =
    str((structured as Structured).title) ||
    pick(b["title"], asRec(b["conversation"])["title"], asRec(b["memory"])["title"]) ||
    "New Omi memory";

  let bodyText =
    str((structured as Structured).overview) ||
    pick(b["summary"], asRec(b["conversation"])["summary"]) ||
    "";

  if (!bodyText && segments.length) {
    bodyText = segments
      .map((s) => str(s.text) || "")
      .filter(Boolean)
      .join(" ");
  }

  const audio =
    pick(
      b["audio_url"],
      asRec(b["media"])["audio_url"],
      asRec(b["memory"])["audio_url"]
    ) || undefined;

  const link =
    pick(
      b["url"],
      b["deep_link"],
      asRec(b["links"])["web"],
      asRec(b["conversation"])["url"]
    ) || undefined;

  return {
    id,
    title,
    body: bodyText || "(no text)",
    created_at,
    audio,
    link,
  };
}

function toDiscordPayloadOmi(rawBody: unknown, uid?: string) {
  const { id, title, body, created_at, audio, link } = extractFromOmiMemory(rawBody);

  const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 400;
  const footerExtra = uid ? ` • uid: ${uid}` : "";

  return {
    content: null,
    embeds: [
      {
        title: "New Omi Conversation",
        description: [
          `**${title}**`,
          `at ${created_at}`,
          "",
          body.slice(0, limit) + (body.length > limit ? "…" : ""),
        ].join("\n"),
        url: link || undefined,
        timestamp: new Date().toISOString(),
        footer: { text: `Conversation ID: ${id}${footerExtra}` },
        fields: audio ? [{ name: "Audio", value: audio }] : [],
      },
    ],
  };
}

// ---------- Handler ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Advertise accepted methods; allow health checks
  res.setHeader("Allow", "POST, GET, HEAD, OPTIONS");
  if (req.method === "GET")  return res.status(200).send("ok");
  if (req.method === "HEAD") return res.status(200).end();
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")  return res.status(405).send("method_not_allowed");

  // Token-gate POSTs
  const token = (req.query.token as string | undefined) ?? "";
  if (!WEBHOOK_TOKEN || token !== WEBHOOK_TOKEN) return res.status(401).send("unauthorized");

  try {
    // Read raw bytes no matter the content-type
    const raw = await readRawBody(req);
    const ct  = String(req.headers["content-type"] || "");

    // Optional: verify signature over raw if you set OMI_SIGNING_SECRET
    if (!verifySignature(req, raw)) return res.status(401).send("invalid_signature");
    if (!DISCORD_WEBHOOK_URL) return res.status(500).send("missing_webhook");

    // Parse flexibly:
    let bodyUnknown: unknown = raw;

    if (ct.includes("application/json")) {
      bodyUnknown = safeJsonParse(raw);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      const payload = params.get("payload") || params.get("data") || params.get("body");
      if (payload) {
        bodyUnknown = safeJsonParse(payload);
      } else if ([...params.keys()].length === 1) {
        const onlyKey = [...params.keys()][0];
        bodyUnknown = safeJsonParse(params.get(onlyKey) || "");
      } else {
        bodyUnknown = Object.fromEntries(params.entries());
      }
    } else if (ct.includes("multipart/form-data")) {
      // naive multipart peek: try to find JSON-looking chunk
      const m = raw.match(/\{[\s\S]*\}/);
      bodyUnknown = m ? safeJsonParse(m[0]) : raw;
    } else if (ct.includes("text/plain")) {
      bodyUnknown = safeJsonParse(raw);
    } else {
      // unknown type; try JSON first
      bodyUnknown = safeJsonParse(raw);
    }

    // Log build and parsed keys for debugging
    console.log("[DiscOmi] build", BUILD_ID, "keys:", typeof bodyUnknown === "object" && bodyUnknown ? Object.keys(bodyUnknown as UnknownRec) : "(not object)");

    // Extract uid from query params if present (Omi appends ?uid=...)
    const uid = typeof req.query?.uid === "string" ? req.query.uid : undefined;
    const discordPayload = toDiscordPayloadOmi(bodyUnknown, uid);

    // Force visible debug stamps to verify correct build/extractor
    (discordPayload.embeds[0].fields ||= []).push(
      { name: "Debug-Build", value: BUILD_ID },
      { name: "Debug-Extractor", value: "toDiscordPayloadOmi" }
    );

    // Additional debug for structured payload
    const b = asRec(bodyUnknown);
    const hasStructured = Object.prototype.hasOwnProperty.call(b, "structured");
    const keys = Object.keys(b).slice(0, 20).join(", ");

    (discordPayload.embeds[0].fields ||= []).push(
      { name: "Debug-Keys", value: keys || "(no keys)" },
      { name: "Debug-structured?", value: String(hasStructured) }
    );

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
    return res.status(200).send(`ok:${BUILD_ID}`);
  } catch (e) {
    console.error(e);
    return res.status(500).send("server_error");
  }
}
