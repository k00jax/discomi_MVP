import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uid = req.query.uid as string | undefined;
  
  if (!uid) {
    return res.status(200).json({ is_setup_completed: false });
  }

  // Check if user has registered their Discord webhook
  const { data: cfg, error } = await supabaseAdmin
    .from("user_configs")
    .select("webhook_url")
    .eq("uid", uid)
    .single();

  const isSetup = !error && cfg && cfg.webhook_url && cfg.webhook_url.trim().length > 0;

  return res.status(200).json({ is_setup_completed: isSetup });
}
