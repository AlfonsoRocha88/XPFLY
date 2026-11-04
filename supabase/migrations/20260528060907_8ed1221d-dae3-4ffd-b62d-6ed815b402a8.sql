CREATE OR REPLACE FUNCTION public.get_global_trophy_rank(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.profiles p2
    WHERE p2.trophies > COALESCE((SELECT trophies FROM public.profiles WHERE user_id = _user_id), 0)
  )::int + 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_trophy_rank(uuid) TO authenticated;