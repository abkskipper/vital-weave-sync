import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ShieldCheck, HeartPulse, Bell, Users, Brain, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NurseGuard AI — Extending Care Beyond the Hospital" },
      { name: "description", content: "AI-powered vitals monitoring, medication adherence, and early warning for hospitals, clinics, home care, and caregivers." },
      { property: "og:title", content: "NurseGuard AI" },
      { property: "og:description", content: "Extending care beyond the hospital." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: HeartPulse, title: "Real-time vitals", body: "Heart rate, BP, SpO₂, temperature, respiration and blood sugar — streamed live to clinicians." },
  { icon: Brain, title: "AI early warning", body: "Risk scoring on every reading. Deterioration detected before it becomes an emergency." },
  { icon: Bell, title: "Smart alerts", body: "Critical-vital, missed-dose and abnormal-condition alerts, routed to the right team." },
  { icon: Users, title: "Role-aware access", body: "Nurses, doctors, patients, caregivers and admins — each see exactly what they need." },
  { icon: ShieldCheck, title: "Built secure", body: "Row-level security on every record. Audit logs. Consent-aware data handling." },
  { icon: Activity, title: "Care that travels", body: "Hospital, clinic, home visit or post-discharge — one platform across the continuum." },
];

const plans = [
  { name: "Free", price: "₦0", per: "forever", features: ["1 clinician", "Up to 5 patients", "Core vitals & alerts"] },
  { name: "Nurse Pro", price: "₦5,000", per: "/month", features: ["Unlimited patients", "AI nursing notes", "Shift handovers"], highlight: true },
  { name: "Home Care", price: "₦8,000", per: "/month", features: ["Remote monitoring", "Home visit scheduling", "Caregiver linking"] },
  { name: "Clinic", price: "₦25,000", per: "/month", features: ["Up to 25 clinicians", "Reports & analytics", "Priority support"] },
  { name: "Hospital", price: "₦100,000", per: "/month", features: ["Unlimited clinicians", "Admin console", "SLA + onboarding"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-primary)] text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </span>
            <span>NurseGuard <span className="text-primary">AI</span></span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="#plans" className="text-muted-foreground hover:text-foreground">Plans</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm"><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{ backgroundImage: `url(${hero})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/90 to-background" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-success" /> Built for real healthcare deployment
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              Extending care <span className="text-primary">beyond the hospital.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              NurseGuard AI brings real-time vitals, medication tracking, and AI early warning to nurses,
              doctors, patients and caregivers — across hospitals, clinics, and home care.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#features">See how it works</a></Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border/60 bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">A clinical platform, not a chart app.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Every feature is wired to real backend operations, real-time updates, and role-based access.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Plans for every level of care.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">14-day free trial on every paid plan. Cancel anytime.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {plans.map((p) => (
              <Card key={p.name} className={`p-5 ${p.highlight ? "ring-2 ring-primary" : ""}`}>
                {p.highlight && <div className="mb-2 inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Most popular</div>}
                <h3 className="font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.per}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.map((ft) => (
                    <li key={ft} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span>{ft}</span></li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-border/60 bg-secondary/40 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Care follows the patient.</h2>
          <p className="mt-4 text-muted-foreground">
            NurseGuard AI is being built for real-world healthcare deployment — hospitals, clinics, home-care services and caregivers,
            with AI support that augments clinicians without replacing their judgement.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">AI features are clinical decision support and do not constitute a medical diagnosis.</p>
          <Button asChild size="lg" className="mt-8"><Link to="/auth">Create your account</Link></Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} NurseGuard AI. Extending care beyond the hospital.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Privacy</span><span>Terms</span><span>Medical disclaimer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
