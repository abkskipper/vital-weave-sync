import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { HeartPulse, LayoutDashboard, Users, Activity, Pill, CalendarDays, Bell, BellRing, Menu, X, Baby, Brain, Home, Sparkles, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/vitals/new", label: "Record vitals", icon: Activity },
  { to: "/medications", label: "Medications", icon: Pill },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/maternal", label: "Maternal & Child", icon: Baby },
  { to: "/mental-health", label: "Mental Health", icon: Brain },
  { to: "/home-care", label: "Home Care", icon: Home },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/notifications", label: "Notifications", icon: BellRing },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex items-center gap-2 px-5 py-5 font-semibold text-sidebar-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </span>
        <span>NurseGuard <span className="text-sidebar-primary">AI</span></span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((n) => {
          const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="truncate text-xs text-sidebar-foreground/70">{email}</p>
        <Button onClick={signOut} variant="ghost" size="sm" className="mt-2 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-3 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <HeartPulse className="h-5 w-5 text-primary" /> NurseGuard
        </Link>
      </div>

      {/* sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-sidebar md:block">{SidebarContent}</aside>

      {/* sidebar — mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-sidebar-foreground"><X className="h-5 w-5" /></Button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
