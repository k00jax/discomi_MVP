import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { Readable } from "stream";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || "";
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "";

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of (req as unknown as Readable)) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function safeJsonParse(s: string): unknown { try { return JSON.parse(s); } catch { return s; } }
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const get = (o: unknown, k: string): unknown => (isObj(o) ? o[k] : undefined);
const pickStr = (...vals: unknown[]) => { for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim(); return undefined; };

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
    bodyParser: false, // we'll read the raw stream ourselves
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
    const raw = await readRawBody(req);
    const ct = String(req.headers["content-type"] || "");
    console.log("[DiscOmi] inbound", { method: req.method, ct, rawLen: raw.length });

    if (!verifySignature(req, raw)) return res.status(401).send("invalid_signature");
    if (!DISCORD_WEBHOOK_URL) return res.status(500).send("missing_webhook");

    // Parse across types:
    let bodyUnknown: unknown = raw;

    if (ct.includes("application/json")) {
      bodyUnknown = safeJsonParse(raw);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      // Common patterns: payload=<json> OR single unnamed key containing JSON
      const payload = params.get("payload") || params.get("data") || params.get("body");
      if (payload) {
        bodyUnknown = safeJsonParse(payload);
      } else if ([...params.keys()].length === 1) {
        const onlyKey = [...params.keys()][0];
        bodyUnknown = safeJsonParse(params.get(onlyKey) || "");
      } else {
        // fallback to key/value echo
        bodyUnknown = Object.fromEntries(params.entries());
      }
    } else if (ct.includes("text/plain")) {
      bodyUnknown = safeJsonParse(raw);
    } else {
      // unknown type; try JSON, then leave as raw string
      const tryJson = safeJsonParse(raw);
      bodyUnknown = tryJson;
    }

    // ---- Extract preferred fields (your FongerBot shape first) ----
    const b = isObj(bodyUnknown) ? bodyUnknown : {};
    const id = pickStr(get(b,"conversation_id"), get(b,"id"), get(get(b,"conversation"),"id"), get(get(b,"memory"),"id")) || "unknown";
    const title = pickStr(get(b,"title"), get(b,"summary"), get(get(b,"conversation"),"title"), get(get(b,"memory"),"title")) || "New Omi memory";
    const text = pickStr(
      get(b,"text"), get(b,"content"), get(b,"transcript"),
      get(get(b,"memory"),"text"), get(get(b,"memory"),"content"),
      get(get(b,"conversation"),"summary")
    );
    const ts = pickStr(get(b,"timestamp"), get(b,"created_at"), get(b,"createdAt"), get(get(b,"memory"),"created_at"), get(get(b,"conversation"),"created_at")) || new Date().toISOString();
    const user = pickStr(get(get(b,"user"),"name"), get(b,"author"), get(get(b,"account"),"name")) || "unknown";
    const audio = pickStr(get(b,"audio_url"), get(get(b,"media"),"audio_url"), get(get(b,"memory"),"audio_url"));
    const link  = pickStr(get(b,"url"), get(b,"deep_link"), get(get(b,"links"),"web"), get(get(b,"conversation"),"url"));

    // Fail-soft: if no text found, show the first 400 chars of raw JSON so Discord isn't blank
    const rawJson = ((): string => { try { return typeof bodyUnknown === "string" ? bodyUnknown : JSON.stringify(bodyUnknown); } catch { return String(bodyUnknown); } })();
    const textFinal = text || (rawJson ? rawJson.slice(0, 400) + (rawJson.length > 400 ? "…" : "") : "(no text)");

    const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 400;
    const bodyText = String(textFinal).slice(0, limit);

    const fields: Array<{name: string; value: string}> = [];
    if (audio) fields.push({ name: "Audio", value: String(audio) });
    // One-time debug to see what Omi sent (remove later if noisy)
    fields.push({ name: "Debug-CT", value: ct });
    fields.push({ name: "Debug-Keys", value: isObj(b) ? Object.keys(b).slice(0, 16).join(", ") : "(not an object)" });

    const discordPayload = {
      content: null,
      embeds: [{
        title: "New Omi Conversation",
        description: [`**${title}**`, `by **${user}** at ${ts}`, "", bodyText + (String(textFinal).length > limit ? "…" : "")].join("\n"),
        url: link || undefined,
        timestamp: new Date().toISOString(),
        footer: { text: `Conversation ID: ${id}` },
        fields
      }]
    };

    const r = await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(discordPayload) });
    if (!r.ok) { const err = await r.text(); console.error("Discord error:", r.status, err); return res.status(502).send("discord_error"); }
    return res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    return res.status(500).send("server_error");
  }
}
