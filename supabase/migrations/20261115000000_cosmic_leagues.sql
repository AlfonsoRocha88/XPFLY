-- Cosmic leagues: rename the stored league ids (thresholds unchanged).
-- hierro→asteroide, bronce→cometa, plata→luna, oro→mercurio, platino→marte, zafiro→tierra,
-- esmeralda→neptuno, rubi→saturno, amatista→jupiter, diamante→sol, onix→supernova, elite→galactica.

create or replace function pg_temp.cosmic_league(old_id text) returns text language sql immutable as $$
  select case
    when old_id is null then null
    when old_id = 'elite' then 'galactica'
    else coalesce((
      select m.new_family from (values
        ('hierro','asteroide'),('bronce','cometa'),('plata','luna'),('oro','mercurio'),
        ('platino','marte'),('zafiro','tierra'),('esmeralda','neptuno'),('rubi','saturno'),
        ('amatista','jupiter'),('diamante','sol'),('onix','supernova')
      ) as m(old_family, new_family)
      where m.old_family = split_part(old_id, '-', 1)
    ) || '-' || split_part(old_id, '-', 2), old_id)
  end
$$;

-- The rename is not a promotion: keep it out of league_changes (and its push notification).
alter table public.profiles disable trigger trg_log_league_change;
update public.profiles
  set current_league_id = pg_temp.cosmic_league(current_league_id)
  where current_league_id is not null and current_league_id !~ '^(asteroide|cometa|luna|mercurio|marte|tierra|neptuno|saturno|jupiter|sol|supernova)-[123]$' and current_league_id <> 'galactica';
alter table public.profiles enable trigger trg_log_league_change;

update public.league_changes
  set from_league_id = pg_temp.cosmic_league(from_league_id),
      to_league_id = pg_temp.cosmic_league(to_league_id);

alter table public.profiles alter column current_league_id set default 'asteroide-3';

-- Rivals: players in the caller's own league family (e.g. everyone in Saturno I–III).
create or replace function public.get_league_rivals(_limit integer default 50)
returns table(user_id uuid, username text, display_name text, avatar_url text, avatar_config jsonb, level integer, xp integer, trophies integer, highest_trophies integer, current_league_id text, equipped_title text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with me as (
    select split_part(coalesce(current_league_id, 'asteroide-3'), '-', 1) as family
    from public.profiles where user_id = (select auth.uid())
  )
  select p.user_id, p.username, p.display_name, p.avatar_url, p.avatar_config, p.level, p.xp, p.trophies, p.highest_trophies, p.current_league_id, p.equipped_title
  from public.profiles p, me
  where split_part(coalesce(p.current_league_id, 'asteroide-3'), '-', 1) = me.family
  order by p.trophies desc, p.xp desc
  limit greatest(1, least(coalesce(_limit, 50), 200));
$function$;

revoke all on function public.get_league_rivals(integer) from public, anon;
grant execute on function public.get_league_rivals(integer) to authenticated;
