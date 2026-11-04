-- Profile photos must go through the moderate-avatar edge function.
-- 1) Clients can no longer write to the avatars bucket; the function uploads with the service role.
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

-- 2) Clients may only set avatar_url to a catalog avatar or to their own moderated photo.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
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
  NEW.daily_trophy_loss := OLD.daily_trophy_loss;
  NEW.daily_trophy_loss_date := OLD.daily_trophy_loss_date;
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
     AND NEW.avatar_url IS NOT NULL
     AND NEW.avatar_url !~ '^/avatars/[a-z-]+\.webp$'
     AND NEW.avatar_url !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/'
                            || OLD.user_id::text || '/avatar-photo-[0-9]+\.(webp|jpg|png)$') THEN
    NEW.avatar_url := OLD.avatar_url;
  END IF;
  RETURN NEW;
END;
$function$;
