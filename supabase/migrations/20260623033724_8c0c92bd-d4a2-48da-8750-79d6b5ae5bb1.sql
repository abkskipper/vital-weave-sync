
-- Hospitals
CREATE TABLE IF NOT EXISTS public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'pending',
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospitals_super_admin_all" ON public.hospitals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "hospitals_authenticated_read_active" ON public.hospitals
  FOR SELECT TO authenticated USING (status = 'active');
CREATE TRIGGER hospitals_set_updated_at BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Profile additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Platform settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all_auth" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_super_admin_write" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
INSERT INTO public.platform_settings (id, data) VALUES (true, '{"maintenance_mode": false}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

-- Announcements
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  target_role public.app_role,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_announcements TO authenticated;
GRANT ALL ON public.platform_announcements TO service_role;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_read_targeted" ON public.platform_announcements
  FOR SELECT TO authenticated
  USING (target_role IS NULL OR public.has_role(auth.uid(), target_role));
CREATE POLICY "ann_super_admin_write" ON public.platform_announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  status text NOT NULL DEFAULT 'success',
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_super_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);

-- Security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_super_admin_read" ON public.security_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events (created_at DESC);

-- Super-admin read on existing tables
CREATE POLICY "profiles_super_admin_read" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_super_admin_update" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_super_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "subscriptions_super_admin_read" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "payment_transactions_super_admin_read" ON public.payment_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "wallet_accounts_super_admin_read" ON public.wallet_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "wallet_transactions_super_admin_read" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "patients_super_admin_read" ON public.patients
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "vitals_super_admin_read" ON public.vitals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "appointments_super_admin_read" ON public.appointments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "alerts_super_admin_read" ON public.alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "medications_super_admin_read" ON public.medications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "med_admin_super_admin_read" ON public.medication_administrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Helper: list users (joins auth.users for email)
CREATE OR REPLACE FUNCTION public.admin_list_users(_limit int DEFAULT 100, _offset int DEFAULT 0, _search text DEFAULT NULL)
RETURNS TABLE (
  id uuid, email text, full_name text, status text, hospital_id uuid,
  created_at timestamptz, last_sign_in_at timestamptz, roles public.app_role[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, u.email::text, p.full_name, p.status, p.hospital_id, p.created_at, u.last_sign_in_at,
    COALESCE(ARRAY(SELECT role FROM public.user_roles WHERE user_id = p.id), ARRAY[]::public.app_role[])
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE public.has_role(auth.uid(), 'super_admin')
    AND (_search IS NULL OR p.full_name ILIKE '%'||_search||'%' OR u.email ILIKE '%'||_search||'%')
  ORDER BY p.created_at DESC
  LIMIT _limit OFFSET _offset
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(int, int, text) TO authenticated;
