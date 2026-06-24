import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { listAuditLogs } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const qc = useQueryClient();
  const fn = useServerFn(listAuditLogs);
  const q = useQuery({ queryKey: ["sa-audit"], queryFn: () => fn({ data: { limit: 200 } }) });

  useEffect(() => {
    const ch = supabase
      .channel("sa-audit-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["sa-audit"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const exportPdf = () => {
    const rows = q.data ?? [];
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("NurseGuard AI — Audit Log", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()} · ${rows.length} events`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["When", "Actor", "Action", "Target", "IP", "Status"]],
      body: rows.map((r: any) => [
        new Date(r.created_at).toLocaleString(),
        r.actor_email ?? (r.actor_id ?? "").slice(0, 8),
        r.action,
        r.target_type ? `${r.target_type}:${(r.target_id ?? "").slice(0, 8)}` : "—",
        r.ip ?? "—",
        r.status,
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`nurseguard-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportPdf} disabled={!q.data?.length}>
          <FileDown className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>
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
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
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
    </div>
  );
}
