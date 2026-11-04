DROP POLICY IF EXISTS "Users create their own join requests" ON public.clan_join_requests;
CREATE POLICY "Users create their own join requests"
ON public.clan_join_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');