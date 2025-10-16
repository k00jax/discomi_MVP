import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const a = process.env.ADMIN_API_KEY || "";
  const sUrl = process.env.SUPABASE_URL || "";
  const sRole = process.env.SUPABASE_SERVICE_ROLE || "";
  const useS = String(process.env.USE_SUPABASE || "");

  res.status(200).json({
    has_ADMIN_API_KEY: Boolean(a),
    ADMIN_API_KEY_len: a.length, // length only, no value
    has_SUPABASE_URL: Boolean(sUrl),
    has_SUPABASE_SERVICE_ROLE: Boolean(sRole),
    USE_SUPABASE: useS,
    build: process.env.BUILD_ID || "unknown",
  });
}
