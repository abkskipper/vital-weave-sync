import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureRole, getCurrentRoles, type AppRole } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Activity, Bell, Pill, CalendarDays, Stethoscope, Heart, UserCog, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NurseGuard AI" }] }),
  component: Dashboard,
});

const roleOptions: { role: AppRole; label: string; icon: typeof Stethoscope }[] = [
  { role: "nurse", label: "Nurse", icon: Heart },
  { role: "doctor", label: "Doctor", icon: Stethoscope },
  { role: "patient", label: "Patient", icon: UserCog },
  { role: "caregiver", label: "Caregiver", icon: UserCog },
  { role: "admin", label: "Admin", icon: Shield },
];

function Dashboard() {
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getCurrentRoles().then(setRoles); }, []);

  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [patients, alerts, vitals, appts] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("alerts").select("*", { count: "exact", head: true }).is("acknowledged_at", null),
        supabase.from("vitals").select("*", { count: "exact", head: true })
          .gte("recorded_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("appointments").select("*", { count: "exact", head: true })
          .gte("starts_at", new Date().toISOString())
          .lte("starts_at", new Date(Date.now() + 7 * 86400000).toISOString()),
      ]);
      return {
        patients: patients.count ?? 0,
        alerts: alerts.count ?? 0,
        vitals: vitals.count ?? 0,
        appts: appts.count ?? 0,
      };
    },
    enabled: !!roles && roles.length > 0,
  });

  if (roles === null) return <p className="text-muted-foreground">Loading…</p>;

  if (roles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Welcome to NurseGuard AI</h1>
        <p className="mt-2 text-muted-foreground">Pick the role that fits your work to set up your workspace.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {roleOptions.map((r) => (
            <Card key={r.role} className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <r.icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">{r.label}</p>
                </div>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await ensureRole(r.role);
                      const updated = await getCurrentRoles();
                      setRoles(updated);
                      toast.success(`Welcome, ${r.label}.`);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed to set role");
                    } finally { setBusy(false); }
                  }}
                >
                  Continue
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Patients", value: counts.data?.patients ?? 0, icon: Users, to: "/patients" },
    { label: "Open alerts", value: counts.data?.alerts ?? 0, icon: Bell, to: "/alerts" },
    { label: "Vitals (24h)", value: counts.data?.vitals ?? 0, icon: Activity, to: "/vitals/new" },
    { label: "Upcoming appts", value: counts.data?.appts ?? 0, icon: CalendarDays, to: "/appointments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Signed in as {roles.map((r) => r).join(", ")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link to="/patients">Manage patients</Link></Button>
          <Button asChild variant="outline"><Link to="/vitals/new">Record vitals</Link></Button>
          <Button asChild variant="outline"><Link to="/medications">Medications</Link></Button>
          <Button asChild variant="outline"><Link to="/appointments">New appointment</Link></Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          AI early-warning suggestions are clinical decision support — not a diagnosis.
        </p>
      </Card>
    </div>
  );
}
