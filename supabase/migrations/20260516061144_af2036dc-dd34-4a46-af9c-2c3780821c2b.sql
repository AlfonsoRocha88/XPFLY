-- Replace broad avatar SELECT policy with a narrower policy for generated public avatar image paths
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Generated avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND name LIKE 'public/avatar-%'
  AND (
    lower(name) LIKE '%.png'
    OR lower(name) LIKE '%.jpg'
    OR lower(name) LIKE '%.jpeg'
    OR lower(name) LIKE '%.webp'
  )
);

-- Search only returns safe profile preview data and does not need SECURITY DEFINER because profiles_public is the safe projection
CREATE OR REPLACE FUNCTION public.find_profile_preview(_query text)
RETURNS SETOF profiles_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT pp.*
  FROM public.profiles_public pp
  JOIN public.profiles p ON p.user_id = pp.user_id
  WHERE p.friend_code ILIKE _query OR p.username ILIKE _query
  LIMIT 5;
$$;
REVOKE EXECUTE ON FUNCTION public.find_profile_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_preview(text) TO authenticated;

-- Keep weekly resets as internal backend behavior; clients should not execute this function directly
CREATE OR REPLACE FUNCTION public.bump_clan_weekly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c record;
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR c IN SELECT clan_id FROM public.clan_members WHERE user_id = NEW.user_id LOOP
      UPDATE public.clans
      SET weekly_progress = 0,
          weekly_reset_at = date_trunc('week', now()) + interval '7 days',
          updated_at = now()
      WHERE id = c.clan_id AND now() >= weekly_reset_at;

      UPDATE public.clans
      SET weekly_progress = weekly_progress + 1,
          xp = xp + 1,
          updated_at = now()
      WHERE id = c.clan_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_weekly_clan_progress(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_clan_weekly_progress() FROM PUBLIC, anon, authenticated;