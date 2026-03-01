-- Add writing and voice sample columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS writing_sample_1 TEXT,
ADD COLUMN IF NOT EXISTS writing_sample_2 TEXT,
ADD COLUMN IF NOT EXISTS writing_sample_3 TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_1_url TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_2_url TEXT,
ADD COLUMN IF NOT EXISTS voice_sample_3_url TEXT;
