ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_page_access_token TEXT;
