-- XPFly scheduled jobs. Run ONCE in the Supabase SQL editor after `supabase db push`.
-- Replace the two placeholders first:
--   <PROJECT_REF>        your project id (Settings → General), e.g. abcd1234efgh5678
--   <SERVICE_ROLE_KEY>   Settings → API → service_role secret (keep it private)
-- The key is stored in Supabase Vault, not in the job definitions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'xpfly_project_url');
select vault.create_secret('<SERVICE_ROLE_KEY>', 'xpfly_service_key');

create or replace function public.xpfly_call_cron_worker(mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'xpfly_project_url');
  key text := (select decrypted_secret from vault.decrypted_secrets where name = 'xpfly_service_key');
begin
  perform net.http_post(
    url := base || '/functions/v1/cron-worker?mode=' || mode,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || key),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.xpfly_call_cron_worker(text) from public, anon, authenticated;

-- Mission reminders: every minute
select cron.schedule('xpfly-mission-reminders', '* * * * *', $$select public.xpfly_call_cron_worker('mission-reminders')$$);
-- Pyro hunger nudges: every 30 minutes
select cron.schedule('xpfly-pyro-hunger', '*/30 * * * *', $$select public.xpfly_call_cron_worker('pyro-hunger')$$);
-- League trophy decay: once a day (06:00 UTC)
select cron.schedule('xpfly-trophy-decay', '0 6 * * *', $$select public.xpfly_call_cron_worker('trophy-decay')$$);
