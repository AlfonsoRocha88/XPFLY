
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.profiles_public CASCADE;

CREATE VIEW public.profiles_public
WITH (security_invoker = false) AS
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
  created_at,
  friend_code
FROM public.profiles;

REVOKE ALL ON public.profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_public TO authenticated;

CREATE OR REPLACE FUNCTION public.find_profile_preview(_query text)
RETURNS SETOF public.profiles_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT pp.*
  FROM public.profiles_public pp
  WHERE pp.friend_code ILIKE _query OR pp.username ILIKE _query
  LIMIT 5;
$$;
REVOKE EXECUTE ON FUNCTION public.find_profile_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_preview(text) TO authenticated;
