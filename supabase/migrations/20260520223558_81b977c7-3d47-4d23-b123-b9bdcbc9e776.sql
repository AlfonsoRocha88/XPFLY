
-- Replace SECURITY DEFINER view with SECURITY DEFINER functions for safer access.

DROP FUNCTION IF EXISTS public.find_profile_preview(text);
DROP VIEW IF EXISTS public.profiles_public;

-- Function: bulk fetch public profile data by user_ids
CREATE OR REPLACE FUNCTION public.get_profiles_public(_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  avatar_config jsonb,
  wallpaper text,
  level integer,
  xp integer,
  trophies integer,
  highest_trophies integer,
  current_league_id text,
  daily_streak integer,
  equipped_title text,
  current_class text,
  current_class_tier integer,
  stats jsonb,
  unlocked_outfits text[],
  unlocked_titles text[],
  friend_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url, p.avatar_config,
         p.wallpaper, p.level, p.xp, p.trophies, p.highest_trophies,
         p.current_league_id, p.daily_streak, p.equipped_title,
         p.current_class, p.current_class_tier, p.stats,
         p.unlocked_outfits, p.unlocked_titles, p.friend_code
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_profiles_public(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profiles_public(uuid[]) TO authenticated;

-- Function: top trophies leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  avatar_config jsonb,
  level integer,
  xp integer,
  trophies integer,
  highest_trophies integer,
  current_league_id text,
  equipped_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url, p.avatar_config,
         p.level, p.xp, p.trophies, p.highest_trophies,
         p.current_league_id, p.equipped_title
  FROM public.profiles p
  ORDER BY p.trophies DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

-- Recreate find_profile_preview without depending on the dropped view
CREATE OR REPLACE FUNCTION public.find_profile_preview(_query text)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  avatar_config jsonb,
  level integer,
  trophies integer,
  friend_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url, p.avatar_config,
         p.level, p.trophies, p.friend_code
  FROM public.profiles p
  WHERE p.friend_code ILIKE _query OR p.username ILIKE _query
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.find_profile_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_preview(text) TO authenticated;

-- Block direct client writes to append-only/trigger-managed tables.
CREATE POLICY "Block client inserts on clan_activity"
ON public.clan_activity AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (false);
CREATE POLICY "Block client updates on clan_activity"
ON public.clan_activity AS RESTRICTIVE FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on clan_activity"
ON public.clan_activity AS RESTRICTIVE FOR DELETE TO authenticated
USING (false);

CREATE POLICY "Block client inserts on league_changes"
ON public.league_changes AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (false);
CREATE POLICY "Block client updates on league_changes"
ON public.league_changes AS RESTRICTIVE FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on league_changes"
ON public.league_changes AS RESTRICTIVE FOR DELETE TO authenticated
USING (false);
