import { supabase } from './src/lib/supabase';

async function verifyTables() {
    console.log('Verifying tables in Supabase...');

    // Check 'posts' table
    const { error: postsError } = await supabase.from('posts').select('count', { count: 'exact', head: true });
    if (postsError) {
        console.error('Error checking posts table:', postsError.message);
    } else {
        console.log('✅ Posts table exists and is accessible.');
    }

    // Check 'profiles' table
    const { error: profilesError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (profilesError) {
        console.error('Error checking profiles table:', profilesError.message);
    } else {
        console.log('✅ Profiles table exists and is accessible.');
    }
}

verifyTables();
