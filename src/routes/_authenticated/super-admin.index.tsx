import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlatformOverview, getRevenueSeries } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Activity, AlertTriangle, Wallet, CreditCard, BadgeDollarSign, HeartPulse } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/super-admin/")({
  component: Overview,
});

const fmtNGN = (n: number) => "₦" + (n ?? 0).toLocaleString();

function Kpi({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function Overview() {
  const overviewFn = useServerFn(getPlatformOverview);
  const seriesFn = useServerFn(getRevenueSeries);
  const ov = useQuery({ queryKey: ["sa-overview"], queryFn: () => overviewFn() });
  const sr = useQuery({ queryKey: ["sa-series"], queryFn: () => seriesFn({ data: { days: 30 } }) });

  if (ov.isLoading) return <div className="text-sm text-muted-foreground">Loading platform metrics…</div>;
  if (ov.error) return <div className="text-sm text-destructive">{(ov.error as Error).message}</div>;
  const d = ov.data!;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Total users" value={d.users.total} sub={`+${d.users.today} today · +${d.users.week} this week`} />
        <Kpi icon={HeartPulse} label="Patients" value={d.patients.total} sub={`${d.patients.critical} critical alerts`} />
        <Kpi icon={BadgeDollarSign} label="Revenue (30d)" value={fmtNGN(d.revenue.month)} sub={`Lifetime ${fmtNGN(d.revenue.lifetime)}`} />
        <Kpi icon={Wallet} label="Wallet balance" value={fmtNGN(d.wallet.balance)} sub={`${d.wallet.accounts} accounts`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sr.data ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => "₦" + v.toLocaleString()} />
                <Tooltip formatter={(v: any) => fmtNGN(v)} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Users by role</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(d.users.byRole).map(([r, c]) => (
              <div key={r} className="flex justify-between border-b border-border/50 py-1 last:border-0">
                <span className="capitalize text-muted-foreground">{r.replace("_", " ")}</span>
                <span className="font-medium">{c as number}</span>
              </div>
            ))}
            {Object.keys(d.users.byRole).length === 0 && <p className="text-muted-foreground">No roles assigned yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={CreditCard} label="Successful payments" value={d.payments.success ?? 0} />
        <Kpi icon={CreditCard} label="Failed payments" value={d.payments.failed ?? 0} />
        <Kpi icon={CreditCard} label="Pending payments" value={d.payments.pending ?? 0} />
        <Kpi icon={Activity} label="Appointments completed" value={d.appointments.completed ?? 0} sub={`${d.appointments.missed ?? 0} missed`} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Subscriptions by status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(d.subscriptions.byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="capitalize text-muted-foreground">{k}</span><span className="font-medium">{v as number}</span></div>
            ))}
            {Object.keys(d.subscriptions.byStatus).length === 0 && <p className="text-muted-foreground">No subscriptions yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Subscriptions by plan</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(d.subscriptions.byPlan).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v as number}</span></div>
            ))}
            {Object.keys(d.subscriptions.byPlan).length === 0 && <p className="text-muted-foreground">No subscriptions yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Wallet activity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Deposits</span><span className="font-medium">{fmtNGN(d.wallet.deposits)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Withdrawals</span><span className="font-medium">{fmtNGN(d.wallet.withdrawals)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Transactions</span><span className="font-medium">{d.wallet.transactions}</span></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
