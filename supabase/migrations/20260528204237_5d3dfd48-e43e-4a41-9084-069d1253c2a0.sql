
-- Lock down EXECUTE on SECURITY DEFINER functions.
-- Revoke from PUBLIC, then grant only where API/RLS callers need it.

-- Trigger-only functions: no API caller should execute these directly.
REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_weekly_clan_progress(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_clan_weekly_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_clan_membership_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_clan_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_profile_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_clan_join_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_clan_leader_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_league_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_league_promotion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_friend_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._notify_dispatch(text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_notification_insert() FROM PUBLIC, anon, authenticated;

-- RPCs called from the client: restrict to signed-in users only (no anon).
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_profiles_public(uuid[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_profiles_public(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.find_profile_preview(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.find_profile_preview(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_global_trophy_rank(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_global_trophy_rank(uuid) TO authenticated;

-- RLS helper predicates (used inside policies): authenticated needs EXECUTE; anon does not.
REVOKE EXECUTE ON FUNCTION public.is_party_member(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_party_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_party_leader(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_party_leader(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_clan_member(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_clan_member(uuid, uuid) TO authenticated;
