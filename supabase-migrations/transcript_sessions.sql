-- Create table for batching transcript segments
CREATE TABLE IF NOT EXISTS transcript_sessions (
  session_id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_segment_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_segment_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted BOOLEAN NOT NULL DEFAULT FALSE,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding stale sessions to post
CREATE INDEX IF NOT EXISTS idx_sessions_to_post 
  ON transcript_sessions(posted, last_segment_at) 
  WHERE posted = FALSE;

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_old 
  ON transcript_sessions(created_at) 
  WHERE posted = TRUE;
