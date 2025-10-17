import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabase";

/**
 * Batch transcript segments by session_id
 * Store segments until timeout or manual trigger, then post complete message
 */

const BATCH_TIMEOUT_SECONDS = parseInt(process.env.TRANSCRIPT_BATCH_TIMEOUT || "30");
const STORE_KEYWORDS = (process.env.TRANSCRIPT_STORE_KEYWORDS || "store memory,save this,remember this")
  .toLowerCase()
  .split(",")
  .map((k) => k.trim());

interface TranscriptSegment {
  text: string;
  timestamp?: string;
  speaker?: string;
  [key: string]: unknown;
}

interface TranscriptSession {
  session_id: string;
  uid: string;
  segments: TranscriptSegment[];
  first_segment_at: string;
  last_segment_at: string;
  posted: boolean;
}

/**
 * Find or create an active session for a user
 * Returns the most recent unposted session, or creates a new one
 * Automatically creates new session if last activity was > SESSION_IDLE_TIMEOUT ago
 */
export async function findOrCreateActiveSession(uid: string): Promise<string> {
  // Session idle timeout: create new session if no activity for this long (default 1 hour)
  const SESSION_IDLE_TIMEOUT_MINUTES = parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || "60");
  const idleThreshold = new Date(Date.now() - SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000).toISOString();
  
  // Look for most recent unposted session for this user
  const { data: existing } = await supabaseAdmin
    .from("transcript_sessions")
    .select("session_id, last_segment_at")
    .eq("uid", uid)
    .eq("posted", false)
    .order("last_segment_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // If existing session and recent activity, reuse it
  if (existing && existing.last_segment_at > idleThreshold) {
    console.log(`[Batching] Reusing active session ${existing.session_id}`);
    return existing.session_id;
  }
  
  // If existing session is too old, mark it as abandoned and create new one
  if (existing && existing.last_segment_at <= idleThreshold) {
    console.log(`[Batching] Session ${existing.session_id} idle for >${SESSION_IDLE_TIMEOUT_MINUTES}min, creating new session`);
    // Mark old session as posted (abandoned) so it doesn't accumulate forever
    await supabaseAdmin
      .from("transcript_sessions")
      .update({ posted: true, posted_at: new Date().toISOString() })
      .eq("session_id", existing.session_id);
  }

  // Create new session ID: uid + timestamp
  const sessionId = `${uid}_${Date.now()}`;
  console.log(`[Batching] Created new session ${sessionId}`);
  return sessionId;
}

/**
 * Add a segment to a session (creates session if needed)
 */
export async function addSegmentToSession(
  sessionId: string,
  uid: string,
  segment: TranscriptSegment
): Promise<{ shouldPost: boolean; session: TranscriptSession | null }> {
  try {
    // Check if session exists
    const { data: existing } = await supabaseAdmin
      .from("transcript_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("posted", false)
      .single<TranscriptSession>();

    const segmentText = segment.text?.toLowerCase() || "";
    const hasStoreKeyword = STORE_KEYWORDS.some((keyword) => segmentText.includes(keyword));

    if (existing) {
      // Check segment count limit (prevent runaway sessions)
      const MAX_SEGMENTS = parseInt(process.env.MAX_SEGMENTS_PER_SESSION || "200");
      
      if (existing.segments.length >= MAX_SEGMENTS) {
        console.warn(`[Batching] Session ${sessionId} hit max segments (${MAX_SEGMENTS}), auto-posting`);
        // Auto-post when hitting limit
        return { shouldPost: true, session: existing };
      }
      
      // Append segment to existing session
      const updatedSegments = [...existing.segments, segment];
      
      const { data: updated, error } = await supabaseAdmin
        .from("transcript_sessions")
        .update({
          segments: updatedSegments,
          last_segment_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .select()
        .single<TranscriptSession>();

      if (error) {
        console.error("[Batching] Error updating session:", error);
        return { shouldPost: false, session: null };
      }

      // If user said a store keyword, post immediately
      if (hasStoreKeyword) {
        console.log(`[Batching] Detected keyword in segment, posting session ${sessionId}`);
        return { shouldPost: true, session: updated };
      }

      return { shouldPost: false, session: updated };
    } else {
      // Create new session
      const { data: newSession, error } = await supabaseAdmin
        .from("transcript_sessions")
        .insert({
          session_id: sessionId,
          uid,
          segments: [segment],
          first_segment_at: new Date().toISOString(),
          last_segment_at: new Date().toISOString(),
        })
        .select()
        .single<TranscriptSession>();

      if (error) {
        console.error("[Batching] Error creating session:", error);
        return { shouldPost: false, session: null };
      }

      // If first segment has store keyword, post immediately
      if (hasStoreKeyword) {
        console.log(`[Batching] Detected keyword in first segment, posting session ${sessionId}`);
        return { shouldPost: true, session: newSession };
      }

      return { shouldPost: false, session: newSession };
    }
  } catch (error) {
    console.error("[Batching] Error in addSegmentToSession:", error);
    return { shouldPost: false, session: null };
  }
}

/**
 * Mark session as posted
 */
export async function markSessionPosted(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("transcript_sessions")
    .update({
      posted: true,
      posted_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);
}

/**
 * Find sessions that timed out and should be posted
 */
export async function findTimedOutSessions(): Promise<TranscriptSession[]> {
  const timeoutThreshold = new Date(Date.now() - BATCH_TIMEOUT_SECONDS * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("transcript_sessions")
    .select("*")
    .eq("posted", false)
    .lt("last_segment_at", timeoutThreshold);

  if (error) {
    console.error("[Batching] Error finding timed out sessions:", error);
    return [];
  }

  return (data || []) as TranscriptSession[];
}

/**
 * Cleanup old posted sessions (older than 24 hours)
 */
export async function cleanupOldSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabaseAdmin
    .from("transcript_sessions")
    .delete()
    .eq("posted", true)
    .lt("created_at", cutoff);

  if (error) {
    console.error("[Batching] Error cleaning up old sessions:", error);
    return 0;
  }

  return count || 0;
}

/**
 * API endpoint to manually trigger posting for a session
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get session status
    const sessionId = req.query.session_id as string;
    if (!sessionId) return res.status(400).send("missing_session_id");

    const { data, error } = await supabaseAdmin
      .from("transcript_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error) return res.status(404).send("session_not_found");
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    // Manually flush a session (for testing)
    const sessionId = req.query.session_id as string;
    if (!sessionId) return res.status(400).send("missing_session_id");

    const { data: session, error } = await supabaseAdmin
      .from("transcript_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("posted", false)
      .single<TranscriptSession>();

    if (error || !session) {
      return res.status(404).send("session_not_found_or_already_posted");
    }

    // Return session data for webhook to post
    return res.status(200).json({
      ok: true,
      session,
      message: "Session ready to post. Call webhook with this session data.",
    });
  }

  return res.status(405).send("method_not_allowed");
}
