import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ClipboardCopy, Save } from "lucide-react";
import { toast } from "sonner";
import { runNursingAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Nursing Assistant — NurseGuard AI" }] }),
  component: AssistantPage,
});

const MODES = [
  { value: "nursing_note", label: "Nursing note (SOAP)" },
  { value: "handover", label: "Shift handover (SBAR)" },
  { value: "care_plan", label: "Care plan" },
  { value: "patient_education", label: "Patient education sheet" },
] as const;

function AssistantPage() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [mode, setMode] = useState<typeof MODES[number]["value"]>("nursing_note");
  const [ctx, setCtx] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const patients = useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").order("full_name")).data ?? [],
  });

  const generate = async () => {
    if (!patientId) { toast.error("Select a patient"); return; }
    setBusy(true); setOut("");
    try {
      const r = await runNursingAssistant({ data: { patient_id: patientId, mode, context: ctx || undefined } });
      setOut(r.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  };

  const copy = async () => { await navigator.clipboard.writeText(out); toast.success("Copied"); };

  const saveAsNote = async () => {
    if (!patientId || !out.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("nursing_notes").insert({ patient_id: patientId, body: out, author_id: u.user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved to nursing notes");
    qc.invalidateQueries({ queryKey: ["patient-notes", patientId] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-6 w-6 text-primary" />AI Nursing Assistant</h1>
        <p className="text-sm text-muted-foreground">Drafts notes, handovers, care plans, and patient education from the patient's chart. Always review before charting.</p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Patient</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">— Select —</option>
              {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div><Label>Document type</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label>Additional context (optional)</Label>
          <Textarea rows={3} placeholder="Anything not yet in the chart that should inform the draft…" value={ctx} onChange={(e) => setCtx(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={busy} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />{busy ? "Generating…" : "Generate draft"}
        </Button>
      </Card>

      {out && (
        <Card className="space-y-3 p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm">{out}</pre>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copy}><ClipboardCopy className="mr-2 h-4 w-4" />Copy</Button>
            {mode === "nursing_note" && <Button size="sm" onClick={saveAsNote}><Save className="mr-2 h-4 w-4" />Save as nursing note</Button>}
          </div>
          <p className="text-[10px] text-muted-foreground">Clinical decision support, not a diagnosis. Verify all content against the patient's chart and clinical judgment before charting.</p>
        </Card>
      )}
    </div>
  );
}
