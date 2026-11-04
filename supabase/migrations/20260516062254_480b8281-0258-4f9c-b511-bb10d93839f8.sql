
-- 1. Explicit INSERT policy on clan_activity (triggers use SECURITY DEFINER and bypass RLS)
CREATE POLICY "Members can insert their own clan activity"
ON public.clan_activity
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_clan_member(clan_id, auth.uid())
);

-- 2. Party members can view all members of parties they belong to
CREATE OR REPLACE FUNCTION public.is_party_member(_party_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.party_members
    WHERE party_id = _party_id AND user_id = _user_id AND status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM public.parties
    WHERE id = _party_id AND leader_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_party_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_party_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can view party members" ON public.party_members;

CREATE POLICY "Members can view party members"
ON public.party_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_party_member(party_id, auth.uid())
);
