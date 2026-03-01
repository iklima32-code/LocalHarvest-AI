-- Allow public viewing of published posts so Facebook can scrape them
CREATE POLICY "Anyone can view published posts" ON public.posts 
FOR SELECT USING (status = 'published');

-- Allow public viewing of profiles so the share page can display farm names
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles
FOR SELECT USING (true);
