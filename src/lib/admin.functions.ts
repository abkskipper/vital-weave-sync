import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";



async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function audit(
  actorId: string,
  actorEmail: string | undefined,
  action: string,
  target_type?: string,
  target_id?: string,
  metadata: Record<string, unknown> = {},
  status: "success" | "failure" = "success",
) {
  try {
    const admin = await getAdmin();
    await admin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail ?? null,
      action,
      target_type: target_type ?? null,
      target_id: target_id ?? null,
      status,
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
      user_agent: getRequestHeader("user-agent") ?? null,
      metadata: metadata as any,
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

// ── Role check (UI gate) ──────────────────────────────────────────────────
export const requireSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    return { ok: true as const };
  });

// ── Executive overview ────────────────────────────────────────────────────
export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabase } = context;

    const since = (days: number) =>
      new Date(Date.now() - days * 86400_000).toISOString();

    const [
      profilesAll,
      profilesToday,
      profilesWeek,
      profilesMonth,
      roleRows,
      subs,
      patients,
      criticalAlerts,
      appts,
      revenueRows,
      txAll,
      wallets,
      walletTx,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(1)),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(7)),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(30)),
      supabase.from("user_roles").select("role"),
      supabase.from("subscriptions").select("status, plan_code"),
      supabase.from("patients").select("id, status", { count: "exact" }),
      supabase.from("alerts").select("id", { count: "exact", head: true }).eq("severity", "critical"),
      supabase.from("appointments").select("status"),
      supabase.from("payment_transactions").select("amount_ngn, status, created_at").eq("status", "success"),
      supabase.from("payment_transactions").select("status"),
      supabase.from("wallet_accounts").select("balance_ngn", { count: "exact" }),
      supabase.from("wallet_transactions").select("amount_ngn, direction"),
    ]);

    const roleCounts: Record<string, number> = {};
    (roleRows.data ?? []).forEach((r: any) => (roleCounts[r.role] = (roleCounts[r.role] ?? 0) + 1));

    const subBreakdown: Record<string, number> = {};
    const subStatus: Record<string, number> = {};
    (subs.data ?? []).forEach((s: any) => {
      subBreakdown[s.plan_code] = (subBreakdown[s.plan_code] ?? 0) + 1;
      subStatus[s.status] = (subStatus[s.status] ?? 0) + 1;
    });

    const txStatus: Record<string, number> = {};
    (txAll.data ?? []).forEach((t: any) => (txStatus[t.status] = (txStatus[t.status] ?? 0) + 1));

    const apptStatus: Record<string, number> = {};
    (appts.data ?? []).forEach((a: any) => (apptStatus[a.status] = (apptStatus[a.status] ?? 0) + 1));

    const inWindow = (iso: string, days: number) => Date.parse(iso) >= Date.now() - days * 86400_000;
    const sum = (xs: any[]) => xs.reduce((a, b) => a + (b.amount_ngn ?? 0), 0);
    const succ = revenueRows.data ?? [];
    const revenue = {
      today: sum(succ.filter((r: any) => inWindow(r.created_at, 1))),
      week: sum(succ.filter((r: any) => inWindow(r.created_at, 7))),
      month: sum(succ.filter((r: any) => inWindow(r.created_at, 30))),
      year: sum(succ.filter((r: any) => inWindow(r.created_at, 365))),
      lifetime: sum(succ),
    };

    const walletAgg = (walletTx.data ?? []).reduce(
      (acc: any, t: any) => {
        if (t.direction === "credit") acc.deposits += t.amount_ngn ?? 0;
        else acc.withdrawals += t.amount_ngn ?? 0;
        acc.count += 1;
        return acc;
      },
      { deposits: 0, withdrawals: 0, count: 0 },
    );

    return {
      users: {
        total: profilesAll.count ?? 0,
        today: profilesToday.count ?? 0,
        week: profilesWeek.count ?? 0,
        month: profilesMonth.count ?? 0,
        byRole: roleCounts,
      },
      subscriptions: { byStatus: subStatus, byPlan: subBreakdown },
      payments: txStatus,
      revenue,
      patients: {
        total: patients.count ?? 0,
        critical: criticalAlerts.count ?? 0,
      },
      appointments: apptStatus,
      wallet: {
        accounts: wallets.count ?? 0,
        balance: (wallets.data ?? []).reduce((a: number, b: any) => a + (b.balance_ngn ?? 0), 0),
        deposits: walletAgg.deposits,
        withdrawals: walletAgg.withdrawals,
        transactions: walletAgg.count,
      },
    };
  });

// ── Revenue time series ───────────────────────────────────────────────────
export const getRevenueSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => ({ days: Math.min(Math.max(d?.days ?? 30, 7), 365) }))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const { data: rows } = await context.supabase
      .from("payment_transactions")
      .select("amount_ngn, created_at, status")
      .gte("created_at", since)
      .eq("status", "success")
      .order("created_at", { ascending: true });
    const buckets: Record<string, number> = {};
    (rows ?? []).forEach((r: any) => {
      const d = r.created_at.slice(0, 10);
      buckets[d] = (buckets[d] ?? 0) + (r.amount_ngn ?? 0);
    });
    return Object.entries(buckets).map(([date, amount]) => ({ date, amount }));
  });

