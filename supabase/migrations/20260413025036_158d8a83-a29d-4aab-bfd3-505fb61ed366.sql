
CREATE OR REPLACE FUNCTION public.calculate_level(total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.xp_for_level(lvl INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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
