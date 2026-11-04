
REVOKE ALL ON FUNCTION public.log_clan_membership_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_profile_progress() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_clan_weekly_progress() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_clan_member_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_clan_leader_as_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_clan_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clan_member(uuid, uuid) TO authenticated;
