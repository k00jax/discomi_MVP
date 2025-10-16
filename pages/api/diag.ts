import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserConfig } from "../../types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Guard with an admin header so we don't leak config
  const admin = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY || admin !== process.env.ADMIN_API_KEY) {
    return res.status(401).send("unauthorized");
  }
  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  if (!uid) return res.status(400).send("missing_uid");

  const USE_SUPABASE = String(process.env.USE_SUPABASE || "true").toLowerCase() === "true";

  let row: UserConfig | null = null;
  let err: string | null = null;
  
  if (USE_SUPABASE) {
    const r = await supabaseAdmin
      .from("user_configs")
      .select("uid, token, webhook_url, updated_at")
      .eq("uid", uid)
      .single<UserConfig>();
    row = r.data;
    err = r.error?.message || null;
  }

  return res.status(200).json({
    ok: true,
    USE_SUPABASE,
    hasRow: Boolean(row),
    row: row
      ? {
          uid: row.uid,
          tokenPrefix: row.token?.slice(0, 12) + "…",
          webhookUrl: row.webhook_url,
        }
      : null,
    error: err,
    expectedQueryExample: row
      ? `/api/webhook?token=${encodeURIComponent(row.token)}&uid=${encodeURIComponent(uid)}`
      : null,
  });
}
