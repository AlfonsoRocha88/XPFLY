ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unlocked_outfits text[] NOT NULL DEFAULT ARRAY['hunter','casual']::text[],
  ADD COLUMN IF NOT EXISTS current_class text,
  ADD COLUMN IF NOT EXISTS current_class_tier integer NOT NULL DEFAULT 0;