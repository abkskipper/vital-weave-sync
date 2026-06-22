import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRoles, type AppRole } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — NurseGuard AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; organization: string | null; phone: string | null } | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      const [{ data: p }, r] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, organization, phone").eq("id", user.id).maybeSingle(),
        getCurrentRoles(),
      ]);
      setProfile(p ?? { full_name: null, avatar_url: null, organization: null, phone: null });
      setRoles(r);
    })();
  }, []);

  const name = profile?.full_name || email || "Account";
  const fallback = (name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("") || "??").toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-sm text-muted-foreground">Your account information and role.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={name} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">{fallback}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {roles.length === 0 && <Badge variant="outline">No role assigned</Badge>}
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
              ))}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Organization</dt>
            <dd className="mt-1 text-sm">{profile?.organization || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
            <dd className="mt-1 text-sm">{profile?.phone || "—"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Edit profile</Link></Button>
          <Button asChild variant="outline"><Link to="/change-password"><KeyRound className="mr-2 h-4 w-4" /> Change password</Link></Button>
        </div>
      </Card>
    </div>
  );
}
