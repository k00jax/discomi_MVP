import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { Readable } from "stream";

// ---------- ENV ----------
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || "";
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "";

// ---------- Next config: read raw bytes ourselves ----------
export const config = {
  api: {
    bodyParser: false, // critical: we handle raw body for any content-type
  },
};

// ---------- Utils ----------
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const get = (o: unknown, k: string): unknown => (isObj(o) ? o[k] : undefined);
const pickStr = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
};

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

// ---------- Extractors ----------
function extractFields(bodyUnknown: unknown) {
  const b = isObj(bodyUnknown) ? bodyUnknown : {};

  // Prefer your prior FongerBot shape first
  const id = pickStr(
    get(b,"conversation_id"),
    get(b,"id"),
    get(get(b,"conversation"),"id"),
    get(get(b,"memory"),"id")
  ) || "unknown";

  const title = pickStr(
    get(b,"title"),
    get(b,"summary"),
    get(get(b,"conversation"),"title"),
    get(get(b,"memory"),"title")
  ) || "New Omi memory";

  const text = pickStr(
    get(b,"text"),
    get(b,"content"),
    get(b,"transcript"),
    get(get(b,"memory"),"text"),
    get(get(b,"memory"),"content"),
    get(get(b,"conversation"),"summary"),
    get(b,"message")
  );

  const user = pickStr(
    get(get(b,"user"),"name"),
    get(b,"author"),
    get(get(b,"account"),"name"),
    get(get(b,"creator"),"name"),
    get(get(b,"owner"),"name")
  ) || "unknown";

  const ts = pickStr(
    get(b,"timestamp"),
    get(b,"created_at"),
    get(b,"createdAt"),
    get(get(b,"memory"),"created_at"),
    get(get(b,"conversation"),"created_at")
  ) || new Date().toISOString();

  const audio = pickStr(
    get(b,"audio_url"),
    get(get(b,"media"),"audio_url"),
    get(get(b,"memory"),"audio_url")
  );

  const link = pickStr(
    get(b,"url"),
    get(b,"deep_link"),
    get(get(b,"links"),"web"),
    get(get(b,"conversation"),"url")
  );

  return { id, title, text, user, ts, audio, link };
}

function buildEmbed(bodyUnknown: unknown, fieldsExtra: Array<{name: string; value: string}> = []) {
  const { id, title, text, user, ts, audio, link } = extractFields(bodyUnknown);

  // Fail-soft text
  const rawJson = (() => {
    try { return typeof bodyUnknown === "string" ? bodyUnknown : JSON.stringify(bodyUnknown); }
    catch { return String(bodyUnknown); }
  })();
  const textFinal = text || (rawJson ? rawJson : "(no text)");

  const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 400;
  const bodyText = String(textFinal).slice(0, limit);

  const fields: Array<{name: string; value: string}> = [];
  if (audio) fields.push({ name: "Audio", value: String(audio) });
  fields.push(...fieldsExtra);

  return {
    content: null,
    embeds: [{
      title: "New Omi Conversation",
      description: [
        `**${title}**`,
        `by **${user}** at ${ts}`,
        "",
        bodyText + (String(textFinal).length > limit ? "…" : "")
      ].join("\n"),
      url: link || undefined,
      timestamp: new Date().toISOString(),
      footer: { text: `Conversation ID: ${id}` },
      fields
    }]
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

    // Force visible debug for this run so we SEE what Omi sent
    const extra = [
      { name: "Debug-CT",   value: ct || "(none)" },
      { name: "Debug-Peek", value: "```" + String(typeof bodyUnknown === "string" ? bodyUnknown : JSON.stringify(bodyUnknown, null, 2)).slice(0, 400) + "```" }
    ];
    const discordPayload = buildEmbed(bodyUnknown, extra);

    // Always include a short debug peek for live Omi hits (remove after mapping)
    const ct = String(req.headers["content-type"] || "");
    try {
      const dbg = typeof bodyUnknown === "string"
        ? bodyUnknown
        : JSON.stringify(bodyUnknown, null, 2);
      (discordPayload.embeds[0].fields ||= []).push(
        { name: "Debug-CT", value: ct || "(none)" },
        { name: "Debug-Peek", value: "```json\n" + dbg.slice(0, 400) + (dbg.length > 400 ? "…" : "") + "\n```" }
      );
    } catch {}


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
