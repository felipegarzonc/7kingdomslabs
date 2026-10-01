import type { Sex } from "./types";
import { round } from "./units";

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obesity";
/** WHO adult BMI categories. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "underweight";
  if (value < 25) return "normal";
  if (value < 30) return "overweight";
  return "obesity";
}

/** Waist-to-height ratio. ≥0.5 flags central adiposity (NICE 2022, Ashwell). */
export function waistToHeight(waistCm: number, heightCm: number): number {
  return round(waistCm / heightCm, 3);
}

/** Non-HDL cholesterol (mg/dL). ATP III goal: LDL goal + 30 (<130 for most). */
export function nonHdl(totalCholesterol: number, hdl: number): number {
  return round(totalCholesterol - hdl, 1);
}

/** TG/HDL ratio in mg/dL units. Higher values associate with insulin resistance. */
export function tgHdlRatio(triglycerides: number, hdl: number): number {
  return round(triglycerides / hdl, 2);
}

// ─── FIB-4 (liver fibrosis risk) ─────────────────────────────────────────────

export type Fib4Category = "low" | "indeterminate" | "high";

/**
 * FIB-4 = (age × AST) / (platelets [10⁹/L] × √ALT). Platelets in 10³/µL are
 * numerically identical to 10⁹/L.
 */
export function fib4(age: number, ast: number, alt: number, platelets: number): number | null {
  if (!(age > 0 && ast > 0 && alt > 0 && platelets > 0)) return null;
  return round((age * ast) / (platelets * Math.sqrt(alt)), 2);
}

/** Lower cut-off rises to 2.0 after age 65 (EASL-EASD-EASO 2024 MASLD guideline). */
export function fib4LowCutoff(age: number): number {
  return age > 65 ? 2.0 : 1.3;
}

/** EASL-EASD-EASO 2024: below the low cut-off rules out advanced fibrosis; >2.67 needs hepatology work-up. */
export function fib4Category(value: number, age: number): Fib4Category {
  if (value > 2.67) return "high";
  if (value < fib4LowCutoff(age)) return "low";
  return "indeterminate";
}

// ─── Grip strength ───────────────────────────────────────────────────────────

/** EWGSOP2 (Cruz-Jentoft et al., 2019): probable sarcopenia below 27 kg (men) / 16 kg (women). */
export function lowGripStrength(kg: number, sex: Sex): boolean {
  return sex === "male" ? kg < 27 : kg < 16;
}

export function pulsePressure(systolic: number, diastolic: number): number {
  return systolic - diastolic;
}

// ─── Metabolic syndrome ──────────────────────────────────────────────────────

export interface MetabolicInputs {
  sex: Sex;
  waistCm?: number | null;
  triglycerides?: number | null;
  hdl?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  fastingGlucose?: number | null;
  /** Drug treatment counts as meeting a criterion in both definitions. */
  onBpTreatment?: boolean;
  onLipidTreatment?: boolean;
  onGlucoseTreatment?: boolean;
}

export type CriterionState = "met" | "not_met" | "unknown";

export interface MetabolicSyndromeResult {
  definition: "NCEP_ATP_III" | "IDF";
  present: boolean | null; // null = not enough data to decide
  criteria: Record<"waist" | "triglycerides" | "hdl" | "blood_pressure" | "glucose", CriterionState>;
  metCount: number;
}

function crit(value: number | null | undefined, test: (v: number) => boolean, treated = false): CriterionState {
  if (treated) return "met";
  if (value === null || value === undefined) return "unknown";
  return test(value) ? "met" : "not_met";
}

function bpCriterion(i: MetabolicInputs): CriterionState {
  if (i.onBpTreatment) return "met";
  if (i.systolic == null && i.diastolic == null) return "unknown";
  if ((i.systolic ?? 0) >= 130 || (i.diastolic ?? 0) >= 85) return "met";
  if (i.systolic == null || i.diastolic == null) return "unknown";
  return "not_met";
}

function decide(criteria: MetabolicSyndromeResult["criteria"], needed: number): { present: boolean | null; metCount: number } {
  const states = Object.values(criteria);
  const met = states.filter((s) => s === "met").length;
  const unknown = states.filter((s) => s === "unknown").length;
  if (met >= needed) return { present: true, metCount: met };
  if (met + unknown < needed) return { present: false, metCount: met };
  return { present: null, metCount: met };
}

/**
 * NCEP ATP III, revised (AHA/NHLBI 2005): ≥3 of 5 criteria.
 */
