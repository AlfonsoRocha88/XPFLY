
-- Add daily mission flag to tasks
ALTER TABLE public.tasks ADD COLUMN is_daily BOOLEAN NOT NULL DEFAULT false;

-- Add daily tracking to profiles
ALTER TABLE public.profiles ADD COLUMN daily_completed_at DATE;
ALTER TABLE public.profiles ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0;
