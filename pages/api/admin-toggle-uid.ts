import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabase";

/**
 * Admin endpoint to temporarily disable/enable a UID by clearing/restoring webhook_url
 * This forces Omi to use a different UID when multiple are registered
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Guard with an admin header
  const admin = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY || admin !== process.env.ADMIN_API_KEY) {
    return res.status(401).send("unauthorized");
  }

  if (req.method !== "POST") {
    return res.status(405).send("method_not_allowed");
  }

  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  const action = typeof req.query.action === "string" ? req.query.action : ""; // "disable" or "enable"

  if (!uid) return res.status(400).send("missing_uid");
  if (!action || !["disable", "enable"].includes(action)) {
    return res.status(400).send("action must be 'disable' or 'enable'");
  }

  try {
    if (action === "disable") {
      // Get current webhook_url first so we can restore it later
      const { data: current } = await supabaseAdmin
        .from("user_configs")
        .select("webhook_url")
        .eq("uid", uid)
        .single();

      if (!current) {
        return res.status(404).send("uid_not_found");
      }

      // Store webhook_url in options for later restoration
      const { error: updateError } = await supabaseAdmin
        .from("user_configs")
        .update({
          webhook_url: null,
          options: {
            disabled_webhook_backup: current.webhook_url,
          },
        })
        .eq("uid", uid);

      if (updateError) {
        console.error("Error disabling UID:", updateError);
        return res.status(500).send("update_failed");
      }

      return res.status(200).json({
        ok: true,
        action: "disabled",
        uid,
        message: `UID ${uid} temporarily disabled. Webhook URL backed up in options.`,
      });
    } else {
      // Enable: restore webhook_url from options
      const { data: current } = await supabaseAdmin
        .from("user_configs")
        .select("options")
        .eq("uid", uid)
        .single();

      if (!current) {
        return res.status(404).send("uid_not_found");
      }

      const options = current.options as Record<string, any> | null;
      const backupUrl = options?.disabled_webhook_backup;

      if (!backupUrl) {
        return res.status(400).send("no_backup_found");
      }

      const { error: updateError } = await supabaseAdmin
        .from("user_configs")
        .update({
          webhook_url: backupUrl,
          options: null, // Clear the backup
        })
        .eq("uid", uid);

      if (updateError) {
        console.error("Error enabling UID:", updateError);
        return res.status(500).send("update_failed");
      }

      return res.status(200).json({
        ok: true,
        action: "enabled",
        uid,
        message: `UID ${uid} re-enabled. Webhook URL restored.`,
      });
    }
  } catch (error) {
    console.error("Admin toggle error:", error);
    return res.status(500).send("server_error");
  }
}
