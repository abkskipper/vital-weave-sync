# Super Admin Control Center + Documentation

This is a large piece of work. I'll deliver it in two iterations so each turn is stable and reviewable. Everything is wired to real Supabase data — no mock widgets.

## Iteration A (this turn)

**1. Role + RLS foundation (migration)**
- Add `super_admin` to the `app_role` enum.
- New `audit_logs` table (user_id, action, target_type, target_id, ip, user_agent, status, metadata, created_at) — RLS: only super_admin can read; service_role writes.
- New `platform_settings` table (singleton key/value JSON) — super_admin read/write.
- New `platform_announcements` table — super_admin write, all authenticated read.
- New `hospitals` table (name, location, status, created_at) + `hospital_id` FK on `profiles` — super_admin manages; hospital managers read their own.
- New `security_events` table (user_id, type, ip, ua, created_at) — super_admin read.
- `has_role(super_admin)` automatically works via existing function.
- Tighten existing RLS so super_admin can read everything (helper: `is_super_admin(uid)`).
- GRANTs for every new table.

**2. Server functions (`src/lib/admin.functions.ts`)**
All gated by `requireSupabaseAuth` + `has_role(..., 'super_admin')` check. Reads use the authenticated client (RLS enforces). Privileged writes (delete user, force logout, change role) use `supabaseAdmin` loaded inside the handler.
- `getPlatformOverview` — user counts by role, new-user windows, subscription/revenue/wallet/clinical aggregates in one round-trip.
- `getRevenueSeries({ range })` — daily revenue series from `payment_transactions`.
- `listUsers / listHospitals / listAuditLogs / listSecurityEvents` — paginated, filterable.
- `setUserRole`, `suspendUser`, `reactivateUser`, `deleteUser`, `forceSignOut` (admin auth API), `approveHospital`, `suspendHospital`, `sendAnnouncement`, `updatePlatformSettings`, `setMaintenanceMode`.
- Every mutating fn writes an `audit_logs` row.

**3. Super Admin UI (separate from `/admin` if it exists)**
Routes under `src/routes/_authenticated/super-admin/`:
- `index.tsx` — Executive overview: KPI cards (users, subs, revenue, wallet, clinical), revenue + growth charts (Recharts), system health (Supabase ping + Paystack key presence + realtime).
- `users.tsx` — searchable table, role change, suspend/reactivate/delete, force logout.
- `hospitals.tsx` — approve/suspend/delete, performance columns.
- `revenue.tsx` — Paystack analytics, charts, MRR/ARR.
- `audit.tsx` — paginated audit log viewer.
- `security.tsx` — failed logins, locked accounts, revoke sessions.
- `announcements.tsx` — compose + target by role.
- `settings.tsx` — pricing, trial days, wallet limits, referral rewards, feature flags, maintenance mode.
- Layout route `super-admin/route.tsx` with `beforeLoad` that calls a `requireSuperAdmin` server fn and redirects to `/dashboard` if not super_admin. Sidebar link hidden for non–super-admins.

**4. README.md** — full documentation skeleton covering overview, architecture, roles, DB tables, security, AI modules, payments, deployment, API, admin guide, maintenance, changelog, dev notes. Reflects actual implementation.

## Iteration B (next turn)

- PDF export of analytics (jspdf, reuse from reports module).
- Realtime subscriptions on `audit_logs` + `alerts` for the overview.
- Notification fan-out worker (server fn + cron-style route) for announcements → `alerts`/email.
- Dark mode polish and mobile layout pass for the admin tables.
- Bootstrap script to promote the first super admin (one-time, gated by a secret).

## Technical notes

- Role check is enforced **server-side in every fn** — not just in the UI gate.
- Audit log is append-only; only `service_role` can insert (via admin client inside fns).
- All charts pull from server fns, no client-side aggregation of sensitive tables.
- Maintenance mode flag is read by root loader; when on, non-super-admins see a maintenance page.

## Open question

Do you already have a super admin email I should auto-promote in the migration, or should I add a one-time bootstrap endpoint that promotes the first caller who knows a `SUPER_ADMIN_BOOTSTRAP_TOKEN` secret? (Default: bootstrap endpoint.)

Approve and I'll start Iteration A.
