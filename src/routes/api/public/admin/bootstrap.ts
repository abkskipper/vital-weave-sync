import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// One-time bootstrap: promotes a user to super_admin.
// Requires SUPER_ADMIN_BOOTSTRAP_TOKEN secret. Refuses if any super_admin
// already exists (the very first super_admin gets seeded; afterwards use
// the in-app Users page to grant the role).
export const Route = createFileRoute("/api/public/admin/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN;
        if (!token) return new Response("Bootstrap disabled", { status: 503 });

        const provided = request.headers.get("x-bootstrap-token") ?? "";
        const a = Buffer.from(provided);
        const b = Buffer.from(token);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid token", { status: 401 });
        }

        let body: { email?: string };
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
        const email = body.email?.trim().toLowerCase();
        if (!email) return new Response("email required", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Refuse if a super_admin already exists.
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .eq("role", "super_admin" as any);
        if ((count ?? 0) > 0) return new Response("Already bootstrapped", { status: 409 });

        // Find the user by email via the Auth Admin API.
        let userId: string | null = null;
        for (let page = 1; page <= 20 && !userId; page++) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) return new Response(error.message, { status: 500 });
          const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
          if (match) userId = match.id;
          if (data.users.length < 200) break;
        }
        if (!userId) return new Response("User not found — sign up first", { status: 404 });

        const { error: rerr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "super_admin" as any });
        if (rerr) return new Response(rerr.message, { status: 500 });

        await supabaseAdmin.from("audit_logs").insert({
          actor_id: userId,
          actor_email: email,
          action: "super_admin.bootstrap",
          target_type: "user",
          target_id: userId,
          status: "success",
          metadata: { source: "bootstrap_endpoint" },
        });

        return new Response(JSON.stringify({ ok: true, userId }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
