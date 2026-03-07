ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;   -- AES-256-GCM encrypted
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_person_urn TEXT;      -- e.g. "urn:li:person:abc123"
