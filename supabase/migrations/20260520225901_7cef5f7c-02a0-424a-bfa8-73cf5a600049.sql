DROP TRIGGER IF EXISTS guard_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_privileged_columns();