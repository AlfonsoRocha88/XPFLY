-- Stats: a per-day personal log (sleep for now) and read access to the user's own XP ledger.

-- ---------------- daily_logs ----------------
create table public.daily_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The user's local calendar day the log describes (the morning after the night slept).
  day date not null,
  sleep_minutes int check (sleep_minutes between 0 and 1440),
  slept_at timestamptz,
  woke_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.daily_logs enable row level security;

create policy "daily_logs: own rows" on public.daily_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.daily_logs to authenticated;
grant all on public.daily_logs to service_role;

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger daily_logs_touch before update on public.daily_logs
  for each row execute function public.touch_updated_at();

-- ---------------- get_my_activity ----------------
-- xp_awards stays closed to clients; this returns only the caller's own, unflagged awards.
create function public.get_my_activity(p_from timestamptz, p_to timestamptz)
returns table (
  awarded_at timestamptz,
  day date,
  xp int,
  task_id uuid,
  is_daily boolean,
  priority text,
  title text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.created_at, a.day, a.xp, a.task_id,
         coalesce(t.is_daily, a.day is not null),
         t.priority::text,
         t.title
  from public.xp_awards a
  left join public.tasks t on t.id = a.task_id
  where a.user_id = auth.uid()
    and a.flagged is null
    and a.created_at >= p_from
    and a.created_at < p_to
  order by a.created_at;
$$;

revoke execute on function public.get_my_activity(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_my_activity(timestamptz, timestamptz) to authenticated;
