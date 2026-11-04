
-- 1) clan_activity: remove client-facing INSERT policy. Triggers run as SECURITY DEFINER and bypass RLS.
DROP POLICY IF EXISTS "Members can insert their own clan activity" ON public.clan_activity;

-- 2) party_members: tighten SELECT policy so pending invites are not leaked.
DROP POLICY IF EXISTS "Members can view party members" ON public.party_members;
CREATE POLICY "Members can view party members"
ON public.party_members
FOR SELECT
TO authenticated
USING (
  is_party_member(party_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.parties p
    WHERE p.id = party_members.party_id AND p.leader_id = auth.uid()
  )
);

-- 3) clan_join_requests: rebind UPDATE policy to authenticated and add WITH CHECK to lock leader_id ownership.
DROP POLICY IF EXISTS "Leader can update join requests" ON public.clan_join_requests;
CREATE POLICY "Leader can update join requests"
ON public.clan_join_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_join_requests.clan_id AND c.leader_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_join_requests.clan_id AND c.leader_id = auth.uid()
  )
);

-- Also rebind the other clan_join_requests policies to authenticated for consistency.
DROP POLICY IF EXISTS "Requester or clan leader can view" ON public.clan_join_requests;
CREATE POLICY "Requester or clan leader can view"
ON public.clan_join_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_join_requests.clan_id AND c.leader_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Requester or leader can delete" ON public.clan_join_requests;
CREATE POLICY "Requester or leader can delete"
ON public.clan_join_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_join_requests.clan_id AND c.leader_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users create their own join requests" ON public.clan_join_requests;
CREATE POLICY "Users create their own join requests"
ON public.clan_join_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) Revoke EXECUTE on internal SECURITY DEFINER functions from client roles.
REVOKE EXECUTE ON FUNCTION public.reset_weekly_clan_progress(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_clan_weekly_progress() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_clan_membership_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_clan_member_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_profile_progress() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_clan_leader_as_member() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_league_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_notification_insert() FROM anon, authenticated;
