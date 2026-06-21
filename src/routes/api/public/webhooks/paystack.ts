import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { applyPaystackEvent } from "@/lib/billing.functions";

export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 503 });

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { event?: string; data?: Record<string, unknown> };
        try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
        const event = payload.event ?? "unknown";
        const tx = payload.data as Parameters<typeof applyPaystackEvent>[2] | undefined;
        if (!tx) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (event === "charge.success") {
          await applyPaystackEvent(supabaseAdmin, event, tx);
        } else if (event === "subscription.disable" || event === "subscription.not_renew") {
          const userId = tx.metadata?.user_id;
          if (userId) {
            await supabaseAdmin
              .from("subscriptions")
              .update({ status: "canceled", cancel_at_period_end: true })
              .eq("user_id", userId);
          }
        } else if (event === "invoice.payment_failed") {
          const userId = tx.metadata?.user_id;
          if (userId) {
            await supabaseAdmin.from("subscriptions").update({ status: "past_due" }).eq("user_id", userId);
          }
        }

        return new Response("ok");
      },
    },
  },
});
