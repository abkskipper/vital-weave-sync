
# NurseGuard AI — Build Plan

The full 8-phase spec is a multi-week production build. I'll deliver it in iterations so each turn produces something stable and reviewable, rather than a shallow "all-at-once" pass that breaks.

## Defaults I'm locking in (you can change any of these later)

- **Design**: "Clinical Trust" — deep medical blue + healing green + clean white. Custom design system in `src/styles.css`, semantic tokens only.
- **Backend**: Lovable Cloud (Supabase under the hood) with RLS on every table and a separate `user_roles` table (nurse / doctor / patient / caregiver / admin).
- **Auth**: Email/password + Google sign-in via the managed integration.
- **AI**: Lovable AI Gateway (Gemini) for early-warning scoring, nursing notes, summaries.
- **Payments**: Paystack (NGN) — wired in Phase 3 turn, after schema + free-tier app works. I'll request your Paystack secret key then.
- **PWA**: Manifest + installability now; offline shell added in a later turn.

## This turn — Iteration 1 (Foundation)

1. Enable Lovable Cloud.
2. Design system: tokens, typography, button/card variants, semantic colors for vitals (normal/warning/critical).
3. Public marketing landing page (`/`) — hero, value props, plan preview, CTA → `/auth`. Real SEO head().
4. Auth: `/auth` (email + Google), `/auth/reset-password`, role selection on first sign-in.
5. Database schema + RLS + grants:
   - `app_role` enum, `user_roles`, `has_role()` security-definer
   - `profiles` (auto-create via trigger)
   - `patients`, `patient_assignments`, `emergency_contacts`
   - `vitals` (HR, BP, SpO2, temp, resp rate, blood sugar)
   - `medications`, `medication_administrations`
   - `appointments`
   - `nursing_notes`, `care_plans`, `shift_handovers`
   - `alerts`
6. Protected app shell under `_authenticated/`:
   - `/dashboard` (role-aware)
   - `/patients` + `/patients/$id` (overview, vitals chart, meds, notes)
   - `/vitals/new` (record vitals — triggers alert rules)
   - `/medications`, `/appointments`, `/alerts`
7. Realtime subscriptions on `vitals` and `alerts`.
8. Basic AI early-warning server function: scores latest vitals, writes an `alert` row when risk crosses threshold.
9. PWA manifest + icons + theme color.

## Following turns

- **Iteration 2 — Phase 2**: maternal/child, mental health screenings, home care, AI nursing assistant (note/handover/care-plan generation, editable before save).
- **Iteration 3 — Phase 3**: subscription plans table, trial logic, plan enforcement middleware, Paystack init + webhook, CareSave wallet, referrals.
- **Iteration 4 — Phase 4 + 5**: notifications center, email/push, reports + PDF export.
- **Iteration 5 — Phase 6**: admin console (users, hospitals, revenue, audit log).
- **Iteration 6 — Phase 7 + 8**: offline shell, background sync, consent management, privacy/terms/medical-disclaimer pages, final RLS audit.

## Technical notes

- TanStack Start file routing under `src/routes/`; protected routes under `_authenticated/`.
- All server logic via `createServerFn`; no Edge Functions for app-internal work.
- Every table: `GRANT` → `ENABLE RLS` → policies using `has_role(auth.uid(), 'role')`.
- Vitals thresholds stored as constants in a server module so the alert engine is testable.
- Charts via Recharts; tables via shadcn `Table`.
- All AI outputs are advisory and rendered with a "clinical support — not a diagnosis" disclaimer.

## What I need from you eventually (not blocking iteration 1)

- Paystack **secret** key (for Iteration 3). Public key can be added to code.
- Logo / brand mark if you have one — otherwise I'll generate a wordmark.
- Confirmation that NGN pricing in the spec is final.

Approve and I'll start Iteration 1.
