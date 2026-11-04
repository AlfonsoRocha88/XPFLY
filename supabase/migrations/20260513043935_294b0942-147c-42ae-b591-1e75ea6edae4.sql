
-- 1. CLANS: new columns
ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS emblem_config jsonb NOT NULL DEFAULT '{"shape":"heater","primary":"#3b82f6","secondary":"#1e293b","icon":"sword"}'::jsonb,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS join_type text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS weekly_goal integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS weekly_progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_reset_at timestamptz NOT NULL DEFAULT (date_trunc('week', now()) + interval '7 days');

-- enforce join_type values
DO $$ BEGIN
  ALTER TABLE public.clans ADD CONSTRAINT clans_join_type_chk CHECK (join_type IN ('open','request','closed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. SECURITY DEFINER helper to test clan membership without recursion
CREATE OR REPLACE FUNCTION public.is_clan_member(_clan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clan_members
    WHERE clan_id = _clan_id AND user_id = _user_id
  );
$$;

-- 3. CLAN_MESSAGES
CREATE TABLE IF NOT EXISTS public.clan_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clan_messages_clan_idx ON public.clan_messages (clan_id, created_at DESC);
ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view clan messages" ON public.clan_messages;
CREATE POLICY "Members can view clan messages"
  ON public.clan_messages FOR SELECT TO authenticated
  USING (public.is_clan_member(clan_id, auth.uid()));

DROP POLICY IF EXISTS "Members can post clan messages" ON public.clan_messages;
CREATE POLICY "Members can post clan messages"
  ON public.clan_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_clan_member(clan_id, auth.uid()));

DROP POLICY IF EXISTS "Authors can delete their clan messages" ON public.clan_messages;
CREATE POLICY "Authors can delete their clan messages"
  ON public.clan_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.clan_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. CLAN_ACTIVITY
CREATE TABLE IF NOT EXISTS public.clan_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL,
  user_id uuid,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clan_activity_clan_idx ON public.clan_activity (clan_id, created_at DESC);
ALTER TABLE public.clan_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view clan activity" ON public.clan_activity;
CREATE POLICY "Members can view clan activity"
  ON public.clan_activity FOR SELECT TO authenticated
  USING (public.is_clan_member(clan_id, auth.uid()));

-- (no client-side INSERT policy: rows come from triggers running as SECURITY DEFINER)

ALTER TABLE public.clan_activity REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_activity;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Trigger: log join/leave on clan_members
CREATE OR REPLACE FUNCTION public.log_clan_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.clan_activity (clan_id, user_id, type, data)
    VALUES (NEW.clan_id, NEW.user_id, 'joined', jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.clan_activity (clan_id, user_id, type, data)
    VALUES (OLD.clan_id, OLD.user_id, 'left', jsonb_build_object('role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS clan_members_activity_log ON public.clan_members;
CREATE TRIGGER clan_members_activity_log
AFTER INSERT OR DELETE ON public.clan_members
FOR EACH ROW EXECUTE FUNCTION public.log_clan_membership_change();

-- 6. Trigger: log level-up & streak milestones on profiles, plus track weekly_progress on tasks
CREATE OR REPLACE FUNCTION public.log_profile_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  -- Level up
  IF NEW.level IS DISTINCT FROM OLD.level AND NEW.level > COALESCE(OLD.level, 0) THEN
    FOR c IN SELECT clan_id FROM public.clan_members WHERE user_id = NEW.user_id LOOP
      INSERT INTO public.clan_activity (clan_id, user_id, type, data)
      VALUES (c.clan_id, NEW.user_id, 'leveled_up', jsonb_build_object('level', NEW.level));
    END LOOP;
  END IF;

  -- Streak milestone
  IF NEW.daily_streak IS DISTINCT FROM OLD.daily_streak
     AND NEW.daily_streak > COALESCE(OLD.daily_streak, 0)
     AND NEW.daily_streak IN (3, 7, 14, 30, 60, 100, 365) THEN
    FOR c IN SELECT clan_id FROM public.clan_members WHERE user_id = NEW.user_id LOOP
      INSERT INTO public.clan_activity (clan_id, user_id, type, data)
      VALUES (c.clan_id, NEW.user_id, 'streak', jsonb_build_object('days', NEW.daily_streak));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_progress_log ON public.profiles;
CREATE TRIGGER profiles_progress_log
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_progress();

-- 7. Trigger: increment weekly_progress when a task transitions to done
CREATE OR REPLACE FUNCTION public.bump_clan_weekly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR c IN SELECT clan_id FROM public.clan_members WHERE user_id = NEW.user_id LOOP
      UPDATE public.clans
      SET weekly_progress = weekly_progress + 1,
          xp = xp + 1,
          updated_at = now()
      WHERE id = c.clan_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_clan_weekly_progress ON public.tasks;
CREATE TRIGGER tasks_clan_weekly_progress
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.bump_clan_weekly_progress();

-- 8. Lazy weekly reset (callable from client)
CREATE OR REPLACE FUNCTION public.reset_weekly_clan_progress(_clan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clans
  SET weekly_progress = 0,
      weekly_reset_at = date_trunc('week', now()) + interval '7 days',
      updated_at = now()
  WHERE id = _clan_id AND now() >= weekly_reset_at;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_weekly_clan_progress(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reset_weekly_clan_progress(uuid) TO authenticated;
