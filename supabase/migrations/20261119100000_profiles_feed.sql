-- Public profiles (bio), the friends-only photo feed, and an "unlock everything" flag.

-- 1. Bio: a short line under the name, editable by its owner (the guard trigger doesn't lock it).
alter table public.profiles add column if not exists bio text;
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 150);

-- 2. unlock_all: every shop item and frame counts as owned (set by the service role only).
alter table public.profiles add column if not exists unlock_all boolean not null default false;

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  new.user_id := old.user_id;
  new.username := old.username;
  new.friend_code := old.friend_code;
  new.xp := old.xp;
  new.level := old.level;
  new.coins := old.coins;
  new.trophies := old.trophies;
  new.highest_trophies := old.highest_trophies;
  new.current_league_id := old.current_league_id;
  new.unlocked_titles := old.unlocked_titles;
  new.equipped_title := old.equipped_title;
  new.unlocked_outfits := old.unlocked_outfits;
  new.unlocked_frames := old.unlocked_frames;
  new.equipped_frame := old.equipped_frame;
  new.owned_items := old.owned_items;
  new.unlock_all := old.unlock_all;
  new.stat_points_available := old.stat_points_available;
  new.stat_points_spent := old.stat_points_spent;
  new.stats := old.stats;
  new.current_class := old.current_class;
  new.current_class_tier := old.current_class_tier;
  new.streak_freezes := old.streak_freezes;
  new.streak_freeze_max := old.streak_freeze_max;
  new.unopened_chests := old.unopened_chests;
  new.daily_completed_at := old.daily_completed_at;
  new.daily_streak := old.daily_streak;
  new.title_progress := old.title_progress;
  new.missions_completed_total := old.missions_completed_total;
  new.last_mission_completed_at := old.last_mission_completed_at;
  new.pyro_power_level := old.pyro_power_level;
  new.pyro_last_decay_date := old.pyro_last_decay_date;
  new.daily_trophy_loss := old.daily_trophy_loss;
  new.daily_trophy_loss_date := old.daily_trophy_loss_date;
  if new.wallpaper is distinct from old.wallpaper
     and new.wallpaper like 'living-%'
     and new.wallpaper <> 'living-nebulosa'
     and not old.unlock_all
     and not (new.wallpaper = any(old.owned_items)) then
    new.wallpaper := old.wallpaper;
  end if;
  if new.avatar_url is distinct from old.avatar_url
     and new.avatar_url is not null
     and new.avatar_url !~ '^/avatars/[a-z-]+\.webp$'
     and new.avatar_url !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/'
                            || old.user_id::text || '/avatar-photo-[0-9]+\.(webp|jpg|png)$') then
    new.avatar_url := old.avatar_url;
  end if;
  return new;
end;
$function$;

-- 3. Friendship helper (used by RLS on posts, reactions and the posts bucket).
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((user_id = a and friend_id = b) or (user_id = b and friend_id = a))
  );
$$;
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- 4. One user's public card, with the friendship state seen from the caller.
create or replace function public.get_public_profile(_user_id uuid)
returns table (
  user_id uuid, display_name text, username text, avatar_url text, equipped_frame text, bio text,
  level int, xp int, trophies int, current_league_id text, daily_streak int, friendship text, friendship_id uuid
)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := (select auth.uid());
  f record;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select fr.id, fr.status, fr.user_id into f from public.friendships fr
  where (fr.user_id = me and fr.friend_id = _user_id) or (fr.user_id = _user_id and fr.friend_id = me)
  order by (fr.status = 'accepted') desc limit 1;

  return query
  select p.user_id, p.display_name, p.username, p.avatar_url, p.equipped_frame, p.bio,
         p.level, p.xp, p.trophies, p.current_league_id, p.daily_streak,
         case
           when p.user_id = me then 'self'
           when f.status = 'accepted' then 'accepted'
           when f.status = 'pending' and f.user_id = me then 'pending_out'
           when f.status = 'pending' then 'pending_in'
           else 'none'
         end,
         f.id
  from public.profiles p where p.user_id = _user_id;
end $$;
revoke execute on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

-- 5. Feed: photos of completed tasks, visible to the author and their friends.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  task_id uuid references public.tasks(id) on delete set null,
  task_title text check (task_title is null or char_length(task_title) <= 120),
  caption text check (caption is null or char_length(caption) <= 200),
  image_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_task_idx on public.posts (task_id);
alter table public.posts enable row level security;

drop policy if exists "posts_select_self_or_friends" on public.posts;
create policy "posts_select_self_or_friends" on public.posts for select to authenticated
  using (user_id = (select auth.uid()) or public.are_friends(user_id, (select auth.uid())));
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts for insert to authenticated
  with check (user_id = (select auth.uid()) and image_path like ((select auth.uid())::text || '/%'));
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_reactions_user_idx on public.post_reactions (user_id);
alter table public.post_reactions enable row level security;

drop policy if exists "reactions_select_visible" on public.post_reactions;
create policy "reactions_select_visible" on public.post_reactions for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id
                 and (p.user_id = (select auth.uid()) or public.are_friends(p.user_id, (select auth.uid())))));
drop policy if exists "reactions_insert_own" on public.post_reactions;
create policy "reactions_insert_own" on public.post_reactions for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id
                          and (p.user_id = (select auth.uid()) or public.are_friends(p.user_id, (select auth.uid())))));
drop policy if exists "reactions_delete_own" on public.post_reactions;
create policy "reactions_delete_own" on public.post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- 6. Private bucket for the photos: <owner uid>/<uuid>.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', false, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "posts_bucket_insert_own" on storage.objects;
create policy "posts_bucket_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "posts_bucket_delete_own" on storage.objects;
create policy "posts_bucket_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "posts_bucket_select_friends" on storage.objects;
create policy "posts_bucket_select_friends" on storage.objects for select to authenticated
  using (bucket_id = 'posts' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.are_friends(((storage.foldername(name))[1])::uuid, (select auth.uid()))
  ));
