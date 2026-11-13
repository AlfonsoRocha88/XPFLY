-- Nebulosa becomes the free default background for everyone.
alter table public.profiles alter column wallpaper set default 'living-nebulosa';
update public.profiles set wallpaper = 'living-nebulosa' where wallpaper is null or wallpaper = 'default';

-- Only the premium living backgrounds (not the free Nebulosa) require a purchase.
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
