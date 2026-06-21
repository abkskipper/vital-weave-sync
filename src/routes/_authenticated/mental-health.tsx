import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mental-health")({
  head: () => ({ meta: [{ title: "Mental Health — NurseGuard AI" }] }),
  component: MentalHealthPage,
});

// PHQ-9 (depression) and GAD-7 (anxiety) questionnaires
const PHQ9 = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling/staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure",
  "Trouble concentrating on things",
  "Moving or speaking slowly, or being fidgety/restless",
  "Thoughts that you would be better off dead, or of hurting yourself",
];
const GAD7 = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];
const OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

function phq9Severity(s: number) {
  if (s <= 4) return "Minimal";
  if (s <= 9) return "Mild";
  if (s <= 14) return "Moderate";
  if (s <= 19) return "Moderately severe";
  return "Severe";
}
function gad7Severity(s: number) {
  if (s <= 4) return "Minimal";
  if (s <= 9) return "Mild";
  if (s <= 14) return "Moderate";
  return "Severe";
}

function MentalHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Brain className="h-6 w-6 text-primary" />Mental Health Screening</h1>
        <p className="text-sm text-muted-foreground">Validated tools — PHQ-9 (depression) and GAD-7 (anxiety). Clinical support, not diagnosis.</p>
      </div>
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="new">New screening</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4"><History /></TabsContent>
        <TabsContent value="new" className="mt-4"><NewScreening /></TabsContent>
      </Tabs>
    </div>
  );
}

function History() {
  const list = useQuery({
    queryKey: ["mh-screenings"],
    queryFn: async () => (await supabase.from("mental_health_screenings").select("*, patients(full_name)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const variant = (sev: string) => /severe/i.test(sev) ? "destructive" : /moderate/i.test(sev) ? "default" : "secondary";
  return (
    <div className="space-y-2">
      {list.data?.length ? list.data.map((s) => (
        <Card key={s.id} className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex-1 min-w-[200px]">
            <p className="font-medium">{(s as any).patients?.full_name} <span className="text-sm font-normal text-muted-foreground">· {s.tool}</span></p>
            <p className="text-xs text-muted-foreground">Score {s.score} · {new Date(s.created_at).toLocaleString()}</p>
            {s.notes && <p className="mt-1 text-sm">{s.notes}</p>}
          </div>
          <Badge variant={variant(s.severity) as any}>{s.severity}</Badge>
        </Card>
      )) : <Card className="p-10 text-center text-muted-foreground">No screenings yet.</Card>}
    </div>
  );
}

function NewScreening() {
  const qc = useQueryClient();
  const [tool, setTool] = useState<"PHQ-9" | "GAD-7">("PHQ-9");
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);

  const patients = useQuery({
    queryKey: ["patients-mini"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").order("full_name")).data ?? [],
  });

  const questions = tool === "PHQ-9" ? PHQ9 : GAD7;
  const score = answers.reduce((a, b) => a + (b ?? 0), 0);
  const severity = tool === "PHQ-9" ? phq9Severity(score) : gad7Severity(score);
  const suicidalFlag = tool === "PHQ-9" && (answers[8] ?? 0) >= 1;

  const setAnswer = (idx: number, value: number) => {
    const next = [...answers]; next[idx] = value; setAnswers(next);
  };

  const submit = async () => {
    if (!patientId) { toast.error("Select a patient"); return; }
    if (answers.filter((a) => a != null).length < questions.length) { toast.error("Answer all questions"); return; }
    const { data: u } = await supabase.auth.getUser();
    const responses = Object.fromEntries(questions.map((q, i) => [`q${i + 1}`, answers[i]]));
    const { error } = await supabase.from("mental_health_screenings").insert({
      patient_id: patientId, tool, score, severity, responses, notes: notes || null, recorded_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    if (suicidalFlag || /severe/i.test(severity)) {
      await supabase.from("alerts").insert({
        patient_id: patientId,
        severity: suicidalFlag ? "critical" : "warning",
        category: "mental_health",
        title: `${tool} ${suicidalFlag ? "self-harm risk flagged" : `severity: ${severity}`}`,
        body: `Score ${score}/${tool === "PHQ-9" ? 27 : 21}.${suicidalFlag ? " Patient endorsed self-harm ideation — immediate safety assessment recommended." : ""}`,
        source: "mental_health_screening",
      });
    }
    toast.success("Screening saved");
    qc.invalidateQueries({ queryKey: ["mh-screenings"] });
    setAnswers([]); setNotes("");
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Patient</Label>
          <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">— Select —</option>
            {patients.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div><Label>Tool</Label>
          <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={tool} onChange={(e) => { setTool(e.target.value as any); setAnswers([]); }}>
            <option value="PHQ-9">PHQ-9 (Depression)</option>
            <option value="GAD-7">GAD-7 (Anxiety)</option>
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Over the last 2 weeks, how often have you been bothered by:</p>
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={i} className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">{i + 1}. {q}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OPTIONS.map((o) => (
                <Button key={o.value} type="button" size="sm"
                  variant={answers[i] === o.value ? "default" : "outline"}
                  onClick={() => setAnswer(i, o.value)}>
                  {o.label} ({o.value})
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div><Label>Clinical notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-secondary p-3">
        <p className="text-sm">Score: <strong>{score}</strong> / {tool === "PHQ-9" ? 27 : 21} · <Badge>{severity}</Badge></p>
        {suicidalFlag && <Badge variant="destructive">Self-harm item endorsed — escalate</Badge>}
      </div>
      <Button onClick={submit} className="w-full">Save screening</Button>
      <p className="text-[10px] text-muted-foreground">Validated screening tools, not diagnostic. Always pair with clinical judgment.</p>
    </Card>
  );
}
