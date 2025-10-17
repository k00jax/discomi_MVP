import type { NextApiRequest, NextApiResponse } from "next";
import { findTimedOutSessions, markSessionPosted, cleanupOldSessions } from "./batch-transcripts";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserConfig } from "../../types";

/**
 * Cron job to post timed-out transcript sessions
 * Call this every 30-60 seconds via Vercel Cron or external service
 */

// Simplified Discord posting function
async function postBatchedSession(
  sessionId: string,
  uid: string,
  segments: Array<{ text: string }>,
  firstSegmentAt: string,
  webhookUrl: string
) {
  const combinedText = segments.map((s) => s.text).filter(Boolean).join(" ");
  
  const payload = {
    username: "DiscOmi",
    avatar_url: "https://discomi-mvp-ochre.vercel.app/discomi.png",
    embeds: [
      {
        title: "💬 Batched Transcript",
        description: combinedText.slice(0, 1900),
        color: 0x8e8e93,
        timestamp: new Date().toISOString(),
        footer: {
          text: `Session • ${sessionId}`,
          icon_url: "https://i.imgur.com/6WZ1Q8j.png",
        },
        fields: [
          {
            name: "Started",
            value: `<t:${Math.floor(new Date(firstSegmentAt).getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: "Segments",
            value: String(segments.length),
            inline: true,
          },
        ],
      },
    ],
  };
  
  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  return r.ok;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simple auth via query param or header
  const authToken = req.query.token || req.headers["x-cron-token"];
  const expectedToken = process.env.CRON_TOKEN || "change_me_in_production";
  
  if (authToken !== expectedToken) {
    return res.status(401).send("unauthorized");
  }

  try {
    // Find sessions that timed out
    const timedOutSessions = await findTimedOutSessions();
    console.log(`[Cron] Found ${timedOutSessions.length} timed-out sessions`);

    let posted = 0;
    let failed = 0;

    for (const session of timedOutSessions) {
      try {
        // Get user's webhook URL
        const { data: cfg } = await supabaseAdmin
          .from("user_configs")
          .select("webhook_url")
          .eq("uid", session.uid)
          .single<UserConfig>();

        if (!cfg?.webhook_url) {
          console.error(`[Cron] No webhook for uid ${session.uid}, skipping session ${session.session_id}`);
          failed++;
          continue;
        }

        // Post to Discord
        const success = await postBatchedSession(
          session.session_id,
          session.uid,
          session.segments,
          session.first_segment_at,
          cfg.webhook_url
        );

        if (success) {
          await markSessionPosted(session.session_id);
          console.log(`[Cron] Posted session ${session.session_id}`);
          posted++;
        } else {
          console.error(`[Cron] Failed to post session ${session.session_id}`);
          failed++;
        }
      } catch (error) {
        console.error(`[Cron] Error processing session ${session.session_id}:`, error);
        failed++;
      }
    }

    // Cleanup old sessions
    const cleaned = await cleanupOldSessions();
    console.log(`[Cron] Cleaned up ${cleaned} old sessions`);

    return res.status(200).json({
      ok: true,
      posted,
      failed,
      cleaned,
      message: `Posted ${posted} sessions, ${failed} failed, cleaned ${cleaned} old sessions`,
    });
  } catch (error) {
    console.error("[Cron] Error in cron job:", error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
