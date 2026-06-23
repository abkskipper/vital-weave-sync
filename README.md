# NurseGuard AI

> Extending care beyond the hospital — an AI-assisted clinical platform for nurses, doctors, patients, caregivers, hospital managers, and platform operators.

NurseGuard AI is a production-grade clinical operations platform built on TanStack Start (React 19) and Lovable Cloud (Supabase). It combines an early-warning AI engine, full nursing workflow (vitals, medications, appointments, notes, handovers, care plans), maternal/child and mental-health modules, home-care visit tracking, subscription billing via Paystack, and an executive Super Admin control center.

---

## Table of contents

1. [Project overview](#project-overview)
2. [System architecture](#system-architecture)
3. [User roles](#user-roles)
4. [Database schema](#database-schema)
5. [Security model](#security-model)
6. [AI modules](#ai-modules)
7. [Payments](#payments)
8. [Super Admin control center](#super-admin-control-center)
9. [Deployment guide](#deployment-guide)
10. [API surface](#api-surface)
11. [Maintenance](#maintenance)
12. [Changelog](#changelog)
13. [Developer notes](#developer-notes)

---

## Project overview

**Mission.** Reduce preventable clinical deterioration in low-resource settings by giving every nurse an always-on assistant — early-warning scoring, structured documentation, medication adherence, and AI-generated clinical artifacts that a licensed clinician reviews before saving.

**Problems addressed.**
- Late detection of deteriorating patients (sepsis, eclampsia, post-op crashes).
- Paper-based vitals, medication, and handover records.
- Disconnected maternal/child and mental-health monitoring.
- No structured way to extend monitoring to home care and caregivers.
- Lack of operator visibility into platform health, revenue, and security.

**Core features.**
- Multi-role clinical workspace
- Realtime vitals + alerts engine
- AI nursing assistant (notes, care plans, handover, risk scoring)
- Maternal/child, mental-health, and home-care modules
- Notifications center with per-user delivery preferences
- PDF reports
- Subscription billing (Paystack) with CareSave wallet + referrals
- Super Admin executive command center
- Audit + security event log

---

## System architecture

```
React 19 + TanStack Start (SSR + file routes)
        │
        ├── /  /auth                       public marketing + auth
        ├── /_authenticated/*              clinical workspace (RLS-scoped)
        └── /_authenticated/super-admin/*  executive operator console
                 │
                 ▼
  createServerFn (typed RPC, app-internal)        server routes (/api/public/*)
                 │                                         │
                 ▼                                         ▼
   Supabase (Postgres + Auth + Realtime + RLS)     Paystack webhook intake
                 │
                 ├── service_role (admin tasks only)
                 └── publishable key + bearer token (per-user RLS)
```

- **Frontend:** TanStack Router (file routes under `src/routes`), TanStack Query for data fetching, Tailwind v4, shadcn/ui, Recharts, Lucide icons.
- **Backend:** Server functions for app-internal logic; server routes only for webhooks/public APIs. No Supabase Edge Functions for app-internal work.
- **Auth:** Lovable-managed Supabase auth — email/password and Google OAuth via the Lovable broker.
- **Realtime:** Vitals + alerts + audit logs published over Supabase Realtime channels.
- **AI:** Lovable AI Gateway (Gemini) — risk scoring, nursing-note generation, care-plan drafts.
- **Payments:** Paystack (NGN) — checkout init via `createServerFn`, intake via `/api/public/webhooks/paystack` with HMAC verification.

---

## User roles

Roles live in `public.user_roles` and are evaluated via the `has_role(uid, role)` security-definer function. The role enum:

```
nurse · doctor · patient · caregiver · admin · hospital_manager · super_admin
```

| Role | Reads | Writes | Privileged actions |
| --- | --- | --- | --- |
| **patient** | own profile, own patient record, own vitals/meds/alerts | own profile, mental-health self-screenings | — |
| **caregiver** | linked patients (via `caregiver_links`) | nursing notes for linked patients | — |
| **nurse** | assigned patients + clinical tables | vitals, medications, notes, handovers, care plans | use AI assistant |
| **doctor** | assigned patients | medications, care plans, notes | use AI assistant |
| **hospital_manager** | hospital roster | hospital staff assignments | — |
| **admin** | platform admin within hospital scope | — | — |
| **super_admin** | **all rows in all tables** | role grants, suspensions, hospitals, settings, announcements | platform-wide |

Role checks are enforced **server-side in every privileged server fn** and **at the RLS layer** — UI gates are belt-and-braces only.

---

## Database schema

All tables live in `public` with RLS enabled and explicit GRANTs.

| Table | Purpose |
| --- | --- |
| `profiles` | User profile (auto-created on signup). `hospital_id`, `status`. |
| `user_roles` | Role assignments. |
| `hospitals` | Hospital directory with approval workflow (`pending`/`active`/`suspended`). |
| `patients` | Patient master record. |
| `patient_assignments` | Clinician ↔ patient. |
| `caregiver_links` | Caregiver ↔ patient. |
| `emergency_contacts` | Patient contacts. |
| `vitals` | HR/BP/SpO₂/temp/RR/sugar; feeds the alert engine. |
| `medications`, `medication_administrations` | Prescriptions + MAR. |
| `appointments` | Scheduled visits. |
| `nursing_notes`, `care_plans`, `shift_handovers` | Clinical documentation. |
| `alerts`, `alert_recipients`, `notification_preferences` | Alerts + per-user read state + delivery prefs. |
| `maternal_records`, `antenatal_visits` | Maternal module. |
| `child_records`, `immunizations` | Child health module. |
| `mental_health_screenings` | PHQ-9/GAD-7 scores. |
| `home_care_visits` | Home-care visit logs. |
| `plans`, `subscriptions`, `payment_transactions` | Billing. |
| `wallet_accounts`, `wallet_transactions`, `referrals` | CareSave wallet + referrals. |
| `platform_settings` | Singleton key/value (maintenance mode, trial days, etc.). |
| `platform_announcements` | Super-admin broadcasts, optionally role-targeted. |
| `audit_logs` | Append-only audit trail (service-role writes). |
| `security_events` | Failed logins, session revocations, suspicious activity. |

Relationships: `patients.user_id → profiles.id`, every clinical table joins on `patient_id`, `subscriptions.user_id → profiles.id`, `profiles.hospital_id → hospitals.id`.

---

## Security model

- **Authentication.** Supabase Auth — email/password + Google OAuth via Lovable broker.
- **Authorization.** Two layers, both enforced:
  1. RLS policies using `has_role(auth.uid(), 'role')` and `can_access_patient(...)`.
  2. Server-function gates (`requireSupabaseAuth` + `has_role` check) before any privileged operation.
- **Service role.** `SUPABASE_SERVICE_ROLE_KEY` is server-only, loaded inside handler bodies via dynamic import — never at module scope.
- **Audit logging.** Every privileged Super Admin mutation writes an `audit_logs` row (actor, action, target, IP, user-agent, metadata).
- **Webhooks.** Paystack webhooks verified with HMAC-SHA512 over the raw body using `PAYSTACK_SECRET_KEY`; timing-safe compare.
- **Maintenance mode.** Toggle in Super Admin settings; readable by the root loader to gate non-admin traffic.
- **Sessions.** Force-logout via Auth Admin API; logs a `session_revoked` security event.
- **Password.** UI enforces strength meter + requirement checks; HIBP leak check enabled in Auth provider settings.

---

## AI modules

Implemented in `src/lib/ai.functions.ts` (Lovable AI Gateway).

| Module | Inputs | Output | Notes |
| --- | --- | --- | --- |
| **Early Warning System** | Latest vitals row | Risk band + reasoning | Writes an `alerts` row when score ≥ threshold. |
| **AI Nursing Assistant** | Patient context + freeform prompt | Structured nursing note draft | Always editable before save. |
| **Care Plan Drafter** | Diagnosis + history | Care-plan markdown | Clinician approves. |
| **Handover Composer** | Shift events | SBAR-formatted handover | Clinician approves. |
| **Maternal Risk** | Antenatal record | Risk flags (pre-eclampsia, GDM, IUGR) | Advisory only. |

Every AI output is rendered with a "clinical support — not a diagnosis" disclaimer.

---

## Payments

- **Plans table** (`plans`) drives pricing; super-admin can edit.
- **Checkout.** `initializePaystackCheckout` server fn creates a Paystack transaction and inserts a pending row in `payment_transactions`.
- **Verification.** `verifyPaystackReference` confirms by ID after redirect.
- **Webhook.** `/api/public/webhooks/paystack` (server route) verifies the signature, then calls `applyPaystackEvent` to upsert `payment_transactions` and `subscriptions`.
- **CareSave wallet.** `wallet_accounts` + `wallet_transactions`; referral rewards posted via `claim_referral`.

---

## Super Admin control center

Lives under `/super-admin/*` (gated by a `requireSuperAdmin` `beforeLoad`):

| Page | Function |
| --- | --- |
| **Overview** | KPIs (users, patients, revenue, wallet), users-by-role, revenue chart (30d), payments/appointments summary. |
| **Users** | Search; grant/revoke roles; suspend/reactivate; force sign-out; delete. |
| **Hospitals** | Create; approve/suspend/delete. |
| **Revenue** | Daily revenue bar chart (90d) + Paystack status counts. |
| **Audit Logs** | Append-only operator action log. |
| **Security** | Failed logins, session revocations, suspicious events. |
| **Announcements** | Compose; target by role; severity. |
| **Settings** | Maintenance mode, trial days, referral reward, wallet caps, feature flags. |

**Access control:** every server fn calls `assertSuperAdmin(context)`; RLS independently denies access at the table layer. Bootstrap the first super admin by inserting a `user_roles` row via the SQL editor (or a one-time bootstrap endpoint — see roadmap).

---

## Deployment guide

**Required env / secrets** (Lovable Cloud secrets, never .env):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` (AI Gateway)
- `PAYSTACK_SECRET_KEY` (server-only)

**Client env** (in `.env`, prefixed `VITE_`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

**Steps**
1. Apply all migrations in `supabase/migrations` in order.
2. Enable Email + Google providers in Auth → Providers. Enable HIBP password check.
3. Set Paystack webhook URL → `https://<project>.lovable.app/api/public/webhooks/paystack`.
4. Promote the first super admin: `INSERT INTO public.user_roles(user_id, role) VALUES ('<uuid>', 'super_admin');`.
5. Publish via Lovable.

---

## API surface

### Server functions (`createServerFn`)

| Module | Functions |
| --- | --- |
| `src/lib/ai.functions.ts` | `scoreVitals`, `generateNursingNote`, `generateCarePlan`, `generateHandover`. |
| `src/lib/billing.functions.ts` | `initializePaystackCheckout`, `verifyPaystackReference`. |
| `src/lib/admin.functions.ts` | `requireSuperAdmin`, `getPlatformOverview`, `getRevenueSeries`, `listUsers`, `setUserRole`, `setUserStatus`, `deleteUser`, `forceSignOut`, `listHospitals`, `upsertHospital`, `setHospitalStatus`, `deleteHospital`, `sendAnnouncement`, `listAnnouncements`, `getPlatformSettings`, `updatePlatformSettings`, `listAuditLogs`, `listSecurityEvents`. |

### Server routes

| Route | Purpose |
| --- | --- |
| `/api/public/webhooks/paystack` | Paystack webhook intake (HMAC-verified). |

---

## Maintenance

- **Backups.** Lovable Cloud backs up Postgres nightly.
- **Monitoring.** Super Admin Overview + Audit Logs.
- **Updating pricing.** Update rows in `public.plans`; rolls out instantly.
- **Subscription reconciliation.** Re-process via Paystack reference using `verifyPaystackReference`.
- **Troubleshooting.**
  - 401 in protected loaders → user not signed in; managed `_authenticated` gate redirects to `/auth`.
  - RLS denied → check super-admin policy on the table, or `has_role` membership.
  - Webhook 401 → check `PAYSTACK_SECRET_KEY` and payload signature header name.

---

## Changelog

- **Iteration 5 — Super Admin control center.** Roles `super_admin` + `hospital_manager`. Hospitals, platform settings, announcements, audit logs, security events. Executive dashboard, users management, revenue analytics, audit/security/settings pages. README documentation.
- **Iteration 4 — Notifications + Reports.** Notification center with realtime + per-user prefs. PDF patient chart export (jspdf).
- **Iteration 3 — Billing.** Paystack checkout, webhook handler, plans/subscriptions/payment_transactions/wallet schema.
- **Iteration 2 — Maternal/Child + Mental Health + Home Care + AI Assistant.**
- **Iteration 1 — Foundation.** Design system, auth, patients, vitals, medications, appointments, alerts, AI early warning, PWA shell.

---

## Developer notes

- File-based routing only — never edit `src/routeTree.gen.ts`.
- Never put server-only code (admin client, secret env) in loaders or components.
- Add a GRANT statement in the same migration as every new `public.*` table.
- Every protected server fn must call `assertSuperAdmin` (or appropriate role check) — do not rely solely on RLS.
- New Super Admin mutations should write an `audit_logs` row via the shared `audit()` helper.
- Update this README in the same turn as any schema, role, or API change.
