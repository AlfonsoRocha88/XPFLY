ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_config jsonb NOT NULL DEFAULT '{
    "skinColor": "#f5d0a9",
    "hairStyle": "short",
    "hairColor": "#2b1810",
    "eyeStyle": "normal",
    "eyeColor": "#3b82f6",
    "faceStyle": "round",
    "height": 1.0,
    "outfit": "hunter"
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '{
    "hp": 10,
    "mp": 10,
    "str": 10,
    "int": 10,
    "spd": 10,
    "def": 10
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS stat_points_available integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stat_points_spent integer NOT NULL DEFAULT 0;