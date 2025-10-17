import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { Readable } from "stream";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserConfig } from "../../types";
import { addSegmentToSession, markSessionPosted } from "./batch-transcripts";
import { processTranscript } from "../../lib/ai-processor";

// ---------- Next config: read raw bytes ourselves ----------
export const config = { api: { bodyParser: false } };
const BUILD_ID = process.env.BUILD_ID || "batched-v1";

// ---------- ENV ----------
const OMI_SIGNING_SECRET = process.env.OMI_SIGNING_SECRET || "";
const BATCH_TRANSCRIPTS = String(process.env.TRANSCRIPT_BATCH_ENABLED || "true").toLowerCase() === "true";

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
  brainstorm: "🌟",
  note: "📝",
  other: "💬",
  default: "🎧" 
};
const CAT_COLOR: Record<string, number> = { 
  personal: 0x6c5ce7, 
  work: 0x0984e3, 
  meeting: 0x00b894, 
  task: 0x55efc4, 
  idea: 0xfdcb6e,
  brainstorm: 0xe17055,
  note: 0x74b9ff,
  other: 0x636e72,
  default: 0x8e8e93 
};

// Helper functions for AI categories
const getEmojiForCategory = (cat: string) => CAT_EMOJI[cat.toLowerCase()] || CAT_EMOJI.default;
const getColorForCategory = (cat: string) => CAT_COLOR[cat.toLowerCase()] || CAT_COLOR.default;

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

  // Detect if this is "Transcript Processed" format (real-time) vs "Conversation Creation" (complete memory)
  const isTranscriptProcessed = b["session_id"] && Array.isArray(b["segments"]);

  if (isTranscriptProcessed) {
    // Handle "Transcript Processed" payload: { session_id, segments: [{ text, speaker, ... }] }
    const sessionId = str(b["session_id"]) || "unknown";
    const segments = (Array.isArray(b["segments"]) ? b["segments"] : []).map((x) => asRec(x) as Seg);
    
    const bodyText = segments
      .map((s) => str(s.text) || "")
      .filter(Boolean)
      .join(" ");

    return {
      id: sessionId,
      title: "🎙️ Live Transcript",
      body: bodyText || "(recording in progress...)",
      created_at: new Date().toISOString(),
      category: "default",
      isRealtime: true,
    };
  }

  // Handle "Conversation Creation" payload (full memory object)
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
    isRealtime: false,
  };
}

