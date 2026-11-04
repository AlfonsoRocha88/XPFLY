-- 1) Drop broad SELECT policy on avatars (public bucket already serves files via public URL, no need for listing)
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 2) Revoke EXECUTE on internal SECURITY DEFINER trigger functions from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_clan_leader_as_member() FROM PUBLIC, anon, authenticated;

-- 3) Tighten get_email_for_username: only anon needs it (used pre-login to resolve username -> email).
--    Revoke from authenticated so signed-in users can't enumerate emails of other users.
REVOKE EXECUTE ON FUNCTION public.get_email_for_username(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon;