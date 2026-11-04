-- Ensure client-created notifications cannot spoof system or sender metadata
CREATE OR REPLACE FUNCTION public.validate_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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

-- Tighten the notification insert policy so the allowed client types are explicit in RLS too
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own local notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type IN ('local', 'self_reminder')
  AND (
    data IS NULL
    OR NOT (
      data ? 'from_user_id'
      OR data ? 'sender'
      OR data ? 'system'
    )
  )
);

-- Make public avatar readability explicit while keeping write access owner-scoped
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');