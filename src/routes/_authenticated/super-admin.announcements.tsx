import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnnouncements, sendAnnouncement } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super-admin/announcements")({
  component: AnnouncementsPage,
});

const ROLES = ["", "nurse", "doctor", "patient", "caregiver", "admin", "hospital_manager", "super_admin"];
const SEV = ["info", "warning", "critical", "maintenance"];

function AnnouncementsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAnnouncements);
  const q = useQuery({ queryKey: ["sa-ann"], queryFn: () => listFn() });
  const [form, setForm] = useState({ title: "", body: "", severity: "info", target_role: "" });
  const send = useMutation({
    mutationFn: useServerFn(sendAnnouncement),
    onSuccess: () => { toast.success("Announcement sent"); setForm({ title: "", body: "", severity: "info", target_role: "" }); qc.invalidateQueries({ queryKey: ["sa-ann"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Message" value={form.body} rows={4} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">Severity
              <select className="ml-2 rounded border border-border bg-background px-2 py-1" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {SEV.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-sm">Target role
              <select className="ml-2 rounded border border-border bg-background px-2 py-1" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r || "all users"}</option>)}
              </select>
            </label>
            <Button disabled={!form.title || !form.body} onClick={() => send.mutate({ data: { ...form, target_role: form.target_role || null } })}>Send</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent announcements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(q.data ?? []).map((a: any) => (
            <div key={a.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{a.title}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline">{a.severity}</Badge>
                  <Badge variant="secondary">{a.target_role ?? "all"}</Badge>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
          {(q.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
