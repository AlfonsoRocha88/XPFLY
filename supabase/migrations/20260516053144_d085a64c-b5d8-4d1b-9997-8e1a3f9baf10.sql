
DROP POLICY IF EXISTS "Authenticated can view public profile fields" ON public.profiles;
GRANT SELECT ON public.profiles_public TO authenticated, anon;

DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.type NOT IN ('local', 'self_reminder') THEN
    RAISE EXCEPTION 'Notification type % not allowed from client', NEW.type;
  END IF;
  IF NEW.data IS NOT NULL AND (NEW.data ? 'from_user_id' OR NEW.data ? 'sender' OR NEW.data ? 'system') THEN
    RAISE EXCEPTION 'Notification data may not include sender/system fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_notification_insert_trg ON public.notifications;
CREATE TRIGGER validate_notification_insert_trg
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.validate_notification_insert();

DROP POLICY IF EXISTS "Users can join clans" ON public.clan_members;

CREATE POLICY "Users can join open clans as member"
ON public.clan_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_members.clan_id
      AND c.join_type = 'open'
      AND c.member_count < c.max_members
  )
);

CREATE POLICY "Leaders can add members"
ON public.clan_members
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.clans c
    WHERE c.id = clan_members.clan_id
      AND c.leader_id = auth.uid()
      AND c.member_count < c.max_members
  )
);
