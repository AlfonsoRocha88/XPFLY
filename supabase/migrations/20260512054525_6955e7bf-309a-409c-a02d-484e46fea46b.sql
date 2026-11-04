-- Helper: generate a unique uppercase 8-char friend code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- New default for friend_code (uppercase 8 chars)
ALTER TABLE public.profiles
  ALTER COLUMN friend_code SET DEFAULT upper(substr(md5(random()::text), 1, 8));

-- Backfill: any profile without friend_code or with lowercase code gets a fresh uppercase code
UPDATE public.profiles
SET friend_code = public.generate_friend_code()
WHERE friend_code IS NULL OR friend_code ~ '[a-z]';

-- Ensure friend_code uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'profiles_friend_code_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_friend_code_key UNIQUE (friend_code);
  END IF;
END $$;

-- Recreate handle_new_user so it always sets friend_code and avoids duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  base text;
  candidate text;
  n int := 0;
  fc text;
BEGIN
  -- Skip if profile already exists for this user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  base := lower(regexp_replace(
    coalesce(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  IF base = '' OR base IS NULL THEN
    base := 'hero' || substr(md5(NEW.id::text), 1, 6);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  uname := candidate;

  fc := public.generate_friend_code();

  INSERT INTO public.profiles (user_id, display_name, username, friend_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), uname, fc);
  RETURN NEW;
END;
$$;