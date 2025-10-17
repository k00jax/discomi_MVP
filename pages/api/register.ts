import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserConfig } from "../../types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("method_not_allowed");

  // uid priority: query, body
  const uidQ = typeof req.query.uid === "string" ? req.query.uid : "";
  const uidB = typeof req.body?.uid === "string" ? req.body.uid : "";
  const uid = uidQ || uidB || "";
  const webhookUrl = String(req.body?.webhookUrl || "");

  if (!uid) return res.status(400).send("missing_uid");
  if (!/^https:\/\/discord\.com\/api\/webhooks\//.test(webhookUrl)) {
    return res.status(400).send("invalid_webhook_url");
  }

  // Generate per-user token for fallback/manual tests
  const token = "u_" + crypto.randomBytes(24).toString("hex");

  // Add default DiscOmi term if user doesn't provide custom entities
  let customEntities = req.body?.custom_entities;
  if (!customEntities || !customEntities.important_terms || customEntities.important_terms.length === 0) {
    customEntities = { important_terms: ["DiscOmi"] };
  } else if (!customEntities.important_terms.includes("DiscOmi")) {
    // Add DiscOmi to user's list if not already there
    customEntities.important_terms = [...customEntities.important_terms, "DiscOmi"];
  }

  const upsert: UserConfig = {
    uid: String(uid),
    webhook_url: String(webhookUrl),
    token,
    custom_entities: customEntities,
    options: {
      includeTranscript: Boolean(req.body?.options?.includeTranscript ?? true),
      maxChars: Math.min(Number(req.body?.options?.maxChars ?? 900), 1900),
      storeKeyword: req.body?.options?.storeKeyword || undefined,
      startKeyword: req.body?.options?.startKeyword || undefined,
    },
  };

  const { data, error } = await supabaseAdmin
    .from("user_configs")
    .upsert<UserConfig>(upsert, { onConflict: "uid" })
    .select("webhook_url, token")
    .single();

  if (error) return res.status(500).send("db_error");

  // Return the ready-to-use webhook URL with app token
  const appToken = process.env.APP_WEBHOOK_TOKEN || "";
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host;
  const base = new URL(`${protocol}://${host}/api/webhook`);
  
  if (appToken) base.searchParams.set("app", appToken);
  base.searchParams.set("uid", uid);

  res.status(200).json({ 
    ok: true, 
    omiWebhook: base.toString(), 
    token: data?.token 
  });
}
