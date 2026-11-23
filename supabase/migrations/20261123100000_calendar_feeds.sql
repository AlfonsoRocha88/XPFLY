-- External calendars (iCal links, Google) copied into Constela, read-only, calendar view only.

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null default 'ical' check (kind in ('ical', 'google')),
  url text check (url is null or (char_length(url) <= 2048 and url ~* '^(https|webcal)://')),
  google_calendar_id text,
  name text not null default 'Calendario' check (char_length(name) <= 40),
  color text not null default '#7c8cff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
create index if not exists calendar_feeds_user_idx on public.calendar_feeds (user_id);
create index if not exists calendar_feeds_sync_idx on public.calendar_feeds (last_synced_at nulls first);
alter table public.calendar_feeds enable row level security;

drop policy if exists "feeds_select_own" on public.calendar_feeds;
create policy "feeds_select_own" on public.calendar_feeds for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "feeds_update_own" on public.calendar_feeds;
create policy "feeds_update_own" on public.calendar_feeds for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "feeds_delete_own" on public.calendar_feeds;
create policy "feeds_delete_own" on public.calendar_feeds for delete to authenticated using (user_id = (select auth.uid()));
-- Inserts go through the sync-calendars function (it validates and fetches the link first).

-- Clients may only rename / recolor.
create or replace function public.guard_calendar_feed_update()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  new.user_id := old.user_id; new.kind := old.kind; new.url := old.url;
  new.google_calendar_id := old.google_calendar_id; new.last_synced_at := old.last_synced_at;
  new.last_error := old.last_error; new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists guard_calendar_feed_update on public.calendar_feeds;
create trigger guard_calendar_feed_update before update on public.calendar_feeds
  for each row execute function public.guard_calendar_feed_update();

-- Google refresh tokens: only the service role touches them.
create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  email text,
  created_at timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.calendar_feeds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  uid text not null,
  title text not null check (char_length(title) <= 200),
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  location text check (location is null or char_length(location) <= 200),
  unique (feed_id, uid, start_time)
);
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_time);
alter table public.calendar_events enable row level security;
drop policy if exists "events_select_own" on public.calendar_events;
create policy "events_select_own" on public.calendar_events for select to authenticated using (user_id = (select auth.uid()));

-- Sync every 15 minutes through the existing cron helper.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'xpfly_call_cron_worker') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'xpfly-calendar-sync';
    perform cron.schedule('xpfly-calendar-sync', '*/15 * * * *', $c$select public.xpfly_call_cron_worker('calendar-sync')$c$);
  end if;
end $$;
