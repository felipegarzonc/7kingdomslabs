/**
 * SYNTHETIC fixture shaped like the acceptance criterion in docs/BRIEF.md §10:
 * HDL trending down, triglycerides and transaminases up, metabolic syndrome,
 * systolic hypertension with a non-dipper pattern. Not real patient data.
 */
import type { LabPoint, MeasurementPoint, SnapshotInput } from "../snapshot";

const labs: LabPoint[] = [
  // 2023
  { code: "hdl", value: 46, at: "2023-03-10" },
  { code: "triglycerides", value: 150, at: "2023-03-10" },
  { code: "alt", value: 30, at: "2023-03-10" },
  { code: "ast", value: 24, at: "2023-03-10" },
  { code: "glucose_fasting", value: 94, at: "2023-03-10" },
  { code: "total_cholesterol", value: 205, at: "2023-03-10" },
  // 2025
  { code: "hdl", value: 41, at: "2025-04-02" },
  { code: "triglycerides", value: 188, at: "2025-04-02" },
  { code: "alt", value: 41, at: "2025-04-02" },
  { code: "ast", value: 29, at: "2025-04-02" },
  { code: "glucose_fasting", value: 99, at: "2025-04-02" },
  { code: "total_cholesterol", value: 210, at: "2025-04-02" },
  // 2026
  { code: "hdl", value: 37, at: "2026-05-20" },
  { code: "triglycerides", value: 231, at: "2026-05-20" },
  { code: "alt", value: 52, at: "2026-05-20" },
  { code: "ast", value: 36, at: "2026-05-20" },
  { code: "glucose_fasting", value: 102, at: "2026-05-20" },
  { code: "total_cholesterol", value: 212, at: "2026-05-20" },
];

function abpm(): MeasurementPoint[] {
  const out: MeasurementPoint[] = [];
  // Day readings ~146/82, night ~140/78 → dip ≈ 4 % (non-dipper), isolated-systolic-ish.
  const day = [[148, 80], [145, 79], [150, 82], [142, 78], [147, 79]];
  const night = [[141, 76], [139, 75], [142, 77], [138, 74]];
  day.forEach(([s, d], i) => {
    const at = `2026-06-0${i + 1}T15:00:00Z`; // 10:00 Bogotá
    out.push({ type: "bp_systolic", value: s, at, groupId: `d${i}`, context: { period: "day", arm: "left" } });
    out.push({ type: "bp_diastolic", value: d, at, groupId: `d${i}`, context: { period: "day", arm: "left" } });
  });
  night.forEach(([s, d], i) => {
    const at = `2026-06-0${i + 1}T07:00:00Z`; // 02:00 Bogotá
    out.push({ type: "bp_systolic", value: s, at, groupId: `n${i}`, context: { period: "night", arm: "left" } });
    out.push({ type: "bp_diastolic", value: d, at, groupId: `n${i}`, context: { period: "night", arm: "left" } });
  });
  return out;
}

export const userZero: SnapshotInput = {
  sex: "male",
  birthDate: "1982-08-15",
  heightCm: 176,
  personalGoal: "Llegar a los 80 con energía y sin medicamentos.",
  labs,
  measurements: [
    { type: "weight", value: 88, at: "2026-06-01T12:00:00Z" },
    { type: "waist", value: 98, at: "2026-06-01T12:00:00Z" },
    ...abpm(),
  ],
  goals: [],
  asOf: new Date("2026-06-10T12:00:00Z"),
};
