
-- Add XP and level columns to profiles
ALTER TABLE public.profiles ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN level INTEGER NOT NULL DEFAULT 1;

-- Function to calculate level from XP (each level needs level*100 XP)
-- Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP, etc.
CREATE OR REPLACE FUNCTION public.calculate_level(total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  lvl INTEGER := 1;
  xp_needed INTEGER := 0;
BEGIN
  LOOP
    xp_needed := xp_needed + lvl * 100;
    IF total_xp < xp_needed THEN
      RETURN lvl;
    END IF;
    lvl := lvl + 1;
  END LOOP;
END;
$$;

-- Function to get XP needed for current level threshold
CREATE OR REPLACE FUNCTION public.xp_for_level(lvl INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  total INTEGER := 0;
  i INTEGER := 1;
BEGIN
  WHILE i < lvl LOOP
    total := total + i * 100;
    i := i + 1;
  END LOOP;
  RETURN total;
END;
$$;
