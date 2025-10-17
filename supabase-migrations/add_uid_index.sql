-- Add index for faster user-specific queries
-- This improves performance when finding active sessions per user
CREATE INDEX IF NOT EXISTS idx_sessions_by_uid 
  ON transcript_sessions(uid, posted, last_segment_at DESC);

-- Optional: Add RLS for extra security (if you ever expose to client-side)
-- ALTER TABLE transcript_sessions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can only see their own sessions"
--   ON transcript_sessions
--   FOR SELECT
--   USING (uid = auth.uid()::text);

-- CREATE POLICY "Users can only insert their own sessions"
--   ON transcript_sessions
--   FOR INSERT
--   WITH CHECK (uid = auth.uid()::text);

-- CREATE POLICY "Users can only update their own sessions"
--   ON transcript_sessions
--   FOR UPDATE
--   USING (uid = auth.uid()::text);
