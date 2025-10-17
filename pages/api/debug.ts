import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log all incoming requests to help diagnose app store integration
  console.log("[DiscOmi Debug Endpoint]");
  console.log("Query params:", JSON.stringify(req.query));
  console.log("Headers:", JSON.stringify({
    "x-omi-user-id": req.headers["x-omi-user-id"],
    "x-user-id": req.headers["x-user-id"],
    "user-agent": req.headers["user-agent"],
  }));

  // List all registered users
  const { data: users, error } = await supabaseAdmin
    .from("user_configs")
    .select("uid, webhook_url, updated_at");

  return res.status(200).json({
    message: "Debug endpoint",
    queryParams: req.query,
    headers: {
      "x-omi-user-id": req.headers["x-omi-user-id"],
      "x-user-id": req.headers["x-user-id"],
    },
    registeredUsers: users?.map(u => ({
      uid: u.uid,
      hasWebhook: !!u.webhook_url,
      updatedAt: u.updated_at,
    })),
    error: error?.message,
  });
}
