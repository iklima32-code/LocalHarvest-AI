-- Performance indexes for dashboard queries.
-- Run once in Supabase SQL editor before deploying dashboard changes.

CREATE INDEX IF NOT EXISTS idx_posts_user_created
    ON public.posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_status
    ON public.posts(user_id, status);
