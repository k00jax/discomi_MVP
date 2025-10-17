import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { Readable } from "stream";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserConfig } from "../../types";

// ---------- Next config: read raw bytes ourselves ----------
export const config = { api: { bodyParser: false } };
const BUILD_ID = process.env.BUILD_ID || "unknown";

// ---------- ENV ----------
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || "";

// ---------- Branding ----------
const OMI_ICON = process.env.NEXT_PUBLIC_OMI_ICON_URL || "https://i.imgur.com/6WZ1Q8j.png";
const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || "DiscOmi";
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || "https://discomi-mvp-ochre.vercel.app/discomi.png";

// ---------- Category mapping ----------
const CAT_EMOJI: Record<string, string> = { 
  personal: "🧠", 
  work: "💼", 
  meeting: "📅", 
  task: "✅", 
  idea: "💡", 
  default: "🎧" 
};
const CAT_COLOR: Record<string, number> = { 
  personal: 0x6c5ce7, 
  work: 0x0984e3, 
  meeting: 0x00b894, 
  task: 0x55efc4, 
  idea: 0xfdcb6e, 
  default: 0x8e8e93 
};

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

// Discord timestamp helpers
const toUnix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const whenBlock = (iso: string) => {
  const ts = toUnix(iso);
  return `<t:${ts}:f> • <t:${ts}:R>`; // "Oct 16, 1:26 PM • 2m ago"
};
const clamp = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

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
  // If no secret configured, return true (development mode - allows testing without Omi)
  // PRODUCTION: Always set OMI_SIGNING_SECRET to enforce signature verification
  if (!OMI_SIGNING_SECRET) return true;
  
  const header = (req.headers["x-omi-signature"] as string) || "";
  if (!header) return false; // Reject if signature expected but not provided
  
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

  // Extract category
  const category =
    str(asRec(structured)["category"]) ||
    str(asRec(b["conversation"])["category"]) || "default";

  return {
    id,
    title,
    body: bodyText || "(no text)",
    created_at,
    category,
  };
}

function toDiscordPayloadOmi(rawBody: unknown, uid?: string) {
  const { id, title, body, created_at, category } = extractFromOmiMemory(rawBody);

  const cat = (category || "default").toLowerCase();
  const emoji = CAT_EMOJI[cat] || CAT_EMOJI.default;
  const color = CAT_COLOR[cat] || CAT_COLOR.default;

  const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 900;
  const desc = clamp(body, limit);

  const DEBUG = String(process.env.DEBUG || "").toLowerCase() === "true";
  const footerText = `Conversation • ${id}${DEBUG && uid ? ` • uid:${uid}` : ""}`;

  return {
    username: BOT_NAME,
    avatar_url: BOT_AVATAR,
    content: null,
    embeds: [
      {
        title: `${emoji} ${title}`,
        description: desc,
        color,
        timestamp: new Date().toISOString(),
        footer: { text: footerText, icon_url: OMI_ICON },
        fields: [
          { name: "When", value: whenBlock(created_at), inline: true },
        ],
      },
    ],
  };
}

// Helper to extract uid from query, headers, or body (forgiving for store-installed apps)
function pickUidLoose(req: NextApiRequest, body: any): string | undefined {
  // 1) Query string (developer webhook or templated URL)
  const q = (req.query.uid as string | undefined) || (req.query.user_id as string | undefined);
  if (q && String(q).trim()) return String(q).trim();

  // 2) Common headers some platforms set
  const hx = (req.headers["x-omi-user-id"] as string | undefined)
          || (req.headers["x-user-id"] as string | undefined);
  if (hx && String(hx).trim()) return String(hx).trim();

  // 3) Body paths we've seen in Omi payloads (comprehensive search)
  const b = asRec(body);
  const candidates: unknown[] = [
    b["uid"],
    b["user_id"],
    b["userId"],
    asRec(b["user"])["id"],
    asRec(b["account"])["id"],
    asRec(b["owner"])["id"],
    asRec(b["creator"])["id"],
    asRec(asRec(b["external_data"])["user"])["id"],
    asRec(b["conversation"])["user_id"],
    asRec(b["structured"])["user_id"],
  ];
  
  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  
  return undefined;
}