// ── User management ───────────────────────────────────────────────────────
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; limit?: number; offset?: number }) => ({
    search: d?.search ?? null,
    limit: Math.min(d?.limit ?? 50, 200),
    offset: d?.offset ?? 0,
  }))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_list_users", {
      _limit: data.limit,
      _offset: data.offset,
      _search: data.search ?? undefined,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: string; add: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    if (data.add) {
      await admin.from("user_roles").upsert({ user_id: data.userId, role: data.role as any });
    } else {
      await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role as any);
    }
    await audit(context.userId, context.claims.email, "role.change", "user", data.userId, {
      role: data.role,
      add: data.add,
    });
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; status: "active" | "suspended" }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    await admin.from("profiles").update({ status: data.status }).eq("id", data.userId);
    await audit(context.userId, context.claims.email, "user.status", "user", data.userId, {
      status: data.status,
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const admin = await getAdmin();
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await audit(context.userId, context.claims.email, "user.delete", "user", data.userId);
    return { ok: true };
  });

export const forceSignOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    const { error } = await admin.auth.admin.signOut(data.userId);
    if (error) throw new Error(error.message);
    await admin.from("security_events").insert({
      user_id: data.userId,
      event_type: "session_revoked",
      ip: getRequestIP({ xForwardedFor: true }),
      user_agent: getRequestHeader("user-agent"),
      metadata: { by: context.userId },
    });
    await audit(context.userId, context.claims.email, "user.force_signout", "user", data.userId);
    return { ok: true };
  });

// ── Hospitals ─────────────────────────────────────────────────────────────
export const listHospitals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data } = await context.supabase
      .from("hospitals")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; location?: string; status?: string; contact_email?: string; contact_phone?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    const { data: row, error } = await admin.from("hospitals").upsert(data).select().single();
    if (error) throw new Error(error.message);
    await audit(context.userId, context.claims.email, "hospital.upsert", "hospital", row.id, data);
    return row;
  });

export const setHospitalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "active" | "suspended" }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    await admin.from("hospitals").update({ status: data.status }).eq("id", data.id);
    await audit(context.userId, context.claims.email, "hospital.status", "hospital", data.id, { status: data.status });
    return { ok: true };
  });

export const deleteHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    await admin.from("hospitals").delete().eq("id", data.id);
    await audit(context.userId, context.claims.email, "hospital.delete", "hospital", data.id);
    return { ok: true };
  });

// ── Announcements ─────────────────────────────────────────────────────────
export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; severity?: string; target_role?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    const { data: row, error } = await admin
      .from("platform_announcements")
      .insert({
        title: data.title,
        body: data.body,
        severity: data.severity ?? "info",
        target_role: (data.target_role ?? null) as any,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Fan-out to in-app alerts
    let recipientIds: string[] = [];
    if (data.target_role) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", data.target_role as any);
      recipientIds = (roleRows ?? []).map((r: any) => r.user_id);
    } else {
      const { data: profs } = await admin.from("profiles").select("id");
      recipientIds = (profs ?? []).map((p: any) => p.id);
    }
    let delivered = 0;
    if (recipientIds.length > 0) {
      const { data: alertRow, error: aerr } = await admin
        .from("alerts")
        .insert({
          severity: data.severity ?? "info",
          category: "announcement",
          title: data.title,
          body: data.body,
          source: "super_admin",
        })
        .select("id")
        .single();
      if (!aerr && alertRow) {
        const recs = recipientIds.map((uid) => ({ alert_id: alertRow.id, user_id: uid }));
        // Chunk to avoid payload limits
        for (let i = 0; i < recs.length; i += 500) {
          await admin.from("alert_recipients").insert(recs.slice(i, i + 500));
        }
        delivered = recipientIds.length;
      }
    }
    await audit(context.userId, context.claims.email, "announcement.send", "announcement", row.id, {
      ...data,
      delivered,
    });
    return { ...row, delivered };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data } = await context.supabase
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ── Settings ──────────────────────────────────────────────────────────────
export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data } = await context.supabase.from("platform_settings").select("*").eq("id", true).maybeSingle();
    return data?.data ?? {};
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { data: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const admin = await getAdmin();
    await admin
      .from("platform_settings")
      .upsert({ id: true, data: data.data as any, updated_at: new Date().toISOString(), updated_by: context.userId });
    await audit(context.userId, context.claims.email, "settings.update", "platform_settings", "singleton", data.data);
    return { ok: true };
  });

// ── Audit / security ──────────────────────────────────────────────────────
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; offset?: number }) => ({
    limit: Math.min(d?.limit ?? 100, 500),
    offset: d?.offset ?? 0,
  }))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: rows } = await context.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    return rows ?? [];
  });

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data } = await context.supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });
