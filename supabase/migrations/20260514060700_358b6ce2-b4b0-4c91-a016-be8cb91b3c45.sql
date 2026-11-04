ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_mission_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pyro_power_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pyro_onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pyro_last_decay_date date,
  ADD COLUMN IF NOT EXISTS pyro_age_band text,
  ADD COLUMN IF NOT EXISTS pyro_gender text,
  ADD COLUMN IF NOT EXISTS pyro_enemies text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pyro_areas text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pyro_time_cap text,
  ADD COLUMN IF NOT EXISTS pyro_peak_time text,
  ADD COLUMN IF NOT EXISTS pyro_goal text;