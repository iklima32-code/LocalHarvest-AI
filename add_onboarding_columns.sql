-- Add missing columns to the profiles table to support onboarding data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS farm_type TEXT DEFAULT 'Organic Vegetable Farm',
ADD COLUMN IF NOT EXISTS farm_description TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
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
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS farm_logo_url TEXT;
