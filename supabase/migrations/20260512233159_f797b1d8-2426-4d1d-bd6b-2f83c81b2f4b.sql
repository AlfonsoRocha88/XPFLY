
-- Allow authenticated users to view profiles (needed for friend search, clan member display, etc.)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Lock down the trigger helper: only the table trigger should invoke it
REVOKE EXECUTE ON FUNCTION public.sync_clan_member_count() FROM PUBLIC, anon, authenticated;
