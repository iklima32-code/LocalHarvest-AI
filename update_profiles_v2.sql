-- Add new columns to profiles for expanded onboarding and settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS farm_description TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS brand_voice TEXT DEFAULT 'Friendly & Casual',
ADD COLUMN IF NOT EXISTS emoji_usage TEXT DEFAULT 'Moderate (Recommended)',
ADD COLUMN IF NOT EXISTS default_hashtags TEXT DEFAULT '#FarmFresh, #LocalFood, #OrganicProduce',
ADD COLUMN IF NOT EXISTS auto_location BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_cta BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_email TEXT,
ADD COLUMN IF NOT EXISTS notify_published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_engagement BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_tips BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS farm_logo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
