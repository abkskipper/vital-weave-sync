import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/medications")({
  head: () => ({ meta: [{ title: "Medications — NurseGuard AI" }] }),
  component: MedsPage,
});

function MedsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", name: "", dosage: "", frequency: "", route: "", instructions: "" });

  const patients = useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").order("full_name")).data ?? [],
  });
  const meds = useQuery({
    queryKey: ["meds-all"],
    queryFn: async () => {
      const { data } = await supabase.from("medications")
        .select("id, name, dosage, frequency, route, active, patient_id, patients(full_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = async () => {
    if (!form.patient_id || !form.name || !form.dosage || !form.frequency) { toast.error("Patient, name, dosage and frequency required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("medications").insert({ ...form, created_by: u.user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Medication added");
    setOpen(false); setForm({ patient_id: "", name: "", dosage: "", frequency: "", route: "", instructions: "" });
    qc.invalidateQueries({ queryKey: ["meds-all"] });
  };

  const log = async (med: { id: string; patient_id: string }, status: "given" | "missed") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("medication_administrations").insert({
      medication_id: med.id, patient_id: med.patient_id, status, administered_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Logged as ${status}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Medications</h1><p className="text-sm text-muted-foreground">Schedule & administer.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add medication</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New medication</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patient</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dosage</Label><Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="500 mg" /></div>
                <div><Label>Route</Label><Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="PO" /></div>
              </div>
              <div><Label>Frequency</Label><Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Every 8 hours" /></div>
              <div><Label>Instructions</Label><Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {meds.data?.length ? meds.data.map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium">{m.name} <span className="text-sm font-normal text-muted-foreground">· {m.dosage}</span></p>
              <p className="text-xs text-muted-foreground">{(m as any).patients?.full_name ?? ""} · {m.frequency} {m.route ? `· ${m.route}` : ""}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => log(m, "given")}><Check className="mr-1 h-4 w-4" /> Given</Button>
            <Button size="sm" variant="outline" onClick={() => log(m, "missed")}><X className="mr-1 h-4 w-4" /> Missed</Button>
          </Card>
        )) : <Card className="p-10 text-center text-muted-foreground">No medications yet.</Card>}
      </div>
    </div>
  );
}
