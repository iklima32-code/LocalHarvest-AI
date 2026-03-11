-- Fix: add missing DELETE RLS policy for posts table.
-- Without this policy, authenticated users cannot delete their own posts
-- and the client-side delete silently deletes 0 rows with no error.
--
-- Run once in Supabase SQL editor.

CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE USING (auth.uid() = user_id);
