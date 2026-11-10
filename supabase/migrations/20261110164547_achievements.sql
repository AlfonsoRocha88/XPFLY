-- Achievements: server-computed metrics, claimed tiers (coins), and avatar frames.
-- Catalog and thresholds live in supabase/functions/_shared/achievements.ts.

-- ---------------- Claimed tiers ----------------
create table public.achievement_unlocks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  tier smallint not null check (tier between 1 and 3),
  coins int not null default 0,
  claimed_at timestamptz not null default now(),
  unique (user_id, achievement_id, tier)
);
alter table public.achievement_unlocks enable row level security;
create policy "achievement_unlocks: read own" on public.achievement_unlocks
  for select to authenticated using (user_id = auth.uid());
-- Only the claim-achievement edge function (service role) writes here.
grant select on public.achievement_unlocks to authenticated;
grant all on public.achievement_unlocks to service_role;

-- ---------------- Avatar frames ----------------
alter table public.profiles
  add column unlocked_frames text[] not null default '{}',
  add column equipped_frame text;

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

-- ---------------- Metrics ----------------
-- All counters an achievement can use, in the user's local time zone.
create or replace function public.achievement_metrics(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with prof as (
  select coalesce(nullif(timezone, ''), 'UTC') as tz, level, highest_trophies
  from profiles where user_id = p_user
),
a as (
  select (x.created_at at time zone (select tz from prof)) as ts,
         coalesce(x.day, (x.created_at at time zone (select tz from prof))::date) as d,
         t.priority::text as priority,
         coalesce(t.is_daily, x.day is not null) as is_daily,
         coalesce(t.tags, '{}') as tags
  from xp_awards x
  left join tasks t on t.id = x.task_id
  where x.user_id = p_user and x.flagged is null
),
days as (select distinct d from a),
islands as (select d - (row_number() over (order by d))::int as grp from days),
weeks as (
  select date_trunc('week', d) w from days group by 1 having count(*) = 7
),
per_day as (select count(*) c from a group by d),
per_hour as (
  select count(*) over (order by ts range between current row and interval '59 minutes 59 seconds' following) c from a
),
tag_counts as (
  select tg, count(*) c
  from (
    select translate(lower(btrim(ltrim(u, '#'))), 'áéíóúüñ', 'aeiouun') tg
    from a, unnest(a.tags) u
  ) s
  where tg !~ ':'
  group by tg
),
sleep as (
  select count(*) nights,
         count(*) filter (where sleep_minutes between 420 and 540) good
  from daily_logs where user_id = p_user and sleep_minutes is not null
)
select jsonb_build_object(
  'total', (select count(*) from a),
  'habits', (select count(*) from a where is_daily),
  'before9', (select count(*) from a where extract(hour from ts) < 9 and extract(hour from ts) >= 4),
  'before6', (select count(*) from a where extract(hour from ts) < 6 and extract(hour from ts) >= 4),
  'midday', (select count(*) from a where extract(hour from ts) between 12 and 13),
  'after22', (select count(*) from a where extract(hour from ts) >= 22 or extract(hour from ts) < 4),
  'weekend', (select count(*) from a where extract(isodow from d) in (6, 7)),
  'urgent', (select count(*) from a where not is_daily and priority = 'urgent'),
  'high', (select count(*) from a where not is_daily and priority = 'high'),
  'activeDays', (select count(*) from days),
  'bestStreak', coalesce((select max(c) from (select count(*) c from islands group by grp) s), 0),
  'fullWeeks', (select count(*) from weeks),
  'maxInHour', coalesce((select max(c) from per_hour), 0),
  'maxInDay', coalesce((select max(c) from per_day), 0),
  'sleepNights', (select nights from sleep),
  'goodSleepNights', (select good from sleep),
  'tags', coalesce((select jsonb_object_agg(tg, c) from tag_counts), '{}'::jsonb),
  'level', coalesce((select level from prof), 1),
  'highestTrophies', coalesce((select highest_trophies from prof), 0),
  'friends', (select count(*) from friendships f where f.status = 'accepted' and (f.user_id = p_user or f.friend_id = p_user)),
  'clanMember', (select count(*) from clan_members m where m.user_id = p_user),
  'clanContributions', coalesce((select sum(count) from clan_weekly_contributions c where c.user_id = p_user), 0)
);
$$;

revoke execute on function public.achievement_metrics(uuid) from public, anon, authenticated;
grant execute on function public.achievement_metrics(uuid) to service_role;

-- The caller's own metrics, for the app.
create or replace function public.get_my_achievement_metrics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$ select public.achievement_metrics(auth.uid()) $$;

revoke execute on function public.get_my_achievement_metrics() from public, anon;
grant execute on function public.get_my_achievement_metrics() to authenticated;
