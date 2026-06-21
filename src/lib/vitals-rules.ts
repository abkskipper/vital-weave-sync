export type VitalIssue = { severity: "warning" | "critical"; title: string; body: string };

export type VitalsInput = {
  heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  spo2?: number | null;
  temperature_c?: number | null;
  respiratory_rate?: number | null;
  blood_sugar_mgdl?: number | null;
};

export function evaluateVitals(v: VitalsInput): VitalIssue[] {
  const out: VitalIssue[] = [];
  if (v.heart_rate != null) {
    if (v.heart_rate < 40 || v.heart_rate > 130) out.push({ severity: "critical", title: "Critical heart rate", body: `HR ${v.heart_rate} bpm` });
    else if (v.heart_rate < 50 || v.heart_rate > 110) out.push({ severity: "warning", title: "Abnormal heart rate", body: `HR ${v.heart_rate} bpm` });
  }
  if (v.spo2 != null) {
    if (v.spo2 < 90) out.push({ severity: "critical", title: "Low oxygen saturation", body: `SpO₂ ${v.spo2}%` });
    else if (v.spo2 < 94) out.push({ severity: "warning", title: "Reduced SpO₂", body: `SpO₂ ${v.spo2}%` });
  }
  if (v.systolic_bp != null) {
    if (v.systolic_bp < 90 || v.systolic_bp > 180) out.push({ severity: "critical", title: "Critical BP", body: `Systolic ${v.systolic_bp} mmHg` });
    else if (v.systolic_bp < 100 || v.systolic_bp > 160) out.push({ severity: "warning", title: "Abnormal BP", body: `Systolic ${v.systolic_bp} mmHg` });
  }
  if (v.temperature_c != null) {
    if (v.temperature_c >= 39.5 || v.temperature_c <= 35) out.push({ severity: "critical", title: "Critical temperature", body: `${v.temperature_c} °C` });
    else if (v.temperature_c >= 38) out.push({ severity: "warning", title: "Fever", body: `${v.temperature_c} °C` });
  }
  if (v.respiratory_rate != null) {
    if (v.respiratory_rate < 8 || v.respiratory_rate > 30) out.push({ severity: "critical", title: "Critical respiratory rate", body: `RR ${v.respiratory_rate}` });
    else if (v.respiratory_rate < 12 || v.respiratory_rate > 22) out.push({ severity: "warning", title: "Abnormal respiratory rate", body: `RR ${v.respiratory_rate}` });
  }
  if (v.blood_sugar_mgdl != null) {
    if (v.blood_sugar_mgdl < 54 || v.blood_sugar_mgdl > 300) out.push({ severity: "critical", title: "Critical blood sugar", body: `${v.blood_sugar_mgdl} mg/dL` });
    else if (v.blood_sugar_mgdl < 70 || v.blood_sugar_mgdl > 200) out.push({ severity: "warning", title: "Abnormal blood sugar", body: `${v.blood_sugar_mgdl} mg/dL` });
  }
  return out;
}
