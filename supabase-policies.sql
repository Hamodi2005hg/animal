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

-- ==========================================
-- Storage Bucket Policies (animal-images)
-- ==========================================

-- 4. Allow everyone to view images in the bucket
CREATE POLICY "Public access to animal images" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'animal-images');

-- 5. Allow logged-in users to upload images
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'animal-images');
