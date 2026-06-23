import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super-admin/settings")({
  component: SettingsPage,
});

type Settings = {
  maintenance_mode?: boolean;
  trial_days?: number;
  referral_reward_ngn?: number;
  wallet_max_balance_ngn?: number;
  feature_flags?: Record<string, boolean>;
};

function SettingsPage() {
  const qc = useQueryClient();
  const fn = useServerFn(getPlatformSettings);
  const q = useQuery({ queryKey: ["sa-settings"], queryFn: () => fn() });
  const [s, setS] = useState<Settings>({});
  useEffect(() => { if (q.data) setS(q.data as Settings); }, [q.data]);

  const save = useMutation({
    mutationFn: useServerFn(updatePlatformSettings),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["sa-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Platform settings</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label className="font-medium">Maintenance mode</Label>
            <p className="text-sm text-muted-foreground">Block non-admin traffic.</p>
          </div>
          <Switch checked={!!s.maintenance_mode} onCheckedChange={(v) => setS({ ...s, maintenance_mode: v })} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Trial period (days)</Label>
            <Input type="number" value={s.trial_days ?? ""} onChange={(e) => setS({ ...s, trial_days: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Referral reward (₦)</Label>
            <Input type="number" value={s.referral_reward_ngn ?? ""} onChange={(e) => setS({ ...s, referral_reward_ngn: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Wallet max balance (₦)</Label>
            <Input type="number" value={s.wallet_max_balance_ngn ?? ""} onChange={(e) => setS({ ...s, wallet_max_balance_ngn: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <Button onClick={() => save.mutate({ data: { data: s as Record<string, unknown> } })} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