// ---------- Handler ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Advertise accepted methods; allow health checks
  res.setHeader("Allow", "POST, GET, HEAD, OPTIONS");
  if (req.method === "GET")  return res.status(200).send("ok");
  if (req.method === "HEAD") return res.status(200).end();
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")  return res.status(405).send("method_not_allowed");

  try {
    // ========== APP-LEVEL TOKEN GATE ==========
    // Prevents replay attacks and ensures only Omi (with the token) can call this endpoint
    const requireApp = String(process.env.REQUIRE_APP_TOKEN || "false").toLowerCase() === "true";
    const appParam = (req.query.app as string) || "";
    const appEnv = process.env.APP_WEBHOOK_TOKEN || "";

    if (requireApp) {
      // Strict mode: app token is mandatory
      if (!appEnv || appParam !== appEnv) {
        return res.status(401).send("unauthorized");
      }
    } else {
      // Soft mode: if app token is provided, validate it (helps catch typos during setup)
      if (appParam && appEnv && appParam !== appEnv) {
        return res.status(401).send("unauthorized");
      }
    }
    // ==========================================

    // Read raw bytes no matter the content-type
    const raw = await readRawBody(req);
    const ct  = String(req.headers["content-type"] || "");

    // Parse body early so we can extract uid from it if needed
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
      const m = raw.match(/\{[\s\S]*\}/);
      bodyUnknown = m ? safeJsonParse(m[0]) : raw;
    } else if (ct.includes("text/plain")) {
      bodyUnknown = safeJsonParse(raw);
    } else {
      bodyUnknown = safeJsonParse(raw);
    }

    // Multi-tenant safeguards: require uid from query, headers, or body
    let uid = pickUidLoose(req, bodyUnknown);
    
    // ⚠️ Test-only fallback: if no UID found and exactly one user exists, use it
    // This helps with store-installed apps where Omi might not append uid
    if (!uid) {
      try {
        const { data: rows, error } = await supabaseAdmin
          .from("user_configs")
          .select("uid");
        
        if (!error && rows && rows.length === 1) {
          uid = rows[0].uid;
          console.log("[DiscOmi] Single-user fallback: using uid", uid);
        }
      } catch (fallbackErr) {
        console.error("[DiscOmi] Fallback error:", fallbackErr);
      }
    }
    
    if (!uid) return res.status(400).send("missing_uid");

    // Verify Omi signature (uses OMI_SIGNING_SECRET and x-omi-signature header)
    const signed = verifySignature(req, raw);

    // Look up per-user config from Supabase
    const { data: cfg, error } = await supabaseAdmin
      .from("user_configs")
      .select("webhook_url, token, options")
      .eq("uid", uid)
      .single<UserConfig>();

    if (error) return res.status(500).send("db_error");
    if (!cfg) return res.status(403).send("setup_required");

    // If NOT an Omi-signed request, enforce per-user token for manual tests
    if (!signed) {
      if (String(req.query.token || "") !== cfg.token) {
        return res.status(401).send("unauthorized");
      }
    }
    if (!cfg.webhook_url) return res.status(500).send("missing_webhook");

    // Log build and parsed keys for debugging
    console.log("[DiscOmi] build", BUILD_ID, "keys:", typeof bodyUnknown === "object" && bodyUnknown ? Object.keys(bodyUnknown as UnknownRec) : "(not object)");

    // Build Discord payload with uid
    const discordPayload = toDiscordPayloadOmi(bodyUnknown, uid);

    // Debug flag: add extra fields only when DEBUG=true
    const DEBUG = String(process.env.DEBUG || "").toLowerCase() === "true";
    if (DEBUG) {
      (discordPayload.embeds[0].fields ||= []).push(
        { name: "Debug-Build", value: BUILD_ID, inline: true },
        { name: "Debug-Extractor", value: "toDiscordPayloadOmi", inline: true }
      );

      // Additional debug for structured payload
      const b = asRec(bodyUnknown);
      const hasStructured = Object.prototype.hasOwnProperty.call(b, "structured");
      const keys = Object.keys(b).slice(0, 20).join(", ");

      (discordPayload.embeds[0].fields ||= []).push(
        { name: "Debug-Keys", value: keys || "(no keys)", inline: true },
        { name: "Debug-structured?", value: String(hasStructured), inline: true }
      );
    }

    // Post to user's Discord webhook
    const r = await fetch(cfg.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Discord error:", r.status, err);
      return res.status(502).send("discord_error");
    }
    
    // Return build stamp only when debugging
    return res.status(200).send(DEBUG ? `ok:${BUILD_ID}` : "ok");
  } catch (e) {
    console.error(e);
    return res.status(500).send("server_error");
  }
}
