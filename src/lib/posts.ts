import { supabase } from './supabase';

export interface Post {
    id?: string;
    user_id: string;
    title: string;
    content: string;
    hashtags: string;
    template_type: string;
    status: 'draft' | 'scheduled' | 'published';
    scheduled_at?: string;
    created_at?: string;
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

    async getRecentPosts(limit = 10) {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async getScheduledPosts() {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('status', 'scheduled')
            .order('scheduled_at', { ascending: true });

        if (error) throw error;
        return data;
    }
};
