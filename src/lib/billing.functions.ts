import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";

type InitInput = { planCode: string; callbackPath?: string };

export const initializePaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: InitInput) => {
    if (!data?.planCode || typeof data.planCode !== "string") throw new Error("planCode required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack is not configured");

    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("code, name, price_ngn, trial_days, is_active")
      .eq("code", data.planCode)
      .maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");
    if (!plan.is_active) throw new Error("Plan not available");
    if (plan.price_ngn <= 0) {
      // Free plan: just record a trialing/active subscription, no Paystack call
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId,
        plan_code: plan.code,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: null,
      }, { onConflict: "user_id" });
      return { free: true as const };
    }

    const email = (claims as { email?: string } | undefined)?.email;
    if (!email) throw new Error("Account email missing");

    const reference = `ng_${userId.slice(0, 8)}_${Date.now()}`;
    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const callback_url = `${proto}://${host}${data.callbackPath ?? "/billing?status=verifying"}`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: plan.price_ngn * 100, // kobo
        currency: "NGN",
        reference,
        callback_url,
        metadata: { user_id: userId, plan_code: plan.code },
      }),
    });
    const json = (await res.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; access_code: string; reference: string };
    };
    if (!res.ok || !json.status || !json.data) throw new Error(json.message || "Paystack init failed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payment_transactions").insert({
      user_id: userId,
      plan_code: plan.code,
      reference: json.data.reference,
      amount_ngn: plan.price_ngn,
      status: "pending",
    });

    return { authorization_url: json.data.authorization_url, reference: json.data.reference };
  });

export const verifyPaystackReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => {
    if (!data?.reference) throw new Error("reference required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack is not configured");
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const json = (await res.json()) as {
      status: boolean;
      data?: {
        status: string;
        reference: string;
        amount: number;
        channel?: string;
        customer?: { customer_code?: string };
        authorization?: { authorization_code?: string };
        metadata?: { user_id?: string; plan_code?: string };
      };
    };
    if (!res.ok || !json.status || !json.data) throw new Error("Verification failed");
    const tx = json.data;
    if (tx.metadata?.user_id !== context.userId) throw new Error("Reference does not belong to this user");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await applyPaystackEvent(supabaseAdmin, "charge.success.verify", tx);
    return { status: tx.status };
  });

// Shared application of a Paystack transaction (used by verify + webhook)
type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;
async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function applyPaystackEvent(
  admin: AdminClient,
  event: string,
  tx: {
    status: string;
    reference: string;
    amount: number;
    channel?: string;
    customer?: { customer_code?: string };
    authorization?: { authorization_code?: string };
    metadata?: { user_id?: string; plan_code?: string };
  },
) {
  const userId = tx.metadata?.user_id;
  const planCode = tx.metadata?.plan_code;
  if (!userId || !planCode) return;
  const success = tx.status === "success";

  await admin.from("payment_transactions").upsert(
    {
      user_id: userId,
      plan_code: planCode,
      reference: tx.reference,
      amount_ngn: Math.round(tx.amount / 100),
      status: success ? "success" : "failed",
      channel: tx.channel,
      paystack_event: event,
      raw: tx as unknown as Record<string, unknown>,
    },
    { onConflict: "reference" },
  );

  if (!success) return;

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_code: planCode,
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      paystack_customer_code: tx.customer?.customer_code ?? null,
      paystack_authorization_code: tx.authorization?.authorization_code ?? null,
      last_reference: tx.reference,
      cancel_at_period_end: false,
    },
    { onConflict: "user_id" },
  );
}
