
-- MATERNAL RECORDS
CREATE TABLE public.maternal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  lmp DATE,
  edd DATE,
  gravida INT,
  para INT,
  risk_level TEXT NOT NULL DEFAULT 'low',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maternal_records TO authenticated;
GRANT ALL ON public.maternal_records TO service_role;
ALTER TABLE public.maternal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maternal_select" ON public.maternal_records FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "maternal_write" ON public.maternal_records FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));
CREATE TRIGGER maternal_set_updated_at BEFORE UPDATE ON public.maternal_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ANTENATAL VISITS
CREATE TABLE public.antenatal_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maternal_id UUID NOT NULL REFERENCES public.maternal_records(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gestational_age_weeks INT,
  fundal_height_cm NUMERIC(5,2),
  fetal_heart_rate INT,
  systolic_bp INT,
  diastolic_bp INT,
  weight_kg NUMERIC(5,2),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.antenatal_visits TO authenticated;
GRANT ALL ON public.antenatal_visits TO service_role;
ALTER TABLE public.antenatal_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anc_select" ON public.antenatal_visits FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "anc_write" ON public.antenatal_visits FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- CHILD RECORDS
CREATE TABLE public.child_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  age_months INT,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  head_circumference_cm NUMERIC(5,2),
  muac_cm NUMERIC(5,2),
  milestone_notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_records TO authenticated;
GRANT ALL ON public.child_records TO service_role;
ALTER TABLE public.child_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_select" ON public.child_records FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "child_write" ON public.child_records FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- IMMUNIZATIONS
CREATE TABLE public.immunizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine TEXT NOT NULL,
  dose_label TEXT,
  administered_on DATE,
  next_due_on DATE,
  lot_number TEXT,
  site TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.immunizations TO authenticated;
GRANT ALL ON public.immunizations TO service_role;
ALTER TABLE public.immunizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imm_select" ON public.immunizations FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "imm_write" ON public.immunizations FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- MENTAL HEALTH SCREENINGS
CREATE TABLE public.mental_health_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  score INT NOT NULL,
  severity TEXT NOT NULL,
  responses JSONB,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mental_health_screenings TO authenticated;
GRANT ALL ON public.mental_health_screenings TO service_role;
ALTER TABLE public.mental_health_screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_select" ON public.mental_health_screenings FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id));
CREATE POLICY "mh_write" ON public.mental_health_screenings FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id))
  WITH CHECK (public.is_clinician(auth.uid()) AND public.can_access_patient(auth.uid(), patient_id));

-- HOME CARE VISITS
CREATE TABLE public.home_care_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinician_id UUID,
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  tasks JSONB,
  summary TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_care_visits TO authenticated;
GRANT ALL ON public.home_care_visits TO service_role;
ALTER TABLE public.home_care_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hcv_select" ON public.home_care_visits FOR SELECT TO authenticated
  USING (public.can_access_patient(auth.uid(), patient_id) OR clinician_id = auth.uid());
CREATE POLICY "hcv_write" ON public.home_care_visits FOR ALL TO authenticated
  USING (public.is_clinician(auth.uid()) AND (clinician_id = auth.uid() OR public.can_access_patient(auth.uid(), patient_id)))
  WITH CHECK (public.is_clinician(auth.uid()) AND (clinician_id = auth.uid() OR public.can_access_patient(auth.uid(), patient_id)));
CREATE TRIGGER hcv_set_updated_at BEFORE UPDATE ON public.home_care_visits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
