ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS bg_animations boolean NOT NULL DEFAULT true;