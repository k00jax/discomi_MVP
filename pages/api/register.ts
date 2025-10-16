import type { NextApiRequest, NextApiResponse } from "next";
import { kv } from "@vercel/kv";
import crypto from "crypto";
import type { UserConfig } from "../../types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("method_not_allowed");
  const { uid, webhookUrl, options } = req.body || {};
  if (!uid || !webhookUrl) return res.status(400).send("missing_uid_or_webhook");

  // idempotent: keep existing token if already registered
  const key = `user:${uid}`;
  const existing = await kv.get<UserConfig>(key);
  const token = existing?.token || `u_${crypto.randomBytes(24).toString("hex")}`;

  const cfg: UserConfig = {
    webhookUrl: String(webhookUrl),
    token,
    options: {
      includeTranscript: Boolean(options?.includeTranscript ?? true),
      includeAudio: Boolean(options?.includeAudio ?? true),
      maxChars: Math.min(Number(options?.maxChars ?? 900), 1900)
    }
  };

  await kv.set(key, cfg);

  // The Omi app will append &uid=<uid> automatically
  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const omiWebhook = `${base}/api/webhook?token=${encodeURIComponent(token)}`;

  res.status(200).json({ ok: true, omiWebhook });
}
