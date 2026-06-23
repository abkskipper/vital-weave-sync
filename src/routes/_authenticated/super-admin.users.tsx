import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserRole, setUserStatus, deleteUser, forceSignOut } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Trash2, ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin/users")({
  component: UsersPage,
});

const ROLES = ["nurse", "doctor", "patient", "caregiver", "admin", "hospital_manager", "super_admin"] as const;

function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const list = useServerFn(listUsers);
  const q = useQuery({ queryKey: ["sa-users", search], queryFn: () => list({ data: { search } }) });

  const role = useMutation({
    mutationFn: useServerFn(setUserRole),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["sa-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const status = useMutation({
    mutationFn: useServerFn(setUserStatus),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["sa-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteUser),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["sa-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const force = useMutation({
    mutationFn: useServerFn(forceSignOut),
    onSuccess: () => toast.success("Sessions revoked"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Roles</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last sign-in</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(q.data ?? []).map((u: any) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">{u.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((r: string) => (
                          <Badge key={r} variant="secondary" className="cursor-pointer" onClick={() => role.mutate({ data: { userId: u.id, role: r, add: false } })}>
                            {r} ×
                          </Badge>
                        ))}
                        <select
                          className="rounded border border-border bg-background px-1 text-xs"
                          value=""
                          onChange={(e) => { if (e.target.value) role.mutate({ data: { userId: u.id, role: e.target.value, add: true } }); }}
                        >
                          <option value="">+ add</option>
                          {ROLES.filter((r) => !(u.roles ?? []).includes(r)).map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={u.status === "suspended" ? "destructive" : "outline"}>{u.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "Never"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {u.status === "suspended" ? (
                          <Button size="sm" variant="outline" onClick={() => status.mutate({ data: { userId: u.id, status: "active" } })}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => status.mutate({ data: { userId: u.id, status: "suspended" } })}>
                            <ShieldOff className="h-3.5 w-3.5" /> Suspend
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => force.mutate({ data: { userId: u.id } })}>
                          <LogOut className="h-3.5 w-3.5" /> Logout
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this user permanently?")) del.mutate({ data: { userId: u.id } }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {q.isLoading && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!q.isLoading && (q.data ?? []).length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
