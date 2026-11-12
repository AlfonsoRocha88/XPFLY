-- Performance: evaluate auth.uid() once per query instead of once per row in every RLS policy.
-- Same access rules; the call is only wrapped in a scalar subquery so Postgres caches it
-- (Supabase linter 0003 "auth_rls_initplan", 49 policies).
do $$
declare p record; q text; c text; stmt text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.uid\(\)'
  loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    c := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    stmt := format('alter policy %I on public.%I', p.policyname, p.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
    execute stmt;
  end loop;
end $$;

-- Covering index for the foreign key the linter flagged (0001 "unindexed_foreign_keys").
create index if not exists idx_clan_weekly_contributions_user_id
  on public.clan_weekly_contributions (user_id);
