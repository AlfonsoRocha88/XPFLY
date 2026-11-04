ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS streak_freezes integer NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS streak_freeze_max integer NOT NULL DEFAULT 3;