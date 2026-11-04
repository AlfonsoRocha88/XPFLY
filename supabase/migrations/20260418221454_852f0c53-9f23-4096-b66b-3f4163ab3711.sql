ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS recurrence_interval integer,
  ADD COLUMN IF NOT EXISTS recurrence_unit text CHECK (recurrence_unit IN ('hour','day','week','month')),
  ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON public.tasks(user_id, start_time);