-- Add unique username to profiles for username-based login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Backfill from display_name where missing (lowercased, stripped)
UPDATE public.profiles
SET username = lower(regexp_replace(coalesce(display_name, 'hero_' || substr(user_id::text, 1, 8)), '[^a-zA-Z0-9_]', '', 'g'))
WHERE username IS NULL;

-- Ensure uniqueness (append short hash if collision)
WITH dups AS (
  SELECT id, username,
    row_number() OVER (PARTITION BY lower(username) ORDER BY created_at) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET username = p.username || '_' || substr(md5(p.id::text), 1, 4)
FROM dups
WHERE p.id = dups.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

-- Update handle_new_user to also set username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uname text;
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  IF base = '' OR base IS NULL THEN
    base := 'hero' || substr(md5(NEW.id::text), 1, 6);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  uname := candidate;

  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), uname);
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function: resolve email from username (SECURITY DEFINER so anon can use it for login)
CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE lower(p.username) = lower(_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated;