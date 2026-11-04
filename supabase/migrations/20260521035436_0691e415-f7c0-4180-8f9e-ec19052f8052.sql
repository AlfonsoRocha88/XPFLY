
-- Delete data for the three users
DO $$
DECLARE
  uids uuid[] := ARRAY[
    '1f2fefc8-d3c2-4280-b175-584e33ef8ea3'::uuid, -- rocha
    '817525f7-23bc-42d5-b375-de814d058db7'::uuid, -- alfonso
    '8f2be98b-c2be-4dda-a4dd-8bf125e05c2d'::uuid  -- juanito
  ];
BEGIN
  DELETE FROM public.clan_messages WHERE user_id = ANY(uids);
  DELETE FROM public.clan_activity WHERE user_id = ANY(uids);
  DELETE FROM public.clan_join_requests WHERE user_id = ANY(uids);
  DELETE FROM public.clan_members WHERE user_id = ANY(uids);
  DELETE FROM public.clans WHERE leader_id = ANY(uids);
  DELETE FROM public.party_members WHERE user_id = ANY(uids);
  DELETE FROM public.parties WHERE leader_id = ANY(uids);
  DELETE FROM public.friendships WHERE user_id = ANY(uids) OR friend_id = ANY(uids);
  DELETE FROM public.notifications WHERE user_id = ANY(uids);
  DELETE FROM public.tasks WHERE user_id = ANY(uids);
  DELETE FROM public.projects WHERE user_id = ANY(uids);
  DELETE FROM public.league_changes WHERE user_id = ANY(uids);
  DELETE FROM public.profiles WHERE user_id = ANY(uids);
  DELETE FROM auth.users WHERE id = ANY(uids);
END $$;

-- Enforce unique usernames (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_ci
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;
