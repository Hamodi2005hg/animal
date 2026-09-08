-- ==========================================
-- Supabase Security Policies (RLS) Setup
-- ==========================================

-- 1. Enable Row Level Security on the table
ALTER TABLE animal_sos ENABLE ROW LEVEL SECURITY;

-- 2. Allow everyone to view (SELECT) the SOS posts
CREATE POLICY "Enable read access for all users" 
ON animal_sos FOR SELECT 
TO public 
USING (true);

-- 3. Allow logged-in users to create (INSERT) SOS posts
CREATE POLICY "Enable insert for authenticated users" 
ON animal_sos FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Allow users to update their OWN posts (changing status to resolved)
CREATE POLICY "Users can update their own posts" 
ON animal_sos FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- Animal Type Update
-- ==========================================
-- Add animal_type column if it doesn't exist yet
ALTER TABLE animal_sos ADD COLUMN IF NOT EXISTS animal_type text;

-- ==========================================
-- Voting System Tables & Policies
-- ==========================================
CREATE TABLE IF NOT EXISTS sos_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sos_id uuid REFERENCES animal_sos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_value integer NOT NULL,
  UNIQUE(sos_id, user_id)
);

ALTER TABLE sos_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all votes" ON sos_votes FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert their own vote" ON sos_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vote" ON sos_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- Commenting System Tables & Policies
-- ==========================================
CREATE TABLE IF NOT EXISTS sos_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sos_id uuid REFERENCES animal_sos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES sos_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE sos_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all comments" ON sos_comments FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert comments" ON sos_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- Storage Bucket Policies (animal-images)
-- ==========================================

-- 5. Allow everyone to view images in the bucket
CREATE POLICY "Public access to animal images" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'animal-images');

-- 6. Allow logged-in users to upload images
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'animal-images');
