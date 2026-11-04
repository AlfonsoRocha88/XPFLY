
-- Realtime for clans
ALTER TABLE public.clans REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clans'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.clans';
  END IF;
END $$;

-- member_count column
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 0;

-- Backfill from current memberships
UPDATE public.clans c
SET member_count = COALESCE((SELECT count(*) FROM public.clan_members m WHERE m.clan_id = c.id), 0);

-- Trigger function
CREATE OR REPLACE FUNCTION public.sync_clan_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clans SET member_count = member_count + 1, updated_at = now() WHERE id = NEW.clan_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clans SET member_count = GREATEST(member_count - 1, 0), updated_at = now() WHERE id = OLD.clan_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS clan_members_count_ins ON public.clan_members;
CREATE TRIGGER clan_members_count_ins
AFTER INSERT ON public.clan_members
FOR EACH ROW EXECUTE FUNCTION public.sync_clan_member_count();

DROP TRIGGER IF EXISTS clan_members_count_del ON public.clan_members;
CREATE TRIGGER clan_members_count_del
AFTER DELETE ON public.clan_members
FOR EACH ROW EXECUTE FUNCTION public.sync_clan_member_count();
