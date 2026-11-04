-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- clan_join_requests
CREATE TABLE IF NOT EXISTS public.clan_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clan_id, user_id)
);
ALTER TABLE public.clan_join_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clan_join_requests_clan ON public.clan_join_requests(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_join_requests_user ON public.clan_join_requests(user_id);

DROP POLICY IF EXISTS "Requester or clan leader can view" ON public.clan_join_requests;
CREATE POLICY "Requester or clan leader can view" ON public.clan_join_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.leader_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users create their own join requests" ON public.clan_join_requests;
CREATE POLICY "Users create their own join requests" ON public.clan_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Leader can update join requests" ON public.clan_join_requests;
CREATE POLICY "Leader can update join requests" ON public.clan_join_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.leader_id = auth.uid())
  );
DROP POLICY IF EXISTS "Requester or leader can delete" ON public.clan_join_requests;
CREATE POLICY "Requester or leader can delete" ON public.clan_join_requests
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.leader_id = auth.uid())
  );

-- Realtime: replica identity
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.clan_members REPLICA IDENTITY FULL;
ALTER TABLE public.clan_join_requests REPLICA IDENTITY FULL;

-- Realtime: add to publication only if not already member
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='friendships') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='clan_members') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_members';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='clan_join_requests') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_join_requests';
  END IF;
END $$;