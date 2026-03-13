import { supabase } from './supabase';

// Re-export the shared Phase A checker so callers that import from posts.ts
// continue to work without change.
export { containsDisallowedContent, ContentPolicyError, assertContentPolicy } from './content-policy';

export interface Post {
    id?: string;
    user_id: string;
    title: string;
    content: string;
    hashtags: string;
    template_type: string;
    status: 'draft' | 'scheduled' | 'published';
    scheduled_at?: string | null;
    created_at?: string;
    metadata?: {
        imageUrl?: string | null;
        platform?: string;
        produceType?: string;
        quantity?: string;
        unit?: string;
        [key: string]: unknown;
    } | null;
}

export interface DashboardStats {
    draft: number;
    scheduled: number;
    published: number;
    total: number;
}

export const postService = {
    async createPost(post: Post) {
        const { data, error } = await supabase
            .from('posts')
            .insert([post])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // userId required to avoid RLS returning other users' published posts
    async getRecentPosts(userId: string, limit = 10) {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data ?? [];
    },

    async getScheduledPosts(userId: string, limit = 5) {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'scheduled')
            .order('scheduled_at', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data ?? [];
    },

    async getDashboardStats(userId: string): Promise<DashboardStats> {
        const { data, error } = await supabase
            .from('posts')
            .select('status')
            .eq('user_id', userId);

        if (error) throw error;
        const rows = data ?? [];
        return {
            draft:     rows.filter(r => r.status === 'draft').length,
            scheduled: rows.filter(r => r.status === 'scheduled').length,
            published: rows.filter(r => r.status === 'published').length,
            total:     rows.length,
        };
    },

    async getPostsPerDay(
        userId: string,
        days = 7,
    ): Promise<{ day: string; label: string; count: number }[]> {
        const since = new Date();
        since.setDate(since.getDate() - (days - 1));
        since.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('posts')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', since.toISOString());

        if (error) throw error;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Build ordered array covering each of the last `days` days
        const result: { day: string; label: string; count: number }[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            const key = d.toISOString().split('T')[0];
            const label = i === days - 1 ? 'Today' : dayNames[d.getDay()];
            result.push({ day: key, label, count: 0 });
        }

        for (const row of data ?? []) {
            const key = (row.created_at as string).split('T')[0];
            const entry = result.find(r => r.day === key);
            if (entry) entry.count++;
        }

        return result;
    },
};
