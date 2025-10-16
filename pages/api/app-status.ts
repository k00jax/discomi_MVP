import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Diagnostic endpoint for app token configuration
 * Protected by ADMIN_API_KEY via x-admin-key header
 * 
 * Returns:
 * - requireApp: whether REQUIRE_APP_TOKEN is true
 * - hasAppEnv: whether APP_WEBHOOK_TOKEN is set
 * - appEnvLength: length of APP_WEBHOOK_TOKEN (if set)
 * - appParamMatch: whether ?app=... matches APP_WEBHOOK_TOKEN
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check admin key
  const adminKey = req.headers["x-admin-key"] as string;
  const adminEnv = process.env.ADMIN_API_KEY || "";
  
  if (!adminKey || adminKey !== adminEnv) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // Get app token config
  const requireApp = String(process.env.REQUIRE_APP_TOKEN || "false").toLowerCase() === "true";
  const appEnv = process.env.APP_WEBHOOK_TOKEN || "";
  const appParam = (req.query.app as string) || "";
  
  const hasAppEnv = !!appEnv;
  const appEnvLength = appEnv.length;
  const appParamProvided = !!appParam;
  const appParamLength = appParam.length;
  const appParamMatch = appParam && appEnv && appParam === appEnv;

  return res.status(200).json({
    ok: true,
    config: {
      requireApp,
      hasAppEnv,
      appEnvLength: hasAppEnv ? appEnvLength : null,
      appEnvPrefix: hasAppEnv ? appEnv.substring(0, 10) + "..." : null,
    },
    request: {
      appParamProvided,
      appParamLength: appParamProvided ? appParamLength : null,
      appParamPrefix: appParamProvided ? appParam.substring(0, 10) + "..." : null,
      appParamMatch,
    },
    interpretation: {
      willAccept: requireApp ? appParamMatch : (appParamProvided ? appParamMatch : true),
      reason: requireApp 
        ? (appParamMatch ? "Valid app token (strict mode)" : "Invalid/missing app token (strict mode)")
        : (appParamProvided 
            ? (appParamMatch ? "Valid app token (soft mode)" : "Invalid app token (soft mode)")
            : "No app token (soft mode allows this)"
          )
    },
    nextSteps: requireApp 
      ? ["App token is required", "Ensure Omi webhook URL includes ?app=..."]
      : ["App token is optional", "Set REQUIRE_APP_TOKEN=true when ready", "Then redeploy"]
  });
}