function toDiscordPayloadOmi(rawBody: unknown, uid?: string) {
  const { id, title, body, created_at, category, isRealtime } = extractFromOmiMemory(rawBody);

  const cat = (category || "default").toLowerCase();
  const emoji = CAT_EMOJI[cat] || CAT_EMOJI.default;
  const color = isRealtime ? 0xf39c12 : (CAT_COLOR[cat] || CAT_COLOR.default); // Orange for realtime

  const limit = process.env.POST_FULL_TEXT === "true" ? 1900 : 900;
  const desc = clamp(body, limit);

  const DEBUG = String(process.env.DEBUG || "").toLowerCase() === "true";
  const footerText = isRealtime 
    ? `Live Transcript • ${id}${DEBUG && uid ? ` • uid:${uid}` : ""}`
    : `Conversation • ${id}${DEBUG && uid ? ` • uid:${uid}` : ""}`;

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
function pickUidLoose(req: NextApiRequest, body: unknown): string | undefined {
  // 1) Query string (developer webhook or templated URL)
  // Handle case where uid appears multiple times (Next.js makes it an array)
  let q = req.query.uid || req.query.user_id;
  if (Array.isArray(q)) {
    console.log("[DiscOmi] WARNING: uid parameter appears multiple times in URL, using first value");
    q = q[0]; // Take first occurrence
  }
  if (q && typeof q === "string" && q.trim()) return q.trim();

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
        console.log("[DiscOmi] No UID found, trying single-user fallback...");
        const { data: rows, error } = await supabaseAdmin
          .from("user_configs")
          .select("uid");
        
        if (error) {
          console.error("[DiscOmi] Fallback query error:", error);
        } else if (!rows || rows.length === 0) {
          console.log("[DiscOmi] Fallback: No users found in database");
        } else if (rows.length > 1) {
          console.log("[DiscOmi] Fallback: Multiple users found, cannot auto-select");
        } else {
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

    if (error) {
      console.error("[DiscOmi] Database error for uid:", uid, "error:", JSON.stringify(error));
      return res.status(500).send("db_error");
    }
    if (!cfg) {
      console.error("[DiscOmi] No config found for uid:", uid);
      return res.status(403).send("setup_required");
    }

    // If NOT an Omi-signed request, enforce per-user token for manual tests
    if (!signed) {
      if (String(req.query.token || "") !== cfg.token) {
        return res.status(401).send("unauthorized");
      }
    }
    if (!cfg.webhook_url) return res.status(500).send("missing_webhook");

    // Log build and parsed keys for debugging
    console.log("[DiscOmi] build", BUILD_ID, "keys:", typeof bodyUnknown === "object" && bodyUnknown ? Object.keys(bodyUnknown as UnknownRec) : "(not object)");
    
    // Debug: Log full payload structure for troubleshooting
    if (process.env.DEBUG === "true") {
      console.log("[DiscOmi] Full payload:", JSON.stringify(bodyUnknown, null, 2));
    }
    
    // Special handling for Transcript Processed: batch segments
    const b = asRec(bodyUnknown);
    const isTranscriptProcessed = b["session_id"] && Array.isArray(b["segments"]);
    
    console.log("[DiscOmi] Batching check - isTranscript:", isTranscriptProcessed, "batchEnabled:", BATCH_TRANSCRIPTS);
    
    if (isTranscriptProcessed && BATCH_TRANSCRIPTS) {
      // Omi sends UID as session_id, which causes duplicates
      // We'll find or create an active session for this user
      const segments = b["segments"] as unknown[];
      
      console.log("[DiscOmi] BATCHING MODE - uid:", uid, "| segments:", segments.length);
      
      try {
        // Find or create active session for this user
        const { findOrCreateActiveSession } = await import("./batch-transcripts");
        let sessionId = await findOrCreateActiveSession(uid);
        
        console.log("[DiscOmi] Using session:", sessionId);
        
        // Get custom keywords from user config
        const storeKeyword = cfg.options?.storeKeyword || "store memory";
        const startKeyword = cfg.options?.startKeyword || "start memory";
        
        // Add each segment to the session
        for (const seg of segments) {
          const segment = asRec(seg);
          const { shouldPost, shouldStartNew, session } = await addSegmentToSession(
            sessionId, 
            uid, 
            {
              text: str(segment.text) || "",
              timestamp: str(segment.timestamp),
              speaker: str(segment.speaker),
            },
            storeKeyword,
            startKeyword
          );
        
          // If "start memory" detected, get new session ID and continue
          if (shouldStartNew) {
            sessionId = await findOrCreateActiveSession(uid);
            console.log("[DiscOmi] Started new session:", sessionId);
            continue;
          }
        
          if (shouldPost && session) {
          console.log(`[DiscOmi] Posting batched session ${sessionId} with ${session.segments.length} total segments`);
          
          // Apply lookback window to prevent posting hours of old conversation
          const LOOKBACK_MINUTES = parseInt(process.env.LOOKBACK_MINUTES || "15");
          const LOOKBACK_SEGMENTS = parseInt(process.env.LOOKBACK_SEGMENTS || "100");
          const lookbackTime = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000).toISOString();
          
          // Filter to recent segments only (within time window OR last N segments, whichever is more restrictive)
          let segmentsToPost = session.segments;
          
          // Time-based filter: only segments from last N minutes
          const recentByTime = session.segments.filter((s) => {
            // Use segment timestamp if available, otherwise use position (newer segments at end)
            const segmentTime = s.timestamp || session.first_segment_at;
            return segmentTime >= lookbackTime;
          });
          
          // Segment count filter: only last N segments
          const recentByCount = session.segments.slice(-LOOKBACK_SEGMENTS);
          
          // Use whichever is MORE restrictive (fewer segments)
          segmentsToPost = recentByTime.length < recentByCount.length ? recentByTime : recentByCount;
          
          // Fallback: if filters removed everything, use last 10 segments minimum
          if (segmentsToPost.length === 0 && session.segments.length > 0) {
            segmentsToPost = session.segments.slice(-10);
            console.log(`[DiscOmi] Lookback filters too restrictive, using last 10 segments`);
          }
          
          console.log(`[DiscOmi] Posting ${segmentsToPost.length} segments (filtered from ${session.segments.length} by ${LOOKBACK_MINUTES}min lookback)`);
          
          // Combine filtered segments into one message
          const combinedText = segmentsToPost
            .map((s) => s.text)
            .filter(Boolean)
            .join(" ");
          
          // AI processing (if enabled)
          const aiEnabled = String(process.env.AI_PROCESSING_ENABLED || "true").toLowerCase() === "true";
          
          // Load custom entities from user config
          const customEntities = cfg.custom_entities || null;
          
          const aiProcessed = aiEnabled ? await processTranscript(combinedText, customEntities) : null;
          
          // Build Discord payload with AI enhancements or fallback to raw
          let discordPayload;
          
          if (aiProcessed) {
            // Use AI-processed data for rich embed
            const emoji = getEmojiForCategory(aiProcessed.category);
            const color = getColorForCategory(aiProcessed.category);
            
            const fields: Array<{name: string; value: string; inline?: boolean}> = [
              { name: "📅 When", value: whenBlock(session.first_segment_at), inline: true },
              { name: "🏷️ Category", value: aiProcessed.category, inline: true },
            ];
            
            // Add tasks if any
            if (aiProcessed.tasks && aiProcessed.tasks.length > 0) {
              const taskList = aiProcessed.tasks
                .map((t) => {
                  const icon = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
                  return `${icon} ${t.text}`;
                })
                .join("\n");
              fields.push({ name: "📋 Tasks", value: taskList });
            }
            
            // Add ideas if any
            if (aiProcessed.ideas && aiProcessed.ideas.length > 0) {
              const ideaList = aiProcessed.ideas.map((i) => `💡 ${i}`).join("\n");
              fields.push({ name: "✨ Key Ideas", value: ideaList });
            }
            
            // Add entities if any
            if (aiProcessed.key_entities && aiProcessed.key_entities.length > 0) {
              fields.push({ 
                name: "🔖 Mentioned", 
                value: aiProcessed.key_entities.join(", "),
                inline: true 
              });
            }
            
            discordPayload = {
              username: BOT_NAME,
              avatar_url: BOT_AVATAR,
              embeds: [{
                title: `${emoji} ${aiProcessed.category.charAt(0).toUpperCase() + aiProcessed.category.slice(1)} Summary`,
                description: aiProcessed.summary,
                color,
                timestamp: new Date().toISOString(),
                footer: { text: `Session • ${sessionId}`, icon_url: OMI_ICON },
                fields,
              }],
            };
          } else {
            // Fallback to basic batched format (no AI)
            const batchedPayload = {
              id: sessionId,
              created_at: session.first_segment_at,
              structured: {
                title: "💬 Batched Transcript",
                overview: combinedText,
                category: "default",
              },
              transcript_segments: session.segments.map((s) => ({ text: s.text })),
            };
            
            discordPayload = toDiscordPayloadOmi(batchedPayload, uid);
          }
          
          // Post to Discord
          const r = await fetch(cfg.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordPayload),
          });
          
          if (r.ok) {
            await markSessionPosted(sessionId);
            console.log(`[DiscOmi] Successfully posted batched session ${sessionId}`);
          } else {
            const err = await r.text();
            console.error(`[DiscOmi] Discord error for batched session:`, r.status, err);
          }
          
          return res.status(200).send("ok_batched_posted");
        }
      }
      
      // Segment added to batch, but not ready to post yet
      return res.status(200).send("ok_batched");
    } catch (batchError) {
      console.error("[DiscOmi] Batching error:", batchError);
      // Fall through to normal processing if batching fails
    }
    }

    // Build Discord payload with uid (non-batched)
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