export function metabolicSyndromeATP(i: MetabolicInputs): MetabolicSyndromeResult {
  const criteria = {
    waist: crit(i.waistCm, (w) => (i.sex === "male" ? w > 102 : w > 88)),
    triglycerides: crit(i.triglycerides, (v) => v >= 150, i.onLipidTreatment),
    hdl: crit(i.hdl, (v) => (i.sex === "male" ? v < 40 : v < 50), i.onLipidTreatment),
    blood_pressure: bpCriterion(i),
    glucose: crit(i.fastingGlucose, (v) => v >= 100, i.onGlucoseTreatment),
  };
  return { definition: "NCEP_ATP_III", ...decide(criteria, 3), criteria };
}

/**
 * IDF 2006: central obesity (mandatory) + ≥2 of the other 4.
 * For Central and South American populations the IDF recommends South Asian
 * waist cut-offs until specific data exist: ≥90 cm men, ≥80 cm women.
 */
export function metabolicSyndromeIDF(i: MetabolicInputs): MetabolicSyndromeResult {
  const criteria = {
    waist: crit(i.waistCm, (w) => (i.sex === "male" ? w >= 90 : w >= 80)),
    triglycerides: crit(i.triglycerides, (v) => v >= 150, i.onLipidTreatment),
    hdl: crit(i.hdl, (v) => (i.sex === "male" ? v < 40 : v < 50), i.onLipidTreatment),
    blood_pressure: bpCriterion(i),
    glucose: crit(i.fastingGlucose, (v) => v >= 100, i.onGlucoseTreatment),
  };
  const others = { triglycerides: criteria.triglycerides, hdl: criteria.hdl, blood_pressure: criteria.blood_pressure, glucose: criteria.glucose };
  const rest = decide(others as MetabolicSyndromeResult["criteria"], 2);
  let present: boolean | null;
  if (criteria.waist === "not_met") present = false;
  else if (criteria.waist === "unknown") present = rest.present === false ? false : null;
  else present = rest.present;
  return {
    definition: "IDF",
    present,
    criteria,
    metCount: Object.values(criteria).filter((s) => s === "met").length,
  };
}

// ─── Nocturnal dipping (ABPM / home monitoring) ──────────────────────────────

export type DippingPattern = "extreme_dipper" | "dipper" | "non_dipper" | "reverse_dipper";

export interface BpReading {
  at: string;
  systolic: number;
  diastolic: number;
  /** "day" | "night" as recorded by the device or the participant. */
  period: "day" | "night";
}

export interface DippingResult {
  dayMeanSystolic: number;
  nightMeanSystolic: number;
  dayMeanDiastolic: number;
  nightMeanDiastolic: number;
  /** % fall of systolic from day to night. */
  dipPercent: number;
  pattern: DippingPattern;
  meanPulsePressure: number;
}

/**
 * Systolic night-time dip: ≥20 % extreme, 10–20 % dipper, 0–10 % non-dipper,
 * <0 % reverse (ESH 2023 ABPM practice guidelines).
 */
export function nocturnalDipping(readings: BpReading[]): DippingResult | null {
  const day = readings.filter((r) => r.period === "day");
  const night = readings.filter((r) => r.period === "night");
  if (day.length < 3 || night.length < 3) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const dS = mean(day.map((r) => r.systolic));
  const nS = mean(night.map((r) => r.systolic));
  const dip = ((dS - nS) / dS) * 100;
  let pattern: DippingPattern;
  if (dip >= 20) pattern = "extreme_dipper";
  else if (dip >= 10) pattern = "dipper";
  else if (dip >= 0) pattern = "non_dipper";
  else pattern = "reverse_dipper";
  return {
    dayMeanSystolic: round(dS, 1),
    nightMeanSystolic: round(nS, 1),
    dayMeanDiastolic: round(mean(day.map((r) => r.diastolic)), 1),
    nightMeanDiastolic: round(mean(night.map((r) => r.diastolic)), 1),
    dipPercent: round(dip, 1),
    pattern,
    meanPulsePressure: round(mean(readings.map((r) => r.systolic - r.diastolic)), 1),
  };
}

export type BpCategory = "normal" | "elevated" | "stage1" | "stage2" | "crisis";
/** ACC/AHA 2017 office BP categories. */
export function bpCategory(systolic: number, diastolic: number): BpCategory {
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

/** Isolated systolic hypertension: SBP ≥130 with DBP <80 (ACC/AHA 2017). */
export function isIsolatedSystolic(systolic: number, diastolic: number): boolean {
  return systolic >= 130 && diastolic < 80;
}
