import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [patientId, setPatientId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const patients = useQuery({
    queryKey: ["reports-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, mrn, date_of_birth, sex, medical_history, allergies")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const generateChart = async () => {
    if (!patientId) return toast.error("Select a patient");
    setBusy(true);
    try {
      const patient = patients.data?.find((p) => p.id === patientId);
      if (!patient) throw new Error("Patient not found");

      const [{ data: vitals }, { data: meds }, { data: notes }, { data: alerts }] = await Promise.all([
        supabase.from("vitals").select("*").eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(30),
        supabase.from("medications").select("*").eq("patient_id", patientId).eq("active", true),
        supabase.from("nursing_notes").select("body, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(10),
        supabase.from("alerts").select("severity, title, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(10),
      ]);

      const doc = new jsPDF();
      const margin = 14;
      let y = margin;

      doc.setFontSize(18);
      doc.setTextColor(20);
      doc.text("NurseGuard AI — Patient Chart", margin, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
      y += 8;

      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(patient.full_name, margin, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(80);
      const dob = patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—";
      doc.text(`MRN: ${patient.mrn ?? "—"}    DOB: ${dob}    Sex: ${patient.sex ?? "—"}`, margin, y);
      y += 4;
      doc.text(`Diagnosis: ${patient.medical_history ?? "—"}`, margin, y);
      y += 4;
      doc.text(`Allergies: ${patient.allergies ?? "—"}`, margin, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Recorded", "HR", "BP", "SpO₂", "Temp", "RR", "BG"]],
        body: (vitals ?? []).map((v) => [
          new Date(v.recorded_at).toLocaleString(),
          v.heart_rate ?? "—",
          v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : "—",
          v.spo2 != null ? `${v.spo2}%` : "—",
          v.temperature_c != null ? `${v.temperature_c}°C` : "—",
          v.respiratory_rate ?? "—",
          v.blood_sugar_mgdl ?? "—",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
        margin: { left: margin, right: margin },
      });

      autoTable(doc, {
        head: [["Active medications", "Dose", "Frequency", "Route"]],
        body: (meds ?? []).map((m) => [m.name, m.dosage ?? "—", m.frequency ?? "—", m.route ?? "—"]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
        margin: { left: margin, right: margin },
      });

      autoTable(doc, {
        head: [["Recent alerts", "Severity", "When"]],
        body: (alerts ?? []).map((a) => [a.title, a.severity, new Date(a.created_at).toLocaleString()]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [185, 28, 28] },
        margin: { left: margin, right: margin },
      });

      autoTable(doc, {
        head: [["Recent nursing notes"]],
        body: (notes ?? []).map((n) => [`${new Date(n.created_at).toLocaleString()} — ${n.body}`]),
        styles: { fontSize: 8, cellWidth: "wrap" },
        headStyles: { fillColor: [30, 64, 175] },
        margin: { left: margin, right: margin },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text(
          `NurseGuard AI — Confidential clinical record — Page ${i} of ${pageCount}`,
          margin,
          doc.internal.pageSize.getHeight() - 8,
        );
      }

      const safeName = patient.full_name.replace(/[^a-z0-9]/gi, "_");
      doc.save(`chart_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Chart downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Export patient charts as PDF for handover or records.</p>
      </header>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Patient chart export</h2>
        <div className="space-y-2">
          <Label>Patient</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
            <SelectContent>
              {patients.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}{p.mrn ? ` — ${p.mrn}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generateChart} disabled={busy || !patientId}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
          Download chart PDF
        </Button>
        <p className="text-xs text-muted-foreground">
          Includes demographics, last 30 vitals, active medications, recent alerts and nursing notes.
        </p>
      </Card>
    </div>
  );
}
