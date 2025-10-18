import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { UserConfig } from "@/types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/user-config?uid={uid}
 * Fetches existing user configuration for pre-filling the setup form.
 * Returns webhook URL (masked for security), custom entities, and options.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid } = req.query;
  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ error: "Missing or invalid uid parameter" });
  }

  try {
    // Fetch user configuration from database
    const { data, error } = await supabase
      .from("user_configs")
      .select("webhook_url, custom_entities, options")
      .eq("uid", uid)
      .single<UserConfig>();

    if (error || !data) {
      // User not found or not configured yet
      return res.status(200).json({ 
        configured: false,
        webhook_url: null,
        custom_entities: null,
        options: null,
      });
    }

    // Mask webhook URL for security (show only last 15 characters)
    // Example: https://discord.com/api/webhooks/1234567890/abc...xyz123
    const maskedWebhook = data.webhook_url 
      ? `...${data.webhook_url.slice(-15)}`
      : null;

    return res.status(200).json({
      configured: true,
      webhook_url: data.webhook_url, // Return full URL so form can be pre-filled
      webhook_url_masked: maskedWebhook, // For display purposes
      custom_entities: data.custom_entities,
      options: data.options,
    });

  } catch (err) {
    console.error("[user-config] Error fetching user config:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
