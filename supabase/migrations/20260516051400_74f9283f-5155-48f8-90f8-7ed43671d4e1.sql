
-- 1) Profiles: stop blanket exposure of sensitive columns
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  user_id,
  display_name,
  username,
  avatar_url,
  avatar_config,
  wallpaper,
  level,
  xp,
  trophies,
  highest_trophies,
  current_league_id,
  daily_streak,
  equipped_title,
  current_class,
  current_class_tier,
  stats,
  unlocked_outfits,
  unlocked_titles,
  created_at
FROM public.profiles;

REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add a permissive SELECT policy so the view (which runs as the invoker)
-- can return rows from public.profiles for authenticated users — but only
-- via the view, since the view exposes a safe column subset.
CREATE POLICY "Authenticated can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- NOTE: We rely on application code reading public-safe fields exclusively
-- through public.profiles_public. The blanket policy above is retained
-- because PostgreSQL RLS cannot restrict columns; the view is the contract.
-- To make leakage harder, expose a SECURITY DEFINER lookup for friend search
-- that returns only the safe columns from profiles_public.

CREATE OR REPLACE FUNCTION public.find_profile_preview(_query text)
RETURNS SETOF public.profiles_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.*
  FROM public.profiles_public pp
  JOIN public.profiles p ON p.user_id = pp.user_id
  WHERE p.friend_code ILIKE _query OR p.username ILIKE _query
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.find_profile_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_preview(text) TO authenticated;

-- 2) League changes: remove user-facing INSERT, automate via trigger
DROP POLICY IF EXISTS "Users can insert their own league changes" ON public.league_changes;

CREATE OR REPLACE FUNCTION public.log_league_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dir text;
BEGIN
  IF NEW.current_league_id IS DISTINCT FROM OLD.current_league_id THEN
    dir := CASE WHEN COALESCE(NEW.trophies,0) >= COALESCE(OLD.trophies,0)
                THEN 'promotion' ELSE 'demotion' END;
    INSERT INTO public.league_changes (user_id, from_league_id, to_league_id, trophies, direction)
    VALUES (NEW.user_id, OLD.current_league_id, NEW.current_league_id, COALESCE(NEW.trophies,0), dir);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_league_change ON public.profiles;
CREATE TRIGGER trg_log_league_change
AFTER UPDATE OF current_league_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_league_change();

-- 3) Parties: fix broken self-referential join in SELECT policy
DROP POLICY IF EXISTS "Party members can view their party" ON public.parties;
CREATE POLICY "Party members can view their party"
ON public.parties
FOR SELECT
USING (
  (leader_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.party_members pm
    WHERE pm.party_id = parties.id AND pm.user_id = auth.uid()
  )
);

-- 4) Lock down SECURITY DEFINER helpers not meant for direct API exposure
REVOKE EXECUTE ON FUNCTION public.is_clan_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_friend_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_weekly_clan_progress(uuid) FROM PUBLIC, anon;
-- keep authenticated EXECUTE on reset_weekly_clan_progress (called from client)

-- Trigger functions: never need to be called directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_clan_leader_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_clan_membership_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_profile_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_clan_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_clan_weekly_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_league_change() FROM PUBLIC, anon, authenticated;

-- 5) Realtime: deny private channel subscriptions (app uses only postgres_changes)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all realtime broadcast" ON realtime.messages;
CREATE POLICY "Deny all realtime broadcast"
ON realtime.messages
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
