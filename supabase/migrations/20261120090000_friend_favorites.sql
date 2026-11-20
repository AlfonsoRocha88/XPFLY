-- Friends I starred: private to me, shown first in my list.
create table if not exists public.friend_favorites (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
create index if not exists friend_favorites_friend_idx on public.friend_favorites (friend_id);
alter table public.friend_favorites enable row level security;
drop policy if exists "favorites_select_own" on public.friend_favorites;
create policy "favorites_select_own" on public.friend_favorites for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "favorites_insert_own" on public.friend_favorites;
create policy "favorites_insert_own" on public.friend_favorites for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "favorites_delete_own" on public.friend_favorites;
create policy "favorites_delete_own" on public.friend_favorites for delete to authenticated using (user_id = (select auth.uid()));
