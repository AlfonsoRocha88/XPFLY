
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_league_id text NOT NULL DEFAULT 'mortal-3',
  ADD COLUMN IF NOT EXISTS highest_trophies integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.league_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_league_id text,
  to_league_id text NOT NULL,
  trophies integer NOT NULL,
  direction text NOT NULL DEFAULT 'promotion',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.league_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own league changes"
  ON public.league_changes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own league changes"
  ON public.league_changes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_league_changes_user_created
  ON public.league_changes (user_id, created_at DESC);
