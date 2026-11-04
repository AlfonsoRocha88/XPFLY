-- 1. Profile privileged-column guard trigger
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions using the service key) full access.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For all other roles, force privileged columns back to their previous values.
  NEW.user_id := OLD.user_id;
  NEW.username := OLD.username;
  NEW.friend_code := OLD.friend_code;
  NEW.xp := OLD.xp;
  NEW.level := OLD.level;
  NEW.coins := OLD.coins;
  NEW.trophies := OLD.trophies;
  NEW.highest_trophies := OLD.highest_trophies;
  NEW.current_league_id := OLD.current_league_id;
  NEW.unlocked_titles := OLD.unlocked_titles;
  NEW.equipped_title := OLD.equipped_title;
  NEW.unlocked_outfits := OLD.unlocked_outfits;
  NEW.stat_points_available := OLD.stat_points_available;
  NEW.stat_points_spent := OLD.stat_points_spent;
  NEW.stats := OLD.stats;
  NEW.current_class := OLD.current_class;
  NEW.current_class_tier := OLD.current_class_tier;
  NEW.streak_freezes := OLD.streak_freezes;
  NEW.streak_freeze_max := OLD.streak_freeze_max;
  NEW.unopened_chests := OLD.unopened_chests;
  NEW.daily_completed_at := OLD.daily_completed_at;
  NEW.daily_streak := OLD.daily_streak;
  NEW.title_progress := OLD.title_progress;
  NEW.missions_completed_total := OLD.missions_completed_total;
  NEW.last_mission_completed_at := OLD.last_mission_completed_at;
  NEW.pyro_power_level := OLD.pyro_power_level;
  NEW.pyro_last_decay_date := OLD.pyro_last_decay_date;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_columns() FROM anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- 2. Tighten avatar storage write policies to enforce avatar-<random>.png filenames
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

CREATE POLICY "Users upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name LIKE (auth.uid()::text || '/avatar-%')
);

CREATE POLICY "Users update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name LIKE (auth.uid()::text || '/avatar-%')
);

CREATE POLICY "Users delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);