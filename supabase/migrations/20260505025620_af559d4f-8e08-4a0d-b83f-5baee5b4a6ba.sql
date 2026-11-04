
-- Add theme to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system-cyan';

-- Clans table
CREATE TABLE IF NOT EXISTS public.clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL,
  name text NOT NULL,
  tag text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#3b82f6',
  max_members integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag)
);

ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view clans"
ON public.clans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create clans"
ON public.clans FOR INSERT TO authenticated WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their clan"
ON public.clans FOR UPDATE TO authenticated USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their clan"
ON public.clans FOR DELETE TO authenticated USING (auth.uid() = leader_id);

CREATE TRIGGER update_clans_updated_at
BEFORE UPDATE ON public.clans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clan members
CREATE TABLE IF NOT EXISTS public.clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clan_id, user_id),
  UNIQUE(user_id)
);

ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view clan members"
ON public.clan_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join clans"
ON public.clan_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave or leader can kick"
ON public.clan_members FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.leader_id = auth.uid())
);

-- Auto-add leader as member when clan is created
CREATE OR REPLACE FUNCTION public.add_clan_leader_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.clan_members (clan_id, user_id, role)
  VALUES (NEW.id, NEW.leader_id, 'leader');
  RETURN NEW;
END;
$$;

CREATE TRIGGER add_leader_to_clan
AFTER INSERT ON public.clans
FOR EACH ROW EXECUTE FUNCTION public.add_clan_leader_as_member();
