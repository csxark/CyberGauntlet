CREATE POLICY "Users can delete own posts"
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);




CREATE POLICY "Users can insert own posts"
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);


CREATE POLICY "Users can read own posts"
ON public.posts
FOR SELECT
USING (auth.uid() = user_id);


CREATE POLICY "Users can update own posts"
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
