
CREATE OR REPLACE FUNCTION public.is_party_leader(_party_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.parties WHERE id = _party_id AND leader_id = _user_id);
$$;

DROP POLICY IF EXISTS "Party members can view their party" ON public.parties;
CREATE POLICY "Party members can view their party"
ON public.parties FOR SELECT
USING (leader_id = auth.uid() OR public.is_party_member(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view party members" ON public.party_members;
CREATE POLICY "Members can view party members"
ON public.party_members FOR SELECT TO authenticated
USING (public.is_party_member(party_id, auth.uid()));

DROP POLICY IF EXISTS "Leaders can remove members" ON public.party_members;
CREATE POLICY "Leaders can remove members"
ON public.party_members FOR DELETE
USING (auth.uid() = user_id OR public.is_party_leader(party_id, auth.uid()));

DROP POLICY IF EXISTS "Leaders can invite members" ON public.party_members;
CREATE POLICY "Leaders can invite members"
ON public.party_members FOR INSERT
WITH CHECK (public.is_party_leader(party_id, auth.uid()));
