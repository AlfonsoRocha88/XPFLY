ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_awarded boolean NOT NULL DEFAULT false;
-- Mark already completed tasks as awarded so they don't re-grant XP
UPDATE public.tasks SET xp_awarded = true WHERE status = 'done' AND xp_awarded = false;