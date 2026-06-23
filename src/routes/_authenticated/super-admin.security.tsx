import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSecurityEvents } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/super-admin/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const fn = useServerFn(listSecurityEvents);
  const q = useQuery({ queryKey: ["sa-security"], queryFn: () => fn() });
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">User-Agent</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((e: any) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2"><Badge variant={e.event_type === "failed_login" ? "destructive" : "secondary"}>{e.event_type}</Badge></td>
                  <td className="px-3 py-2">{e.email ?? e.user_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.ip ?? "—"}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">{e.user_agent ?? "—"}</td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No security events recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
