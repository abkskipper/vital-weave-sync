import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHospitals, upsertHospital, setHospitalStatus, deleteHospital } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super-admin/hospitals")({
  component: HospitalsPage,
});

function HospitalsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listHospitals);
  const q = useQuery({ queryKey: ["sa-hospitals"], queryFn: () => list() });
  const [form, setForm] = useState({ name: "", location: "", contact_email: "", contact_phone: "" });

  const create = useMutation({
    mutationFn: useServerFn(upsertHospital),
    onSuccess: () => { toast.success("Hospital saved"); setForm({ name: "", location: "", contact_email: "", contact_phone: "" }); qc.invalidateQueries({ queryKey: ["sa-hospitals"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: useServerFn(setHospitalStatus),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["sa-hospitals"] }); },
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteHospital),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["sa-hospitals"] }); },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Add hospital</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <Input placeholder="Contact phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          <div className="md:col-span-4">
            <Button onClick={() => form.name && create.mutate({ data: form })} disabled={!form.name}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(q.data ?? []).map((h: any) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{h.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{h.location ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{h.contact_email ?? h.contact_phone ?? "—"}</td>
                    <td className="px-3 py-2"><Badge variant={h.status === "active" ? "default" : h.status === "suspended" ? "destructive" : "secondary"}>{h.status}</Badge></td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {h.status !== "active" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ data: { id: h.id, status: "active" } })}>Approve</Button>}
                        {h.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ data: { id: h.id, status: "suspended" } })}>Suspend</Button>}
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete hospital?")) del.mutate({ data: { id: h.id } }); }}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(q.data ?? []).length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No hospitals yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
