-- 1. Update default and existing weekly_goal to 50
ALTER TABLE public.clans ALTER COLUMN weekly_goal SET DEFAULT 50;
UPDATE public.clans SET weekly_goal = 50;

-- 2. Contributions table
CREATE TABLE IF NOT EXISTS public.clan_weekly_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clan_id, user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clan_weekly_contributions TO authenticated;
GRANT ALL ON public.clan_weekly_contributions TO service_role;

ALTER TABLE public.clan_weekly_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view clan contributions"
  ON public.clan_weekly_contributions FOR SELECT
  TO authenticated
  USING (public.is_clan_member(clan_id, auth.uid()));

CREATE POLICY "Service role manages contributions"
  ON public.clan_weekly_contributions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_clan_weekly_contributions_lookup
  ON public.clan_weekly_contributions (clan_id, week_start, count DESC);

CREATE TRIGGER trg_clan_weekly_contributions_updated
  BEFORE UPDATE ON public.clan_weekly_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Replace bump trigger to also track per-member contributions
CREATE OR REPLACE FUNCTION public.bump_clan_weekly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  wk timestamptz;
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR c IN SELECT clan_id FROM public.clan_members WHERE user_id = NEW.user_id LOOP
      UPDATE public.clans
      SET weekly_progress = 0,
          weekly_reset_at = date_trunc('week', now()) + interval '7 days',
          updated_at = now()
      WHERE id = c.clan_id AND now() >= weekly_reset_at;

      UPDATE public.clans
      SET weekly_progress = weekly_progress + 1,
          xp = xp + 1,
          updated_at = now()
      WHERE id = c.clan_id;

      wk := date_trunc('week', now());
      INSERT INTO public.clan_weekly_contributions (clan_id, user_id, week_start, count)
      VALUES (c.clan_id, NEW.user_id, wk, 1)
      ON CONFLICT (clan_id, user_id, week_start)
      DO UPDATE SET count = public.clan_weekly_contributions.count + 1,
                    updated_at = now();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
