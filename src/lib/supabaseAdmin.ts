import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client.
 * Uses the service_role key to bypass Row Level Security (RLS).
 * 
 * IMPORTANT: Only use this in server-side API routes (src/app/api/...).
 * Never expose the service_role key to the client/browser.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceRoleKey) {
    console.warn(
        '⚠️  SUPABASE_SERVICE_ROLE_KEY is not set. Server-side database operations will fail. ' +
        'Add it to your .env file from Supabase Dashboard > Settings > API.'
    );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
