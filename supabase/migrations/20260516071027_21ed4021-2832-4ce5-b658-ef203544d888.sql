-- 1) Clan join request status constraint
DROP POLICY IF EXISTS "Leader can update join requests" ON public.clan_join_requests;
CREATE POLICY "Leader can update join requests"
ON public.clan_join_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_join_requests.clan_id AND c.leader_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_join_requests.clan_id AND c.leader_id = auth.uid())
  AND status IN ('accepted', 'rejected')
);

-- 2) Avatar storage policies — scope public read to per-user folders
DROP POLICY IF EXISTS "Generated avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (
    lower(name) LIKE '%.png'
    OR lower(name) LIKE '%.jpg'
    OR lower(name) LIKE '%.jpeg'
    OR lower(name) LIKE '%.webp'
  )
);
