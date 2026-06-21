import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { initializePaystackCheckout, verifyPaystackReference } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  validateSearch: (s: Record<string, unknown>) => ({
    reference: typeof s.reference === "string" ? s.reference : undefined,
    trxref: typeof s.trxref === "string" ? s.trxref : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  component: BillingPage,
});

function BillingPage() {
  const { reference, trxref } = useSearch({ from: "/_authenticated/billing" });
  const qc = useQueryClient();
  const init = useServerFn(initializePaystackCheckout);
  const verify = useServerFn(verifyPaystackReference);
  const [busy, setBusy] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const sub = useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const ref = reference ?? trxref;
    if (!ref) return;
    setBusy("verify");
    verify({ data: { reference: ref } })
      .then((r) => {
        toast.success(r.status === "success" ? "Payment confirmed" : `Status: ${r.status}`);
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(null));
  }, [reference, trxref, verify, qc]);

  const subscribe = async (code: string) => {
    setBusy(code);
    try {
      const r = await init({ data: { planCode: code } });
      if ("free" in r) {
        toast.success("Free plan activated");
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
      } else {
        window.location.href = r.authorization_url;
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Subscription & Billing</h1>
        <p className="text-sm text-muted-foreground">Pay securely in NGN via Paystack. 14-day trial on paid plans.</p>
      </header>

      {sub.data && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Current plan</p>
              <p className="text-lg font-semibold">{sub.data.plan_code}</p>
              {sub.data.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(sub.data.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge variant={sub.data.status === "active" ? "default" : "secondary"}>{sub.data.status}</Badge>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.data?.map((p) => {
          const current = sub.data?.plan_code === p.code && sub.data.status === "active";
          return (
            <Card key={p.code} className="flex flex-col p-5">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {p.price_ngn === 0 ? "Free" : `₦${p.price_ngn.toLocaleString()}`}
                </span>
                {p.price_ngn > 0 && <span className="text-xs text-muted-foreground">/{p.interval}</span>}
              </div>
              <ul className="mt-4 flex-1 space-y-1 text-sm">
                {(p.features as string[]).map((f) => (
                  <li key={f} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" />{f}</li>
                ))}
              </ul>
              <Button
                className="mt-4"
                disabled={current || busy !== null}
                onClick={() => subscribe(p.code)}
              >
                {busy === p.code && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {current ? "Current plan" : p.price_ngn === 0 ? "Activate" : "Subscribe"}
              </Button>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Payments are processed by Paystack. Access to premium features is enforced server-side on every request.
      </p>
    </div>
  );
}
