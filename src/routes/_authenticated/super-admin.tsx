import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/admin.functions";
import { Shield, LayoutDashboard, Users, Building2, DollarSign, FileSearch, Lock, Megaphone, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/super-admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/super-admin/users", label: "Users", icon: Users },
  { to: "/super-admin/hospitals", label: "Hospitals", icon: Building2 },
  { to: "/super-admin/revenue", label: "Revenue", icon: DollarSign },
  { to: "/super-admin/audit", label: "Audit Logs", icon: FileSearch },
  { to: "/super-admin/security", label: "Security", icon: Lock },
  { to: "/super-admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/super-admin/settings", label: "Settings", icon: Settings2 },
] as const;

export const Route = createFileRoute("/_authenticated/super-admin")({
  beforeLoad: async () => {
    try {
      await requireSuperAdmin();
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Executive command center — NurseGuard AI</p>
        </div>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
