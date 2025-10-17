import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Simple endpoint to verify batching feature is deployed
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const BATCH_TRANSCRIPTS = String(process.env.TRANSCRIPT_BATCH_ENABLED || "true").toLowerCase() === "true";
  const BATCH_TIMEOUT = process.env.TRANSCRIPT_BATCH_TIMEOUT || "30";
  const STORE_KEYWORDS = process.env.TRANSCRIPT_STORE_KEYWORDS || "store memory,save this,remember this";
  const HAS_CRON_TOKEN = Boolean(process.env.CRON_TOKEN);

  return res.status(200).json({
    feature: "batched-transcripts",
    deployed: true,
    config: {
      BATCH_TRANSCRIPTS,
      BATCH_TIMEOUT,
      STORE_KEYWORDS,
      HAS_CRON_TOKEN,
    },
    timestamp: new Date().toISOString(),
  });
}
