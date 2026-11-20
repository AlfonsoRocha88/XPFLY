-- Advisor / audit fixes (2026-11-20). Safe and idempotent: no tables, columns, data or RLS
-- policies are dropped, and nothing changes who can read or write what.
--
-- What the Supabase advisors reported and why most of it needs no SQL:
--   * security: every SECURITY DEFINER function already has `search_path = public`, and none
--     is executable by `anon`. The 15 flagged as "executable by authenticated" are meant to be
--     called by signed-in users (RPCs the app uses, or helpers used inside RLS policies such as
--     is_clan_member / is_party_member / are_friends), so their grants stay as they are.
--   * security: friend_invites and xp_awards have RLS on and no policies on purpose (only
--     SECURITY DEFINER functions and edge functions with the service role touch them).
--   * performance: no unindexed foreign keys and no `auth.uid()` re-evaluated per row
--     (all policies already use `(select auth.uid())`).
-- Left for a manual decision (not in this file): pg_net installed in `public`, leaked password
-- protection (Auth dashboard setting), and the two permissive INSERT policies on clan_members.

-- 1) profiles had the same guard trigger installed twice under two names; both run
--    guard_profile_privileged_columns() BEFORE UPDATE, so every client update did the work
--    twice. Keep `guard_profile_privileged_columns`, drop the copy. Protection is unchanged.
DROP TRIGGER IF EXISTS guard_profile_privileged_columns_trg ON public.profiles;

-- 2) Duplicate / redundant indexes (none backs a constraint):
--    profiles_username_unique_ci is the same unique index on lower(username) as
--    profiles_username_lower_idx (the partial WHERE username IS NOT NULL adds nothing: NULLs
--    never collide in a unique index). Uniqueness of usernames stays enforced.
DROP INDEX IF EXISTS public.profiles_username_unique_ci;

--    idx_tasks_user_id (user_id) is a prefix of idx_tasks_start_time (user_id, start_time),
--    which serves the same lookups and the tasks.user_id foreign key.
DROP INDEX IF EXISTS public.idx_tasks_user_id;

--    idx_clan_join_requests_clan (clan_id) is a prefix of the unique
--    clan_join_requests_clan_id_user_id_key (clan_id, user_id); the advisor also reports it unused.
DROP INDEX IF EXISTS public.idx_clan_join_requests_clan;

-- 3) cron-worker "mission-reminders" runs every minute and filters tasks by start_time across
--    all users with status <> 'done'. The only start_time index leads with user_id, so that
--    query scans the whole tasks table each minute. A small partial index fixes it.
CREATE INDEX IF NOT EXISTS idx_tasks_pending_start_time
  ON public.tasks (start_time)
  WHERE status <> 'done' AND start_time IS NOT NULL;
