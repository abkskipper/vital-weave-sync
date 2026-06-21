import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({ meta: [{ title: "Patients — NurseGuard AI" }] }),
  component: Patients,
});

function Patients() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", mrn: "", phone: "", date_of_birth: "", sex: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, mrn, phone, date_of_birth, sex")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!form.full_name.trim()) { toast.error("Full name is required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("patients").insert({
      full_name: form.full_name.trim(),
      mrn: form.mrn.trim() || null,
      phone: form.phone.trim() || null,
      date_of_birth: form.date_of_birth || null,
      sex: form.sex || null,
      created_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    // Auto-assign self as clinician so RLS lets you keep editing
    const { data: latest } = await supabase
      .from("patients").select("id").eq("created_by", u.user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest && u.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const role = roles?.[0]?.role ?? "nurse";
      await supabase.from("patient_assignments").insert({ patient_id: latest.id, clinician_id: u.user.id, role });
    }
    toast.success("Patient added");
    setForm({ full_name: "", mrn: "", phone: "", date_of_birth: "", sex: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["patients"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-muted-foreground">All patients you can access.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add patient</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New patient</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>MRN</Label><Input value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                <div>
                  <Label>Sex</Label>
                  <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <Button onClick={submit} className="w-full">Create patient</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : data && data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={p.id} to="/patients/$id" params={{ id: p.id }}>
              <Card className="p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground"><User className="h-5 w-5" /></span>
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.mrn ?? "No MRN"} · {p.sex ?? "—"}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">No patients yet. Add your first patient to get started.</p>
        </Card>
      )}
    </div>
  );
}
