import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { evaluateVitals } from "@/lib/vitals-rules";

const searchSchema = z.object({ patient: z.string().optional() });

export const Route = createFileRoute("/_authenticated/vitals/new")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Record vitals — NurseGuard AI" }] }),
  component: NewVitals,
});

function NewVitals() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [patientId, setPatientId] = useState(search.patient ?? "");
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({
    heart_rate: "", systolic_bp: "", diastolic_bp: "", spo2: "",
    temperature_c: "", respiratory_rate: "", blood_sugar_mgdl: "", notes: "",
  });

  const patients = useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  useEffect(() => { if (!patientId && patients.data?.[0]) setPatientId(patients.data[0].id); }, [patients.data, patientId]);

  const submit = async () => {
    if (!patientId) { toast.error("Select a patient"); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      patient_id: patientId,
      recorded_by: u.user?.id,
      heart_rate: v.heart_rate ? parseInt(v.heart_rate) : null,
      systolic_bp: v.systolic_bp ? parseInt(v.systolic_bp) : null,
      diastolic_bp: v.diastolic_bp ? parseInt(v.diastolic_bp) : null,
      spo2: v.spo2 ? parseInt(v.spo2) : null,
      temperature_c: v.temperature_c ? parseFloat(v.temperature_c) : null,
      respiratory_rate: v.respiratory_rate ? parseInt(v.respiratory_rate) : null,
      blood_sugar_mgdl: v.blood_sugar_mgdl ? parseInt(v.blood_sugar_mgdl) : null,
      notes: v.notes || null,
    };
    const { error } = await supabase.from("vitals").insert(payload);
    if (error) { toast.error(error.message); setBusy(false); return; }

    // Evaluate rules and create alerts client-side too (server fn also runs)
    const issues = evaluateVitals(payload);
    if (issues.length) {
      await supabase.from("alerts").insert(issues.map((i) => ({
        patient_id: patientId,
        severity: i.severity,
        category: "vitals",
        title: i.title,
        body: i.body,
        source: "rule_engine",
      })));
    }
    toast.success("Vitals recorded");
    navigate({ to: "/patients/$id", params: { id: patientId } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Record vitals</h1>
      <Card className="p-5 space-y-4">
        <div>
          <Label>Patient</Label>
          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">— Select —</option>
            {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Heart rate (bpm)" value={v.heart_rate} onChange={(x) => setV({ ...v, heart_rate: x })} />
          <Field label="SpO₂ (%)" value={v.spo2} onChange={(x) => setV({ ...v, spo2: x })} />
          <Field label="Systolic BP" value={v.systolic_bp} onChange={(x) => setV({ ...v, systolic_bp: x })} />
          <Field label="Diastolic BP" value={v.diastolic_bp} onChange={(x) => setV({ ...v, diastolic_bp: x })} />
          <Field label="Temperature (°C)" value={v.temperature_c} onChange={(x) => setV({ ...v, temperature_c: x })} />
          <Field label="Resp. rate" value={v.respiratory_rate} onChange={(x) => setV({ ...v, respiratory_rate: x })} />
          <Field label="Blood sugar (mg/dL)" value={v.blood_sugar_mgdl} onChange={(x) => setV({ ...v, blood_sugar_mgdl: x })} />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Saving…" : "Save vitals"}</Button>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
