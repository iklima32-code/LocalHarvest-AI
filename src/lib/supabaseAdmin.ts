import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client.
 * Uses the service_role key to bypass Row Level Security (RLS).
 *
 * IMPORTANT: Only use this in server-side API routes (src/app/api/...).
 * Never expose the service_role key to the client/browser.
 *
 * Initialized lazily on first use so that a missing SUPABASE_SERVICE_ROLE_KEY
 * does not throw at module evaluation time during next build.
 */

let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (!_adminClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            throw new Error(
                'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
                'Add it to your .env file from Supabase Dashboard > Settings > API.'
            );
        }

        _adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return _adminClient;
}
