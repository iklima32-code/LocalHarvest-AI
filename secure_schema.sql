-- This script sets up symmetric encryption for the access tokens using Supabase's built-in pgsodium extension.

-- 1. Ensure the pgsodium extension is enabled (Supabase enables this by default, but safe to check)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. We use 'pgsodium.crypto_aead_det_encrypt' to encrypt tokens. To do so, we need an encryption key.
-- Supabase handles key management internally, but we must use a Key ID.
-- We will create a secure trigger to automatically encrypt the token whenever a user updates it.

-- Create a generic encryption/decryption key in the pgsodium.key table if you haven't already:
-- Note: In a production Supabase instance, it's safer to just let the application layer (Next.js backend) encrypt/decrypt the token before saving it to the DB using a secret in your .env file.
