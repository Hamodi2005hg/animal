-- =================================================================
-- Pet & Stray Reddit Database Migration (المجتمعات ونظام الكارما والشارات)
-- =================================================================

-- 1. Add Subreddit, Urgency, Title, Anonymity & Marketplace to animal_sos
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS subreddit text DEFAULT 'r/RescueEmergency';
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'medium'; -- 'critical', 'high', 'medium', 'low'
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS before_after_image_url text; -- For Success Stories before & after
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS marketplace_type text; -- 'food_donation', 'vet_clinic', 'supplies', 'transport', 'other'

-- Index for fast subreddit queries and urgency sorting
CREATE INDEX IF NOT EXISTS idx_animal_sos_subreddit ON animal_sos(subreddit);
CREATE INDEX IF NOT EXISTS idx_animal_sos_urgency ON animal_sos(urgency);
CREATE INDEX IF NOT EXISTS idx_animal_sos_location ON animal_sos(country, region);

-- 2. Add Karma and Rescuer Badges to Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS karma integer DEFAULT 25;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rescue_badge text DEFAULT '🐾 المنقذ المبتدئ';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rescuer_role text DEFAULT 'member'; -- 'rescuer', 'vet', 'donor'

-- 3. Add Anonymity toggle to Comments as well
ALTER TABLE sos_comments ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;

-- Confirming migration completion
COMMENT ON TABLE animal_sos IS 'Stray and Pet Reddit Platform with subreddits and location radar';
