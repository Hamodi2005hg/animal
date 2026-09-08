-- In order to allow users to fetch other users' profiles (for UserProfile pages)
CREATE POLICY "Public profiles are viewable by everyone." 
ON profiles FOR SELECT 
USING (true);
