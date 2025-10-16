import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    build: process.env.BUILD_ID || "unknown",
    file: __filename,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
  });
}
