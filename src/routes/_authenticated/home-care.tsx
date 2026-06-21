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
import { Home, Plus, Play, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home-care")({
  head: () => ({ meta: [{ title: "Home Care — NurseGuard AI" }] }),
  component: HomeCarePage,
});

const DEFAULT_TASKS = ["Vitals check", "Medication administration", "Wound dressing", "Patient education", "Caregiver handover"];

function HomeCarePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", scheduled_for: "", tasks: [] as string[] });

  const patients = useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").order("full_name")).data ?? [],
  });
  const visits = useQuery({
    queryKey: ["home-care-visits"],
    queryFn: async () => (await supabase.from("home_care_visits").select("*, patients(full_name)").order("scheduled_for", { ascending: false }).limit(50)).data ?? [],
  });

  const toggleTask = (t: string) => {
    setForm((f) => ({ ...f, tasks: f.tasks.includes(t) ? f.tasks.filter((x) => x !== t) : [...f.tasks, t] }));
  };

  const create = async () => {
    if (!form.patient_id || !form.scheduled_for) { toast.error("Patient and time required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("home_care_visits").insert({
      patient_id: form.patient_id,
      clinician_id: u.user?.id,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      tasks: form.tasks,
      status: "scheduled",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Visit scheduled");
    setOpen(false);
    setForm({ patient_id: "", scheduled_for: "", tasks: [] });
    qc.invalidateQueries({ queryKey: ["home-care-visits"] });
  };

  const startVisit = async (id: string) => {
    let coords: { latitude?: number; longitude?: number } = {};
    if (navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }; resolve(); },
          () => resolve(),
          { timeout: 5000 },
        );
      });
    }
    const { error } = await supabase.from("home_care_visits").update({
      status: "in_progress", started_at: new Date().toISOString(), ...coords,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Visit started");
    qc.invalidateQueries({ queryKey: ["home-care-visits"] });
  };

  const completeVisit = async (id: string) => {
    const summary = window.prompt("Visit summary (what was done, patient status, follow-up):") ?? "";
    const { error } = await supabase.from("home_care_visits").update({
      status: "completed", completed_at: new Date().toISOString(), summary,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Visit completed");
    qc.invalidateQueries({ queryKey: ["home-care-visits"] });
  };

  const statusVariant = (s: string) => s === "completed" ? "secondary" : s === "in_progress" ? "default" : "outline";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Home className="h-6 w-6 text-primary" />Home Care Visits</h1>
          <p className="text-sm text-muted-foreground">Schedule visits, check in on arrival, log outcomes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Schedule visit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New home care visit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patient</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div><Label>Scheduled for</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
              <div>
                <Label>Tasks</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DEFAULT_TASKS.map((t) => (
                    <Button key={t} type="button" size="sm" variant={form.tasks.includes(t) ? "default" : "outline"} onClick={() => toggleTask(t)}>{t}</Button>
                  ))}
                </div>
              </div>
              <Button onClick={create} className="w-full">Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {visits.data?.length ? visits.data.map((v) => (
          <Card key={v.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{(v as any).patients?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(v.scheduled_for).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(v.status) as any}>{v.status.replace("_", " ")}</Badge>
                {v.latitude != null && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{Number(v.latitude).toFixed(3)}, {Number(v.longitude).toFixed(3)}</span>}
              </div>
            </div>
            {Array.isArray(v.tasks) && v.tasks.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">Tasks: {(v.tasks as string[]).join(", ")}</p>
            )}
            {v.summary && <p className="mt-2 text-sm">{v.summary}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {v.status === "scheduled" && <Button size="sm" variant="outline" onClick={() => startVisit(v.id)}><Play className="mr-1 h-4 w-4" />Check in</Button>}
              {v.status === "in_progress" && <Button size="sm" onClick={() => completeVisit(v.id)}><CheckCircle2 className="mr-1 h-4 w-4" />Complete</Button>}
            </div>
          </Card>
        )) : <Card className="p-10 text-center text-muted-foreground">No home care visits scheduled.</Card>}
      </div>
    </div>
  );
}
