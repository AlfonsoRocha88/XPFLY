
-- Add wallpaper and friend_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallpaper text DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

-- Friendships table
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships sent to them"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parties table
CREATE TABLE public.parties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  leader_id uuid NOT NULL,
  max_members integer NOT NULL DEFAULT 4,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Party members table
CREATE TABLE public.party_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;

-- Now add policies for parties (party_members exists now)
CREATE POLICY "Party members can view their party"
  ON public.parties FOR SELECT
  USING (
    leader_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.party_members WHERE party_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create parties"
  ON public.parties FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their party"
  ON public.parties FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their party"
  ON public.parties FOR DELETE
  USING (auth.uid() = leader_id);

-- Party members policies
CREATE POLICY "Members can view party members"
  ON public.party_members FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.parties WHERE id = party_id AND leader_id = auth.uid())
  );

CREATE POLICY "Leaders can invite members"
  ON public.party_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.parties WHERE id = party_id AND leader_id = auth.uid())
  );

CREATE POLICY "Users can update their own membership"
  ON public.party_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can remove members"
  ON public.party_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.parties WHERE id = party_id AND leader_id = auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_members;
