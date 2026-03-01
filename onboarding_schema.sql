-- Migration to support onboarding and extended profile settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS farm_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_tone TEXT DEFAULT 'Professional';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
