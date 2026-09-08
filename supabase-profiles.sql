-- ==========================================
-- Profile Updates (Username & Avatar)
-- ==========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- ==========================================
-- Notifications System
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'vote', 'comment', 'reply'
  post_id uuid REFERENCES animal_sos(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- Storage Bucket Policies (avatars)
-- ==========================================
-- (Run this in the SQL editor, or manually create the 'avatars' bucket in the UI and set it to Public)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public access to avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
