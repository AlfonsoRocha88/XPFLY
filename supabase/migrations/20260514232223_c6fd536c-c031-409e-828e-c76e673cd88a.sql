ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS missions_completed_total INTEGER NOT NULL DEFAULT 0;