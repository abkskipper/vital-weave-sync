import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/super-admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAuditLogs);
  const q = useQuery({ queryKey: ["sa-audit"], queryFn: () => fn({ data: { limit: 200 } }) });
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.actor_email ?? r.actor_id?.slice(0, 8)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.target_type ? `${r.target_type}:${(r.target_id ?? "").slice(0, 8)}` : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.ip ?? "—"}</td>
                  <td className="px-3 py-2"><Badge variant={r.status === "success" ? "outline" : "destructive"}>{r.status}</Badge></td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No audit events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
