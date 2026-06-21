import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({ meta: [{ title: "Appointments — NurseGuard AI" }] }),
  component: ApptPage,
});

function ApptPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", title: "", starts_at: "", location: "" });
  const patients = useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").order("full_name")).data ?? [],
  });
  const appts = useQuery({
    queryKey: ["appts"],
    queryFn: async () => (await supabase.from("appointments")
      .select("id, title, starts_at, status, location, patients(full_name)")
      .gte("starts_at", new Date(Date.now() - 86400000).toISOString())
      .order("starts_at")).data ?? [],
  });

  const create = async () => {
    if (!form.patient_id || !form.title || !form.starts_at) { toast.error("Required fields missing"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("appointments").insert({ ...form, clinician_id: u.user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment scheduled");
    setOpen(false); setForm({ patient_id: "", title: "", starts_at: "", location: "" });
    qc.invalidateQueries({ queryKey: ["appts"] });
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["appts"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Appointments</h1><p className="text-sm text-muted-foreground">Upcoming and recent.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Patient</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Date & time</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {appts.data?.length ? appts.data.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{(a as any).patients?.full_name} · {new Date(a.starts_at).toLocaleString()} {a.location ? `· ${a.location}` : ""}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${a.status === "scheduled" ? "bg-secondary text-secondary-foreground" : a.status === "completed" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
            {a.status === "scheduled" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "completed")}>Complete</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "cancelled")}>Cancel</Button>
              </>
            )}
          </Card>
        )) : <Card className="p-10 text-center text-muted-foreground">No appointments scheduled.</Card>}
      </div>
    </div>
  );
}
