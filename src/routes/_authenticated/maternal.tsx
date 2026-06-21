import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Baby } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/maternal")({
  head: () => ({ meta: [{ title: "Maternal & Child — NurseGuard AI" }] }),
  component: MaternalPage,
});

function MaternalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Baby className="h-6 w-6 text-primary" />Maternal & Child Health</h1>
        <p className="text-sm text-muted-foreground">Pregnancies, antenatal visits, growth tracking, and immunizations.</p>
      </div>
      <Tabs defaultValue="maternal">
        <TabsList>
          <TabsTrigger value="maternal">Pregnancies</TabsTrigger>
          <TabsTrigger value="anc">Antenatal visits</TabsTrigger>
          <TabsTrigger value="child">Child growth</TabsTrigger>
          <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
        </TabsList>
        <TabsContent value="maternal" className="mt-4"><MaternalList /></TabsContent>
        <TabsContent value="anc" className="mt-4"><AncList /></TabsContent>
        <TabsContent value="child" className="mt-4"><ChildList /></TabsContent>
        <TabsContent value="immunizations" className="mt-4"><ImmunizationList /></TabsContent>
      </Tabs>
    </div>
  );
}

function usePatients() {
  return useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").order("full_name")).data ?? [],
  });
}

function MaternalList() {
  const qc = useQueryClient();
  const patients = usePatients();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", lmp: "", edd: "", gravida: "", para: "", risk_level: "low", notes: "" });

  const records = useQuery({
    queryKey: ["maternal-records"],
    queryFn: async () => {
      const { data } = await supabase.from("maternal_records")
        .select("id, lmp, edd, gravida, para, risk_level, active, patient_id, patients(full_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = async () => {
    if (!form.patient_id) { toast.error("Select a patient"); return; }
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      patient_id: form.patient_id,
      lmp: form.lmp || null,
      edd: form.edd || null,
      gravida: form.gravida ? parseInt(form.gravida) : null,
      para: form.para ? parseInt(form.para) : null,
      risk_level: form.risk_level,
      notes: form.notes || null,
      created_by: u.user?.id,
    };
    const { error } = await supabase.from("maternal_records").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Pregnancy record added");
    setOpen(false);
    setForm({ patient_id: "", lmp: "", edd: "", gravida: "", para: "", risk_level: "low", notes: "" });
    qc.invalidateQueries({ queryKey: ["maternal-records"] });
  };

  const riskColor = (r: string) => r === "high" ? "destructive" : r === "moderate" ? "default" : "secondary";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New pregnancy record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New pregnancy record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patient</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>LMP</Label><Input type="date" value={form.lmp} onChange={(e) => setForm({ ...form, lmp: e.target.value })} /></div>
                <div><Label>EDD</Label><Input type="date" value={form.edd} onChange={(e) => setForm({ ...form, edd: e.target.value })} /></div>
                <div><Label>Gravida</Label><Input value={form.gravida} onChange={(e) => setForm({ ...form, gravida: e.target.value })} /></div>
                <div><Label>Para</Label><Input value={form.para} onChange={(e) => setForm({ ...form, para: e.target.value })} /></div>
              </div>
              <div><Label>Risk</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
                  <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
                </select>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {records.data?.length ? records.data.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex-1 min-w-[200px]">
            <p className="font-medium">{(r as any).patients?.full_name}</p>
            <p className="text-xs text-muted-foreground">EDD {r.edd ?? "—"} · G{r.gravida ?? "?"} P{r.para ?? "?"}</p>
          </div>
          <Badge variant={riskColor(r.risk_level) as any}>{r.risk_level} risk</Badge>
        </Card>
      )) : <Card className="p-10 text-center text-muted-foreground">No pregnancy records yet.</Card>}
    </div>
  );
}

