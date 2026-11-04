-- Push-notification triggers. These existed only on the Lovable-hosted database
-- (created outside migrations); recreated here from dispatch-event's contract.
-- They call the dispatch-event edge function through pg_net, reading the project
-- URL and service key from Vault (see supabase/setup/cron.sql). Without those
-- secrets they do nothing, and they never block the row that fired them.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public._notify_dispatch(_event text, _user_id uuid, _row_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  key text;
BEGIN
  SELECT decrypted_secret INTO base FROM vault.decrypted_secrets WHERE name = 'xpfly_project_url';
  SELECT decrypted_secret INTO key FROM vault.decrypted_secrets WHERE name = 'xpfly_service_key';
  IF base IS NULL OR key IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := base || '/functions/v1/dispatch-event',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || key),
    body := jsonb_build_object('event', _event, 'user_id', _user_id, 'row_id', _row_id, 'payload', COALESCE(_payload, '{}'::jsonb))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '_notify_dispatch(%) failed: %', _event, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public._notify_dispatch('friend_request', NEW.friend_id, NEW.id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_clan_join_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public._notify_dispatch('clan_join_request', NULL, NEW.id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_league_promotion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction = 'promotion' THEN
    PERFORM public._notify_dispatch('league_promotion', NEW.user_id, NEW.id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_friend_request ON public.friendships;
CREATE TRIGGER trg_notify_friend_request AFTER INSERT ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

DROP TRIGGER IF EXISTS trg_notify_clan_join_request ON public.clan_join_requests;
CREATE TRIGGER trg_notify_clan_join_request AFTER INSERT ON public.clan_join_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_clan_join_request();

DROP TRIGGER IF EXISTS trg_notify_league_promotion ON public.league_changes;
CREATE TRIGGER trg_notify_league_promotion AFTER INSERT ON public.league_changes
FOR EACH ROW EXECUTE FUNCTION public.notify_league_promotion();
