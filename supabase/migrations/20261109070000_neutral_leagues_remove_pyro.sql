-- 1) Leagues renamed from fantasy ranks to metals and stones (same trophy thresholds).
-- Act as service_role for this transaction so guard_profile_privileged_columns lets the rename through.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true),
       set_config('request.jwt.claim.role', 'service_role', true);

CREATE OR REPLACE FUNCTION pg_temp.rename_league(id text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN id IS NULL THEN NULL
    WHEN id = 'singularidad' THEN 'elite'
    ELSE COALESCE(
      (SELECT new || substring(id FROM '-\d$')
         FROM (VALUES ('mortal','hierro'), ('guerrero','bronce'), ('caballero','plata'), ('heroe','oro'),
                      ('campeon','platino'), ('leyenda','zafiro'), ('rey','esmeralda'), ('emperador','rubi'),
                      ('dios','amatista'), ('titan','diamante'), ('primordial','onix')) AS m(old, new)
        WHERE regexp_replace(id, '-\d$', '') = m.old),
      id)
  END;
$$;

ALTER TABLE public.profiles ALTER COLUMN current_league_id SET DEFAULT 'hierro-3';
UPDATE public.profiles SET current_league_id = pg_temp.rename_league(current_league_id);
UPDATE public.league_changes
   SET from_league_id = pg_temp.rename_league(from_league_id),
       to_league_id = pg_temp.rename_league(to_league_id);

-- 2) Pyro removed: drop its hunger reminder job if it was scheduled (see supabase/setup/cron.sql).
DO $$ BEGIN
  PERFORM cron.unschedule('xpfly-pyro-hunger');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
