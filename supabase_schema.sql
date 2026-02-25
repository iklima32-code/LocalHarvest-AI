-- Create a profiles table for extra user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  farm_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a posts table for content
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  hashtags TEXT,
  template_type TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Set up policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own posts" ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);

-- TRIGGER: Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, farm_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'My Farm');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage Policies
INSERT INTO storage.buckets (id, name, public) VALUES ('harvest-photos', 'harvest-photos', true);
CREATE POLICY "Public view access" ON storage.objects FOR SELECT USING (bucket_id = 'harvest-photos');
CREATE POLICY "Upload access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'harvest-photos');

-- Update Storage Policies for user restriction
CREATE POLICY "Users can view own photos" ON storage.objects FOR SELECT USING (bucket_id = 'harvest-photos' AND auth.uid() = owner);
CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'harvest-photos' AND auth.uid() = owner);

-- Update Storage Policies using correct owner property
CREATE POLICY "Users can view own photos v2" ON storage.objects FOR SELECT USING (bucket_id = 'harvest-photos' AND auth.uid()::text = owner);
CREATE POLICY "Users can upload own photos v2" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'harvest-photos' AND auth.uid()::text = owner);

-- Update Storage Policies using correct owner property
CREATE POLICY "Users can view own photos v2" ON storage.objects FOR SELECT USING (bucket_id = 'harvest-photos');
CREATE POLICY "Users can upload own photos v2" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'harvest-photos');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'harvest-photos');
