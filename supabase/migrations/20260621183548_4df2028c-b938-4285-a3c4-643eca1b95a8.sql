
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinician(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinician(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) TO authenticated, service_role;
