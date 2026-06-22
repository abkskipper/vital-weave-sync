import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRoles, type AppRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User as UserIcon, Settings, KeyRound, CreditCard, LogOut, Loader2 } from "lucide-react";

type Profile = { full_name: string | null; avatar_url: string | null };

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function UserMenu({ variant = "sidebar" }: { variant?: "sidebar" | "topbar" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;
      setEmail(user.email ?? null);
      const [{ data: p }, r] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        getCurrentRoles(),
      ]);
      if (cancelled) return;
      setProfile(p ?? { full_name: null, avatar_url: null });
      setRoles(r);
    })();
    return () => { cancelled = true; };
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
    }
  };

  const displayName = profile?.full_name || email || "Account";
  const roleLabel = roles.length ? roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ") : "No role";

  const triggerBase =
    variant === "sidebar"
      ? "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent/60 text-sidebar-foreground"
      : "flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-accent";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerBase} aria-label="Open account menu">
            <Avatar className="h-9 w-9">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials(profile?.full_name, email)}
              </AvatarFallback>
            </Avatar>
            {variant === "sidebar" && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs opacity-70">{roleLabel}</p>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-64">
          <DropdownMenuLabel className="space-y-0.5">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <p className="truncate text-xs text-primary">{roleLabel}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" /> My profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Account settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/change-password"><KeyRound className="mr-2 h-4 w-4" /> Change password</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/billing"><CreditCard className="mr-2 h-4 w-4" /> Subscription & billing</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setConfirmOpen(true); }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of NurseGuard AI?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your patients, alerts, and clinical data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); signOut(); }} disabled={signingOut}>
              {signingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MobileSignOutButton() {
  return (
    <div className="ml-auto">
      <UserMenu variant="topbar" />
    </div>
  );
}
