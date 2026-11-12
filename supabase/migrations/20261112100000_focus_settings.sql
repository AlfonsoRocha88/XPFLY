-- App blocking ("Bloqueo") and focus mode.
-- An iPhone Shortcuts automation runs whenever a blocked app opens and asks the
-- `focus-status` function (with the user's private token) whether to send them away.
create table if not exists public.focus_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Private link secret used by the Shortcuts automation (no login inside Shortcuts).
  token uuid not null default gen_random_uuid() unique,
  -- Block until today's daily tasks are done (the Duolingo-style rule).
  lock_until_dailies boolean not null default true,
  -- Focus mode: everything in the automation stays blocked until this moment.
  focus_until timestamptz,
  -- Emergency pause: nothing is blocked until this moment.
  pause_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.focus_settings enable row level security;

create policy "focus_settings: read own" on public.focus_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "focus_settings: insert own" on public.focus_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "focus_settings: update own" on public.focus_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
