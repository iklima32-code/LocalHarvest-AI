-- 1. Create the AI Samples and Profiles storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ai-samples', 'ai-samples', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. ENABLE RLS on storage.objects (just in case)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow users to upload their own AI samples
CREATE POLICY "Users can upload their own AI samples"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ai-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Policy: Allow users to view ONLY their own AI samples
CREATE POLICY "Users can view their own AI samples"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ai-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Policy: Allow users to delete their own AI samples
CREATE POLICY "Users can delete their own AI samples"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ai-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Keep profiles bucket for public-facing assets (like profile photos/logos)
-- but ensure only owner can manage them
CREATE POLICY "Users can manage their own profile assets"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 7. Add Writing and Voice sample columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS writing_sample_1 TEXT,
ADD COLUMN IF NOT EXISTS writing_sample_2 TEXT,
ADD COLUMN IF NOT EXISTS writing_sample_3 TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_1_url TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_2_url TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_3_url TEXT;

-- NOTE: The profiles table already has RLS:
-- CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- This already ensures writing_sample columns are private to the user.
