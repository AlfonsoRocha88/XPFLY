-- One-tap friend invites (QR / WhatsApp link).
-- friend_code is public (searchable by username), so it can't grant instant friendship on its own.
-- Each user gets a private random invite key; a link carrying code + key proves the owner shared it,
-- and opening it makes both people friends right away, with no request to accept.

CREATE TABLE IF NOT EXISTS public.friend_invites (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER functions below touch it.

-- My invite key (created on first use).
CREATE OR REPLACE FUNCTION public.get_my_friend_invite()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.friend_invites (user_id) VALUES ((SELECT auth.uid())) ON CONFLICT (user_id) DO NOTHING;
  SELECT key INTO k FROM public.friend_invites WHERE user_id = (SELECT auth.uid());
  RETURN k;
END $$;

-- New key: old links and QR codes stop working.
CREATE OR REPLACE FUNCTION public.reset_my_friend_invite()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.friend_invites (user_id, key) VALUES ((SELECT auth.uid()), k)
  ON CONFLICT (user_id) DO UPDATE SET key = EXCLUDED.key, created_at = now();
  RETURN k;
END $$;

-- Open someone's invite: become friends now. Returns status + who.
--   added | already | self | invalid
CREATE OR REPLACE FUNCTION public.accept_friend_invite(_code text, _key text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  inviter uuid;
  inviter_name text;
  my_name text;
  existing record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT p.user_id, coalesce(p.display_name, p.username, 'Alguien')
    INTO inviter, inviter_name
  FROM public.profiles p
  JOIN public.friend_invites fi ON fi.user_id = p.user_id
  WHERE p.friend_code = upper(trim(_code)) AND fi.key = trim(_key);

  IF inviter IS NULL THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF inviter = me THEN RETURN jsonb_build_object('status', 'self'); END IF;

  SELECT id, status INTO existing FROM public.friendships
  WHERE (user_id = me AND friend_id = inviter) OR (user_id = inviter AND friend_id = me)
  LIMIT 1;

  IF existing.id IS NOT NULL AND existing.status = 'accepted' THEN
    RETURN jsonb_build_object('status', 'already', 'user_id', inviter, 'name', inviter_name);
  END IF;

  IF existing.id IS NOT NULL THEN
    UPDATE public.friendships SET status = 'accepted', updated_at = now() WHERE id = existing.id;
  ELSE
    INSERT INTO public.friendships (user_id, friend_id, status) VALUES (me, inviter, 'accepted');
  END IF;

  SELECT coalesce(display_name, username, 'Alguien') INTO my_name FROM public.profiles WHERE user_id = me;
  INSERT INTO public.notifications (user_id, type, message, data)
  VALUES (inviter, 'friend_added', my_name || ' abrió tu invitación: ya son amigos', jsonb_build_object('from_user_id', me));

  RETURN jsonb_build_object('status', 'added', 'user_id', inviter, 'name', inviter_name);
END $$;

REVOKE EXECUTE ON FUNCTION public.get_my_friend_invite() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_my_friend_invite() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_friend_invite(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_friend_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_my_friend_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_invite(text, text) TO authenticated;
