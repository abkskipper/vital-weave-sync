import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowLeft, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { runEarlyWarning } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  head: () => ({ meta: [{ title: "Patient — NurseGuard AI" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const patient = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const vitals = useQuery({
    queryKey: ["patient-vitals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitals").select("*").eq("patient_id", id)
        .order("recorded_at", { ascending: true }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const meds = useQuery({
    queryKey: ["patient-meds", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("medications").select("*").eq("patient_id", id).eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const notes = useQuery({
    queryKey: ["patient-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nursing_notes").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`vitals-${id}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vitals", filter: `patient_id=eq.${id}` },
      () => qc.invalidateQueries({ queryKey: ["patient-vitals", id] }),
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const addNote = async () => {
    if (!note.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("nursing_notes").insert({ patient_id: id, body: note.trim(), author_id: u.user?.id });
    if (error) { toast.error(error.message); return; }
    setNote("");
    qc.invalidateQueries({ queryKey: ["patient-notes", id] });
    toast.success("Note saved");
  };

  const runAI = async () => {
    setAiBusy(true);
    try {
      const res = await runEarlyWarning({ data: { patient_id: id } });
      setAiResult(res.summary);
      toast.success(`Risk: ${res.risk}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally { setAiBusy(false); }
  };

  const p = patient.data;
  const chartData = (vitals.data ?? []).map((v) => ({
    t: new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    HR: v.heart_rate, SpO2: v.spo2, Sys: v.systolic_bp, Dia: v.diastolic_bp, Temp: v.temperature_c,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/patients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{p?.full_name ?? "Patient"}</h1>
          <p className="text-sm text-muted-foreground">{p?.mrn ?? "—"} · {p?.sex ?? "—"} · {p?.date_of_birth ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Vitals trend</h2>
            <Button asChild size="sm" variant="outline"><Link to="/vitals/new" search={{ patient: id }}>Record</Link></Button>
          </div>
          {chartData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="t" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="HR" stroke="var(--color-chart-1)" dot={false} />
                  <Line type="monotone" dataKey="SpO2" stroke="var(--color-chart-2)" dot={false} />
                  <Line type="monotone" dataKey="Sys" stroke="var(--color-chart-4)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="mt-4 text-sm text-muted-foreground">No vitals recorded yet.</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /><h2 className="font-semibold">AI early warning</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">Risk scoring on the latest vitals.</p>
          <Button onClick={runAI} disabled={aiBusy} className="mt-3 w-full" size="sm">
            <Sparkles className="mr-2 h-4 w-4" /> {aiBusy ? "Analyzing…" : "Run analysis"}
          </Button>
          {aiResult && <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary p-3 text-sm">{aiResult}</p>}
          <p className="mt-3 text-[10px] text-muted-foreground">Clinical decision support, not a diagnosis.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Active medications</h2>
          {meds.data?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {meds.data.map((m) => (
                <li key={m.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.dosage} · {m.frequency} {m.route ? `· ${m.route}` : ""}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No active medications.</p>}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Nursing notes</h2>
          <Textarea className="mt-3" rows={3} placeholder="New note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={addNote} size="sm" className="mt-2">Save note</Button>
          <ul className="mt-4 space-y-2">
            {(notes.data ?? []).map((n) => (
              <li key={n.id} className="rounded-md border border-border p-3 text-sm">
                <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
