import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Account settings — NurseGuard AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", organization: "", phone: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);
      const { data: p } = await supabase.from("profiles").select("full_name, organization, phone, avatar_url").eq("id", user.id).maybeSingle();
      if (p) setForm({
        full_name: p.full_name ?? "",
        organization: p.organization ?? "",
        phone: p.phone ?? "",
        avatar_url: p.avatar_url ?? "",
      });
      setLoading(false);
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: form.full_name || null,
      organization: form.organization || null,
      phone: form.phone || null,
      avatar_url: form.avatar_url || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile details.</p>
      </div>
      <Card className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email ?? ""} disabled />
            <p className="mt-1 text-xs text-muted-foreground">Contact support to change your email.</p>
          </div>
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe, RN" />
          </div>
          <div>
            <Label htmlFor="organization">Organization</Label>
            <Input id="organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="St. Mary's Hospital" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234…" />
          </div>
          <div>
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input id="avatar_url" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
