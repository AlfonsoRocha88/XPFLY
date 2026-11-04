DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='clans') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.clans';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='clan_members') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.clan_members';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='party_members') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.party_members';
  END IF;
END $$;