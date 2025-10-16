import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserConfig } from "../../types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("method_not_allowed");
  const { uid, webhookUrl, options } = req.body || {};
  if (!uid || !webhookUrl) return res.status(400).send("missing_uid_or_webhook");

  const token = "u_" + crypto.randomBytes(24).toString("hex");

  const upsert: UserConfig = {
    uid: String(uid),
    webhook_url: String(webhookUrl),
    token,
    options: {
      includeTranscript: Boolean(options?.includeTranscript ?? true),
      maxChars: Math.min(Number(options?.maxChars ?? 900), 1900),
    },
  };

  const { error } = await supabaseAdmin.from("user_configs").upsert(upsert, { onConflict: "uid" });
  if (error) return res.status(500).send("db_error");

  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
  // Paste this into Omi. Omi will append &uid=<uid>.
  const omiWebhook = `${base}/api/webhook?token=${encodeURIComponent(token)}`;

  res.status(200).json({ ok: true, omiWebhook });
}
