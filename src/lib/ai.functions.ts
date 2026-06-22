import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ patient_id: z.string().uuid() });

const assistantSchema = z.object({
  patient_id: z.string().uuid(),
  mode: z.enum(["nursing_note", "handover", "care_plan", "patient_education"]),
  context: z.string().max(2000).optional(),
});

export const runEarlyWarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: vitals } = await supabase
      .from("vitals").select("*")
      .eq("patient_id", data.patient_id)
      .order("recorded_at", { ascending: false }).limit(8);

    if (!vitals?.length) {
      return { risk: "unknown" as const, summary: "No vitals on record yet." };
    }

    const latest = vitals[0];
    const compact = vitals.map((v) => ({
      at: v.recorded_at,
      HR: v.heart_rate, SpO2: v.spo2,
      BP: v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : null,
      Temp: v.temperature_c, RR: v.respiratory_rate, BG: v.blood_sugar_mgdl,
    }));

    const apiKey = process.env.LOVABLE_API_KEY;
    let summary = "";
    let risk: "low" | "moderate" | "high" | "critical" | "unknown" = "unknown";

    if (apiKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an early-warning clinical assistant. Output a JSON object {\"risk\":\"low|moderate|high|critical\",\"summary\":\"...\"}. Summary should be 2-4 sentences, plain English, identify concerning trends, and end with a recommended clinical action. Never diagnose." },
              { role: "user", content: `Latest 8 vitals (newest first): ${JSON.stringify(compact)}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (res.ok) {
          const j = await res.json();
          const content = j.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            risk = parsed.risk ?? "unknown";
            summary = parsed.summary ?? "";
          }
        }
      } catch (e) {
        console.error("AI gateway error", e);
      }
    }

    if (!summary) {
      const concerns: string[] = [];
      if (latest.spo2 != null && latest.spo2 < 94) concerns.push(`SpO₂ ${latest.spo2}%`);
      if (latest.heart_rate != null && (latest.heart_rate < 50 || latest.heart_rate > 110)) concerns.push(`HR ${latest.heart_rate}`);
      if (latest.temperature_c != null && latest.temperature_c >= 38) concerns.push(`temp ${latest.temperature_c}°C`);
      risk = concerns.length >= 2 ? "high" : concerns.length === 1 ? "moderate" : "low";
      summary = concerns.length
        ? `Concerning findings: ${concerns.join(", ")}. Reassess in 15 minutes and consider clinician escalation.`
        : "Latest vitals appear within normal limits. Continue routine monitoring.";
    }

    if (risk === "high" || risk === "critical") {
      await supabase.from("alerts").insert({
        patient_id: data.patient_id,
        severity: risk === "critical" ? "critical" : "warning",
        category: "ai_early_warning",
        title: `AI early warning: ${risk} risk`,
        body: summary,
        source: `ai:${userId}`,
      });
    }

    return { risk, summary };
  });

const MODE_PROMPTS: Record<string, string> = {
  nursing_note: "Draft a concise SOAP nursing note (Subjective, Objective, Assessment, Plan). 6-10 lines total. Plain English, no diagnosis.",
  handover: "Draft an SBAR shift handover (Situation, Background, Assessment, Recommendation). 6-10 lines total.",
  care_plan: "Draft a nursing care plan with 3-5 prioritized problems. For each: nursing diagnosis (NANDA-style problem statement), goal, 2-3 interventions, evaluation criterion.",
  patient_education: "Draft a short, plain-language patient education sheet (200-300 words) tailored to this patient's condition and current meds. Use bullet points and a 'when to seek help' section.",
};

export const runNursingAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assistantSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [{ data: patient }, { data: vitals }, { data: meds }, { data: notes }] = await Promise.all([
      supabase.from("patients").select("full_name, date_of_birth, sex, medical_history, allergies").eq("id", data.patient_id).maybeSingle(),
      supabase.from("vitals").select("recorded_at, heart_rate, systolic_bp, diastolic_bp, spo2, temperature_c, respiratory_rate, blood_sugar_mgdl").eq("patient_id", data.patient_id).order("recorded_at", { ascending: false }).limit(5),
      supabase.from("medications").select("name, dosage, frequency, route").eq("patient_id", data.patient_id).eq("active", true),
      supabase.from("nursing_notes").select("body, created_at").eq("patient_id", data.patient_id).order("created_at", { ascending: false }).limit(3),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { content: "AI is not configured. Set LOVABLE_API_KEY to enable the nursing assistant." };
    }

    const payload = {
      patient,
      recent_vitals: vitals ?? [],
      active_medications: meds ?? [],
      recent_notes: notes ?? [],
      additional_context: data.context ?? null,
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are a clinical nursing assistant supporting licensed nurses. ${MODE_PROMPTS[data.mode]} End with the line: "— AI draft. Verify before charting."` },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${text}`);
    }
    const j = await res.json();
    const content: string = j.choices?.[0]?.message?.content ?? "No content returned.";
    return { content };
  });
