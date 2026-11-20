-- User search: wildcards in the input are literal, usernames match by prefix (2+ chars),
-- friend codes only by exact code, and a code is only returned to whoever typed it.
CREATE OR REPLACE FUNCTION public.find_profile_preview(_query text)
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, avatar_config jsonb, level integer, trophies integer, friend_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT lower(regexp_replace(rtrim(trim(_query), '%'), '^@', '')) AS raw
  ), e AS (
    SELECT raw, replace(replace(replace(raw, '\', '\'), '%', '\%'), '_', '\_') AS esc FROM q
  )
  SELECT p.user_id, p.username, p.display_name, p.avatar_url, p.avatar_config, p.level, p.trophies,
         CASE WHEN upper(p.friend_code) = upper(e.raw) THEN p.friend_code END
  FROM public.profiles p, e
  WHERE length(e.raw) >= 2
    AND (upper(p.friend_code) = upper(e.raw) OR lower(p.username) LIKE e.esc || '%')
  ORDER BY (upper(p.friend_code) = upper(e.raw)) DESC, (lower(p.username) = e.raw) DESC, p.username
  LIMIT 5;
$function$;
