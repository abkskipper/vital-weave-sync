import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getPlatformOverview, getRevenueSeries } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";


export const Route = createFileRoute("/_authenticated/super-admin/revenue")({
  component: RevenuePage,
});

const fmtNGN = (n: number) => "₦" + (n ?? 0).toLocaleString();

function RevenuePage() {
  const ovFn = useServerFn(getPlatformOverview);
  const srFn = useServerFn(getRevenueSeries);
  const ov = useQuery({ queryKey: ["sa-overview"], queryFn: () => ovFn() });
  const sr = useQuery({ queryKey: ["sa-series-90"], queryFn: () => srFn({ data: { days: 90 } }) });

  if (!ov.data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const r = ov.data.revenue;
  const p = ov.data.payments;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Today", r.today],
          ["This week", r.week],
          ["This month", r.month],
          ["This year", r.year],
          ["Lifetime", r.lifetime],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">{l as string}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-semibold">{fmtNGN(v as number)}</div></CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle>Revenue — last 90 days</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sr.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "₦" + v.toLocaleString()} />
              <Tooltip formatter={(v: any) => fmtNGN(v)} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        {Object.entries(p).map(([k, v]) => (
          <Card key={k}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Paystack {k}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-semibold">{v as number}</div></CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
