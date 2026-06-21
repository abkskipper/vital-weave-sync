
-- =========================================================
-- ROLES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('nurse','doctor','patient','caregiver','admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_clinician(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('nurse','doctor','admin')
  )
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users self-assign initial role" ON public.user_roles FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage all roles" ON public.user_roles FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- TIMESTAMP HELPER
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  organization text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all profiles (clinicians)" ON public.profiles FOR SELECT
  TO authenticated USING (public.is_clinician(auth.uid()) OR id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- PATIENTS
-- =========================================================
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  date_of_birth date,
  sex text CHECK (sex IN ('male','female','other')),
  phone text,
  address text,
  blood_type text,
  allergies text,
  medical_history text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER patients_updated BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinician_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, clinician_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.patient_assignments TO authenticated;
GRANT ALL ON public.patient_assignments TO service_role;
ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.caregiver_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, caregiver_id)
);
GRANT SELECT, INSERT, DELETE ON public.caregiver_links TO authenticated;
GRANT ALL ON public.caregiver_links TO service_role;
ALTER TABLE public.caregiver_links ENABLE ROW LEVEL SECURITY;

-- Helper: can current user see this patient?
CREATE OR REPLACE FUNCTION public.can_access_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id,'admin')
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND p.user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.patient_assignments a WHERE a.patient_id = _patient_id AND a.clinician_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.caregiver_links c WHERE c.patient_id = _patient_id AND c.caregiver_id = _user_id)
$$;

CREATE POLICY "patients access" ON public.patients FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), id));
CREATE POLICY "clinicians create patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "clinicians update patients" ON public.patients FOR UPDATE TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), id))
  WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "admins delete patients" ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "assignments view" ON public.patient_assignments FOR SELECT TO authenticated
  USING (clinician_id = auth.uid() OR public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "assignments create (clinician)" ON public.patient_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "assignments delete (admin)" ON public.patient_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "caregiver links view" ON public.caregiver_links FOR SELECT TO authenticated
  USING (caregiver_id = auth.uid() OR public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "caregiver links create" ON public.caregiver_links FOR INSERT TO authenticated
  WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "caregiver links delete" ON public.caregiver_links FOR DELETE TO authenticated
  USING (public.is_clinician(auth.uid()));

-- =========================================================
-- EMERGENCY CONTACTS
-- =========================================================
CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text,
  phone text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency view" ON public.emergency_contacts FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "emergency write" ON public.emergency_contacts FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- =========================================================
-- VITALS
-- =========================================================
CREATE TABLE public.vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES auth.users(id),
  heart_rate int,
  systolic_bp int,
  diastolic_bp int,
  spo2 int,
  temperature_c numeric(4,1),
  respiratory_rate int,
  blood_sugar_mgdl int,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
CREATE INDEX vitals_patient_recorded_idx ON public.vitals (patient_id, recorded_at DESC);
CREATE POLICY "vitals view" ON public.vitals FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "vitals insert (clinician)" ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "vitals update (clinician)" ON public.vitals FOR UPDATE TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- =========================================================
-- MEDICATIONS
-- =========================================================
CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  route text,
  frequency text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  instructions text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER medications_updated BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "meds view" ON public.medications FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "meds write (clinician)" ON public.medications FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

CREATE TABLE public.medication_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  administered_by uuid REFERENCES auth.users(id),
  status text NOT NULL CHECK (status IN ('given','missed','refused','held')) DEFAULT 'given',
  scheduled_for timestamptz,
  administered_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_administrations TO authenticated;
GRANT ALL ON public.medication_administrations TO service_role;
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "med admin view" ON public.medication_administrations FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "med admin write" ON public.medication_administrations FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- =========================================================
-- APPOINTMENTS
-- =========================================================
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinician_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  status text NOT NULL CHECK (status IN ('scheduled','completed','cancelled','rescheduled')) DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER appts_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "appts view" ON public.appointments FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id) OR clinician_id = auth.uid());
CREATE POLICY "appts write" ON public.appointments FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()))
  WITH CHECK (public.is_clinician(auth.uid()));

-- =========================================================
-- NURSING NOTES / CARE PLANS / HANDOVERS
-- =========================================================
CREATE TABLE public.nursing_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursing_notes TO authenticated;
GRANT ALL ON public.nursing_notes TO service_role;
ALTER TABLE public.nursing_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes view" ON public.nursing_notes FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "notes write" ON public.nursing_notes FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

CREATE TABLE public.care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  goals text,
  interventions text,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_plans TO authenticated;
GRANT ALL ON public.care_plans TO service_role;
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER care_plans_updated BEFORE UPDATE ON public.care_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "care plans view" ON public.care_plans FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "care plans write" ON public.care_plans FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

CREATE TABLE public.shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  from_user uuid REFERENCES auth.users(id),
  to_user uuid REFERENCES auth.users(id),
  summary text NOT NULL,
  shift_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_handovers TO authenticated;
GRANT ALL ON public.shift_handovers TO service_role;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handover view" ON public.shift_handovers FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "handover write" ON public.shift_handovers FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- =========================================================
-- ALERTS
-- =========================================================
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical','emergency')) DEFAULT 'warning',
  category text NOT NULL,
  title text NOT NULL,
  body text,
  source text,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX alerts_patient_created_idx ON public.alerts (patient_id, created_at DESC);
CREATE POLICY "alerts view" ON public.alerts FOR SELECT TO authenticated
  USING (patient_id IS NULL OR public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "alerts insert" ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "alerts ack" ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_clinician(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER TABLE public.vitals REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
