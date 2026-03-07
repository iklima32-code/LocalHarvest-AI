-- Add columns to profiles for Facebook Business Page integration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fb_page_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fb_page_access_token TEXT; -- This will be encrypted via Node.js
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fb_page_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fb_connected_at TIMESTAMP WITH TIME ZONE;
