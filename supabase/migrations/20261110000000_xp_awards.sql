-- Anti-cheat: XP awards are recorded server-side, one per habit per day.
-- tasks.xp_awarded stays as a UI hint only; award-xp trusts this ledger instead.
create table public.xp_awards (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  task_id uuid not null,
  xp int not null,
  -- 'burst' or 'daily_cap' when the award exceeded a limit (paid 0 XP, kept for review)
  flagged text,
  created_at timestamptz not null default now(),
  -- habit: the user's local day; null: regular task (paid only once)
  day date,
  unique nulls not distinct (task_id, day)
);
create index xp_awards_user_created_idx on public.xp_awards (user_id, created_at);

-- No policies: only edge functions (service role) read or write the ledger.
alter table public.xp_awards enable row level security;
revoke all on public.xp_awards from anon, authenticated;

-- created_at is set by the server, so the "task must be 1 hour old" rule can't be backdated.
create function public.guard_task_created_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() <> 'service_role' then
    new.created_at := case when tg_op = 'INSERT' then now() else old.created_at end;
  end if;
  return new;
end $$;
revoke execute on function public.guard_task_created_at() from public, anon, authenticated;

create trigger guard_task_created_at before insert or update on public.tasks
  for each row execute function public.guard_task_created_at();
