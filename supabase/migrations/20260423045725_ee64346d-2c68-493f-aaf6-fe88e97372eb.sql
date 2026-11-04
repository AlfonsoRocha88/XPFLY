-- Add new columns for behavior-based titles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unlocked_titles text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS equipped_title text,
  ADD COLUMN IF NOT EXISTS title_progress jsonb NOT NULL DEFAULT '{"morning_missions":0,"night_missions":0,"urgent_missions":0}'::jsonb;

-- Reset all players progress
UPDATE public.profiles
SET
  level = 1,
  xp = 0,
  stat_points_available = 0,
  stat_points_spent = 0,
  stats = '{"hp": 10, "mp": 10, "def": 10, "int": 10, "spd": 10, "str": 10}'::jsonb,
  unlocked_outfits = ARRAY['hunter','casual']::text[],
  current_class = NULL,
  current_class_tier = 0,
  unlocked_titles = ARRAY[]::text[],
  equipped_title = NULL,
  title_progress = '{"morning_missions":0,"night_missions":0,"urgent_missions":0}'::jsonb;

-- Easier XP curve: level 1->2 needs 50 XP, then +25 per level
CREATE OR REPLACE FUNCTION public.xp_for_level(lvl integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  total INTEGER := 0;
  i INTEGER := 1;
BEGIN
  WHILE i < lvl LOOP
    total := total + (50 + (i - 1) * 25);
    i := i + 1;
  END LOOP;
  RETURN total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_level(total_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  lvl INTEGER := 1;
  xp_needed INTEGER := 0;
BEGIN
  LOOP
    xp_needed := xp_needed + (50 + (lvl - 1) * 25);
    IF total_xp < xp_needed THEN
      RETURN lvl;
    END IF;
    lvl := lvl + 1;
  END LOOP;
END;
$function$;