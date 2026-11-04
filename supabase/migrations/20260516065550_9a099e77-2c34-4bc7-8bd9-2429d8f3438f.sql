
DROP POLICY IF EXISTS "Leaders can add members" ON public.clan_members;

CREATE POLICY "Leaders can add approved requesters"
ON public.clan_members
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_members.clan_id
      AND c.leader_id = auth.uid()
      AND c.member_count < c.max_members
  )
  AND EXISTS (
    SELECT 1 FROM public.clan_join_requests r
    WHERE r.clan_id = clan_members.clan_id
      AND r.user_id = clan_members.user_id
      AND r.status IN ('pending','accepted')
  )
);
