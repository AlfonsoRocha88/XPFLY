
-- Extensions for cron + http calls from db
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own push subscriptions"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add timezone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Allow timezone to be edited by user (re-create guard function preserving everything else)
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
  RETURN NEW;
END;
$function$;
