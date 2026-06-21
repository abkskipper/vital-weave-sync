import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — NurseGuard AI" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["alerts-all"],
    queryFn: async () => (await supabase.from("alerts")
      .select("id, severity, category, title, body, created_at, acknowledged_at, patient_id, patients(full_name)")
      .order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  useEffect(() => {
    const ch = supabase.channel("alerts-stream").on(
      "postgres_changes", { event: "*", schema: "public", table: "alerts" },
      (p) => {
        qc.invalidateQueries({ queryKey: ["alerts-all"] });
        if (p.eventType === "INSERT") {
          const a = p.new as { severity: string; title: string };
          if (a.severity === "critical" || a.severity === "emergency") toast.error(a.title);
          else toast.warning(a.title);
        }
      },
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const ack = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("alerts").update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: u.user?.id,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["alerts-all"] });
  };

  const sevStyle = (s: string) =>
    s === "critical" || s === "emergency" ? "bg-critical/10 text-critical border-critical/30"
    : s === "warning" ? "bg-warning/10 text-warning-foreground border-warning/40"
    : "bg-secondary text-secondary-foreground border-border";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-sm text-muted-foreground">Real-time clinical alerts.</p>
      </div>

      <div className="space-y-2">
        {data?.length ? data.map((a) => (
          <Card key={a.id} className={`border-l-4 p-4 ${sevStyle(a.severity)}`}>
            <div className="flex items-start gap-3">
              {a.severity === "critical" || a.severity === "emergency"
                ? <AlertTriangle className="mt-0.5 h-5 w-5" />
                : <Bell className="mt-0.5 h-5 w-5" />}
              <div className="flex-1">
                <p className="font-medium">{a.title}</p>
                {a.body && <p className="text-sm">{a.body}</p>}
                <p className="mt-1 text-xs opacity-80">
                  {(a as any).patients?.full_name ?? "—"} · {new Date(a.created_at).toLocaleString()} · {a.category}
                </p>
              </div>
              {!a.acknowledged_at ? (
                <Button size="sm" variant="outline" onClick={() => ack(a.id)}>Acknowledge</Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs"><CheckCircle2 className="h-4 w-4" /> Ack</span>
              )}
            </div>
          </Card>
        )) : <Card className="p-10 text-center text-muted-foreground">No alerts. All clear.</Card>}
      </div>
    </div>
  );
}
