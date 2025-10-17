-- Add custom_entities column to user_configs table
-- This allows users to define name corrections and entity mappings

ALTER TABLE user_configs 
ADD COLUMN IF NOT EXISTS custom_entities JSONB DEFAULT '{}'::jsonb;

-- Example structure:
-- {
--   "names": {
--     "caitlyn": "Kaitlin",
--     "katelyn": "Kaitlin",
--     "kate": "Kaitlin"
--   },
--   "companies": {
--     "discomi": "DiscOmi"
--   },
--   "places": {
--     "san fran": "San Francisco"
--   }
-- }

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_configs_custom_entities 
  ON user_configs USING GIN (custom_entities);

-- Add comment
COMMENT ON COLUMN user_configs.custom_entities IS 'User-defined entity mappings for correcting misheard names and terms in transcripts';
