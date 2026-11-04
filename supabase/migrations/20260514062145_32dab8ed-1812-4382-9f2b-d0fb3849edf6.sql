-- Backfill pyro_power_level for existing users so they don't lose access to features
-- Tier thresholds: 0=L0, 3=L1, 10=L2, 25=L3, 50=L4, 100=L5
UPDATE public.profiles
SET pyro_power_level = CASE
  WHEN trophies >= 100 THEN 5
  WHEN trophies >= 50  THEN 4
  WHEN trophies >= 25  THEN 3
  WHEN trophies >= 10  THEN 2
  WHEN trophies >= 3   THEN 1
  ELSE 0
END
WHERE pyro_power_level = 0 AND trophies > 0;