function AncList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ maternal_id: "", visit_date: new Date().toISOString().slice(0, 10), gestational_age_weeks: "", fundal_height_cm: "", fetal_heart_rate: "", systolic_bp: "", diastolic_bp: "", weight_kg: "", notes: "" });

  const mothers = useQuery({
    queryKey: ["mothers-active"],
    queryFn: async () => (await supabase.from("maternal_records").select("id, patient_id, patients(full_name)").eq("active", true)).data ?? [],
  });
  const visits = useQuery({
    queryKey: ["anc-visits"],
    queryFn: async () => (await supabase.from("antenatal_visits").select("*, patients(full_name)").order("visit_date", { ascending: false }).limit(50)).data ?? [],
  });

  const create = async () => {
    const mom = mothers.data?.find((m) => m.id === form.maternal_id);
    if (!mom) { toast.error("Select a pregnancy"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("antenatal_visits").insert({
      maternal_id: mom.id, patient_id: mom.patient_id, visit_date: form.visit_date,
      gestational_age_weeks: form.gestational_age_weeks ? parseInt(form.gestational_age_weeks) : null,
      fundal_height_cm: form.fundal_height_cm ? parseFloat(form.fundal_height_cm) : null,
      fetal_heart_rate: form.fetal_heart_rate ? parseInt(form.fetal_heart_rate) : null,
      systolic_bp: form.systolic_bp ? parseInt(form.systolic_bp) : null,
      diastolic_bp: form.diastolic_bp ? parseInt(form.diastolic_bp) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      notes: form.notes || null, recorded_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Antenatal visit recorded");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["anc-visits"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record visit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Antenatal visit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Pregnancy</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.maternal_id} onChange={(e) => setForm({ ...form, maternal_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {mothers.data?.map((m) => <option key={m.id} value={m.id}>{(m as any).patients?.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Visit date</Label><Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></div>
                <div><Label>GA (weeks)</Label><Input value={form.gestational_age_weeks} onChange={(e) => setForm({ ...form, gestational_age_weeks: e.target.value })} /></div>
                <div><Label>Fundal ht (cm)</Label><Input value={form.fundal_height_cm} onChange={(e) => setForm({ ...form, fundal_height_cm: e.target.value })} /></div>
                <div><Label>FHR (bpm)</Label><Input value={form.fetal_heart_rate} onChange={(e) => setForm({ ...form, fetal_heart_rate: e.target.value })} /></div>
                <div><Label>Systolic</Label><Input value={form.systolic_bp} onChange={(e) => setForm({ ...form, systolic_bp: e.target.value })} /></div>
                <div><Label>Diastolic</Label><Input value={form.diastolic_bp} onChange={(e) => setForm({ ...form, diastolic_bp: e.target.value })} /></div>
                <div><Label>Weight (kg)</Label><Input value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Save visit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {visits.data?.length ? visits.data.map((v) => (
        <Card key={v.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{(v as any).patients?.full_name}</p>
            <span className="text-xs text-muted-foreground">{v.visit_date} · GA {v.gestational_age_weeks ?? "?"}w</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">BP {v.systolic_bp ?? "?"}/{v.diastolic_bp ?? "?"} · FHR {v.fetal_heart_rate ?? "?"} · Fundal {v.fundal_height_cm ?? "?"}cm · Wt {v.weight_kg ?? "?"}kg</p>
          {v.notes && <p className="mt-1 text-sm">{v.notes}</p>}
        </Card>
      )) : <Card className="p-10 text-center text-muted-foreground">No antenatal visits yet.</Card>}
    </div>
  );
}

function ChildList() {
  const qc = useQueryClient();
  const patients = usePatients();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", visit_date: new Date().toISOString().slice(0, 10), age_months: "", weight_kg: "", height_cm: "", head_circumference_cm: "", muac_cm: "", milestone_notes: "" });

  const records = useQuery({
    queryKey: ["child-records"],
    queryFn: async () => (await supabase.from("child_records").select("*, patients(full_name)").order("visit_date", { ascending: false }).limit(50)).data ?? [],
  });

  const create = async () => {
    if (!form.patient_id) { toast.error("Select a child"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("child_records").insert({
      patient_id: form.patient_id, visit_date: form.visit_date,
      age_months: form.age_months ? parseInt(form.age_months) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      head_circumference_cm: form.head_circumference_cm ? parseFloat(form.head_circumference_cm) : null,
      muac_cm: form.muac_cm ? parseFloat(form.muac_cm) : null,
      milestone_notes: form.milestone_notes || null, recorded_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Growth recorded");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["child-records"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record growth</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Child growth record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Child</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Visit date</Label><Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></div>
                <div><Label>Age (months)</Label><Input value={form.age_months} onChange={(e) => setForm({ ...form, age_months: e.target.value })} /></div>
                <div><Label>Weight (kg)</Label><Input value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
                <div><Label>Height (cm)</Label><Input value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></div>
                <div><Label>Head circ. (cm)</Label><Input value={form.head_circumference_cm} onChange={(e) => setForm({ ...form, head_circumference_cm: e.target.value })} /></div>
                <div><Label>MUAC (cm)</Label><Input value={form.muac_cm} onChange={(e) => setForm({ ...form, muac_cm: e.target.value })} /></div>
              </div>
              <div><Label>Milestone notes</Label><Textarea rows={3} value={form.milestone_notes} onChange={(e) => setForm({ ...form, milestone_notes: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {records.data?.length ? records.data.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{(r as any).patients?.full_name}</p>
            <span className="text-xs text-muted-foreground">{r.visit_date} · {r.age_months ?? "?"}mo</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Wt {r.weight_kg ?? "?"}kg · Ht {r.height_cm ?? "?"}cm · HC {r.head_circumference_cm ?? "?"}cm · MUAC {r.muac_cm ?? "?"}cm</p>
          {r.milestone_notes && <p className="mt-1 text-sm">{r.milestone_notes}</p>}
        </Card>
      )) : <Card className="p-10 text-center text-muted-foreground">No growth records yet.</Card>}
    </div>
  );
}

function ImmunizationList() {
  const qc = useQueryClient();
  const patients = usePatients();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", vaccine: "", dose_label: "", administered_on: new Date().toISOString().slice(0, 10), next_due_on: "", lot_number: "", site: "", notes: "" });

  const list = useQuery({
    queryKey: ["immunizations"],
    queryFn: async () => (await supabase.from("immunizations").select("*, patients(full_name)").order("administered_on", { ascending: false }).limit(100)).data ?? [],
  });

  const create = async () => {
    if (!form.patient_id || !form.vaccine) { toast.error("Patient and vaccine required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("immunizations").insert({ ...form, next_due_on: form.next_due_on || null, recorded_by: u.user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Immunization recorded");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["immunizations"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record vaccine</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Immunization</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patient</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Vaccine</Label><Input value={form.vaccine} onChange={(e) => setForm({ ...form, vaccine: e.target.value })} placeholder="BCG, OPV, Penta…" /></div>
                <div><Label>Dose</Label><Input value={form.dose_label} onChange={(e) => setForm({ ...form, dose_label: e.target.value })} placeholder="1st, 2nd…" /></div>
                <div><Label>Given on</Label><Input type="date" value={form.administered_on} onChange={(e) => setForm({ ...form, administered_on: e.target.value })} /></div>
                <div><Label>Next due</Label><Input type="date" value={form.next_due_on} onChange={(e) => setForm({ ...form, next_due_on: e.target.value })} /></div>
                <div><Label>Lot #</Label><Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} /></div>
                <div><Label>Site</Label><Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="L deltoid" /></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {list.data?.length ? list.data.map((i) => (
        <Card key={i.id} className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex-1 min-w-[200px]">
            <p className="font-medium">{i.vaccine} <span className="text-sm font-normal text-muted-foreground">{i.dose_label}</span></p>
            <p className="text-xs text-muted-foreground">{(i as any).patients?.full_name} · given {i.administered_on ?? "—"} · next {i.next_due_on ?? "—"}</p>
          </div>
        </Card>
      )) : <Card className="p-10 text-center text-muted-foreground">No immunizations recorded yet.</Card>}
    </div>
  );
}
