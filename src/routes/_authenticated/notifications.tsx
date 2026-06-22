import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Check, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

type AlertRow = {
  id: string;
  severity: string;
  category: string;
  title: string;
  body: string | null;
  created_at: string;
  patient_id: string | null;
};

type Pref = {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  severity_threshold: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

function NotificationsPage() {
  const qc = useQueryClient();

  const alerts = useQuery({
    queryKey: ["notifications-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, severity, category, title, body, created_at, patient_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });

  const reads = useQuery({
    queryKey: ["alert-reads"],
    queryFn: async () => {
      const { data } = await supabase.from("alert_recipients").select("alert_id, read_at, dismissed_at");
      return new Map((data ?? []).map((r) => [r.alert_id, r]));
    },
  });

  const prefs = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as Pref | null) ?? {
        user_id: user.id,
        email_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        severity_threshold: "info",
        quiet_hours_start: null,
        quiet_hours_end: null,
      };
    },
  });

  const savePrefs = useMutation({
    mutationFn: async (patch: Partial<Pref>) => {
      const current = prefs.data;
      if (!current) return;
      const next = { ...current, ...patch };
      const { error } = await supabase.from("notification_preferences").upsert(next, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast.success("Preferences saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("alert_recipients")
        .upsert(
          { alert_id: alertId, user_id: user.id, read_at: new Date().toISOString() },
          { onConflict: "alert_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-reads"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alerts.data) return;
      const rows = alerts.data.map((a) => ({
        alert_id: a.id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("alert_recipients").upsert(rows, { onConflict: "alert_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-reads"] });
      toast.success("All marked as read");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Realtime new alerts
  useEffect(() => {
    const ch = supabase
      .channel("alerts-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, (payload) => {
        const a = payload.new as AlertRow;
        toast.warning(a.title, { description: a.body ?? undefined });
        qc.invalidateQueries({ queryKey: ["notifications-alerts"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const unreadCount = (alerts.data ?? []).filter((a) => !reads.data?.get(a.id)?.read_at).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="h-6 w-6" /> Notifications
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount} new</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">Clinical alerts and delivery preferences.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </header>

      <Card className="p-5">
        <h2 className="font-semibold">Delivery preferences</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Email alerts</Label>
            <Switch id="email" checked={prefs.data?.email_enabled ?? true}
              onCheckedChange={(v) => savePrefs.mutate({ email_enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push">In-app / push alerts</Label>
            <Switch id="push" checked={prefs.data?.push_enabled ?? true}
              onCheckedChange={(v) => savePrefs.mutate({ push_enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sms">SMS alerts</Label>
            <Switch id="sms" checked={prefs.data?.sms_enabled ?? false}
              onCheckedChange={(v) => savePrefs.mutate({ sms_enabled: v })} />
          </div>
          <div className="space-y-1">
            <Label>Severity threshold</Label>
            <Select value={prefs.data?.severity_threshold ?? "info"}
              onValueChange={(v) => savePrefs.mutate({ severity_threshold: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info and above</SelectItem>
                <SelectItem value="warning">Warning and above</SelectItem>
                <SelectItem value="critical">Critical only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quiet hours start</Label>
            <Input type="time" value={prefs.data?.quiet_hours_start ?? ""}
              onChange={(e) => savePrefs.mutate({ quiet_hours_start: e.target.value || null })} />
          </div>
          <div className="space-y-1">
            <Label>Quiet hours end</Label>
            <Input type="time" value={prefs.data?.quiet_hours_end ?? ""}
              onChange={(e) => savePrefs.mutate({ quiet_hours_end: e.target.value || null })} />
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {alerts.data?.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No alerts yet. Critical vitals and AI early warnings will appear here.
          </p>
        )}
        {alerts.data?.map((a) => {
          const isRead = !!reads.data?.get(a.id)?.read_at;
          return (
            <Card key={a.id} className={`flex gap-3 p-4 ${isRead ? "opacity-60" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "default" : "secondary"}>
                    {a.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{a.category}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 font-medium">{a.title}</p>
                {a.body && <p className="text-sm text-muted-foreground">{a.body}</p>}
              </div>
              {!isRead && (
                <Button variant="ghost" size="sm" onClick={() => markRead.mutate(a.id)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
