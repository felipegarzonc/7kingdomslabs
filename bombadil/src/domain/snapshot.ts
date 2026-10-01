/**
 * Builds the structured, fully computed snapshot that feeds the interpretive
 * report. The LLM only turns this into prose — every number, flag, trend and
 * escalation level here is computed deterministically.
 */
import { BIOMARKERS, getBiomarker } from "./biomarkers";
import { classify, flagAgainst, resolveRange } from "./classify";
import {
  bmi,
  bmiCategory,
  bpCategory,
  fib4,
  fib4Category,
  fib4LowCutoff,
  isIsolatedSystolic,
  lowGripStrength,
  metabolicSyndromeATP,
  metabolicSyndromeIDF,
  nocturnalDipping,
  nonHdl,
  tgHdlRatio,
  waistToHeight,
  type BpReading,
  type Fib4Category,
} from "./derived";
import { evaluateEscalation, type TriggeredRule } from "./escalation";
import { evaluateGoal, type GoalEvaluation } from "./goals";
import { computeTrend, sortByDate, type Trend } from "./trends";
import type { DatedValue, Flag, MeasurementType, OptimalFlag, Range, Sex, SmokingStatus } from "./types";
import { round } from "./units";

export interface LabPoint {
  code: string;
  /** Canonical value. */
  value: number;
  at: string;
  labReference?: Range | null;
}

export interface MeasurementPoint {
  type: MeasurementType;
  value: number;
  at: string;
  /** Pairs systolic/diastolic readings taken together. */
  groupId?: string | null;
  context?: { arm?: "left" | "right"; period?: "day" | "night"; source?: string } | null;
}

export interface GoalRow {
  id: string;
  metric: string; // MeasurementType or biomarker code
  baseline: number;
  target: number;
  startDate: string;
  deadline: string;
  horizonMonths: number;
}

export interface SnapshotInput {
  sex: Sex;
  birthDate: string | null;
  heightCm: number | null;
  personalGoal?: string | null;
  smokingStatus?: SmokingStatus | null;
  labs: LabPoint[];
  measurements: MeasurementPoint[];
  goals: GoalRow[];
  asOf?: Date;
}

export interface MarkerSummary {
  code: string;
  name: string;
  unit: string;
  latest: DatedValue;
  previous: DatedValue | null;
  flag: Flag;
  optimal: OptimalFlag | null;
  reference: Range | undefined;
  trend: Trend;
  history: DatedValue[];
}

export interface Pattern {
  id: string;
  label: string;
  evidence: string[];
}

export interface Snapshot {
  asOf: string;
  profile: { sex: Sex; age: number | null; heightCm: number | null; personalGoal: string | null; smokingStatus: SmokingStatus | null };
  markers: MarkerSummary[];
  groups: { worsened: string[]; improved: string[]; stable: string[]; singleValue: string[] };
  derived: {
    bmi: { value: number; category: string } | null;
    waistToHeight: number | null;
    nonHdl: number | null;
    tgHdl: number | null;
    /** Liver fibrosis risk from age, AST, ALT and platelets (same lab panel when available). */
    fib4: { value: number; category: Fib4Category; lowCutoff: number; ageAtTest: number; at: string } | null;
    bp: {
      recentMeanSystolic: number;
      recentMeanDiastolic: number;
      readings: number;
      category: string;
      isolatedSystolic: boolean;
    } | null;
    dipping: ReturnType<typeof nocturnalDipping>;
    metabolicSyndrome: { atp: ReturnType<typeof metabolicSyndromeATP>; idf: ReturnType<typeof metabolicSyndromeIDF> };
  };
  measurementsLatest: Partial<Record<MeasurementType, DatedValue>>;
  patterns: Pattern[];
  escalations: TriggeredRule[];
  goals: Array<GoalRow & GoalEvaluation>;
}

export function ageFrom(birthDate: string | null, asOf: Date): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  let age = asOf.getUTCFullYear() - b.getUTCFullYear();
  const m = asOf.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && asOf.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

function latestOf<T extends { at: string }>(xs: T[]): T | null {
  return xs.length ? sortByDate(xs)[xs.length - 1] : null;
}

/** Pair BP rows into readings (by groupId, falling back to identical timestamps). */
export function pairBloodPressure(measurements: MeasurementPoint[]): Array<BpReading & { groupKey: string }> {
  const map = new Map<string, { s?: MeasurementPoint; d?: MeasurementPoint }>();
  for (const m of measurements) {
    if (m.type !== "bp_systolic" && m.type !== "bp_diastolic") continue;
    const key = m.groupId ?? m.at;
    const e = map.get(key) ?? {};
    if (m.type === "bp_systolic") e.s = m;
    else e.d = m;
    map.set(key, e);
  }
  const out: Array<BpReading & { groupKey: string }> = [];
  for (const [key, { s, d }] of map) {
    if (!s || !d) continue;
    const period = s.context?.period ?? inferPeriod(s.at);
    out.push({ at: s.at, systolic: s.value, diastolic: d.value, period, groupKey: key });
  }
  return sortByDate(out);
}

/** Night = 22:00–06:59 local time in Colombia (UTC-5, no DST). */
function inferPeriod(at: string): "day" | "night" {
  const h = (new Date(at).getUTCHours() + 24 - 5) % 24;
  return h >= 22 || h < 7 ? "night" : "day";
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const asOf = input.asOf ?? new Date();
  const { sex } = input;

  // ── Markers ──
  const markers: MarkerSummary[] = [];
  for (const b of BIOMARKERS) {
    const pts = sortByDate(input.labs.filter((l) => l.code === b.code));
    if (!pts.length) continue;
    const last = pts[pts.length - 1];
    const cls = classify(b.code, last.value, sex, last.labReference);
    const ref = resolveRange(b.reference, sex);
    const trend = computeTrend(
      pts.map((p) => ({ at: p.at, value: p.value })),
      b.meaningfulChange,
      b.betterWhen,
      (v) => flagAgainst(v, ref) === "normal",
    );
    markers.push({
      code: b.code,
      name: b.name,
      unit: b.unit,
      latest: { at: last.at, value: last.value },
      previous: pts.length > 1 ? { at: pts[pts.length - 2].at, value: pts[pts.length - 2].value } : null,
      flag: cls.flag,
      optimal: cls.optimal,
      reference: cls.referenceUsed,
      trend,
      history: pts.map((p) => ({ at: p.at, value: p.value })),
    });
  }
  const groups = {
    worsened: markers.filter((m) => m.trend.meaning === "worsening").map((m) => m.code),
    improved: markers.filter((m) => m.trend.meaning === "improving").map((m) => m.code),
    stable: markers.filter((m) => m.trend.meaning === "stable").map((m) => m.code),
    singleValue: markers.filter((m) => m.trend.direction === "insufficient_data").map((m) => m.code),
  };
  const latestValue = (code: string) => markers.find((m) => m.code === code)?.latest.value ?? null;

  // ── Measurements ──
  const measurementsLatest: Snapshot["measurementsLatest"] = {};
  for (const t of MEASUREMENT_TYPES) {
    const l = latestOf(input.measurements.filter((m) => m.type === t));
    if (l) measurementsLatest[t] = { at: l.at, value: l.value };
  }
  const weight = measurementsLatest.weight?.value ?? null;
  const waist = measurementsLatest.waist?.value ?? null;

  const bpReadings = pairBloodPressure(input.measurements);
  const recentFrom = asOf.getTime() - 30 * 24 * 3600 * 1000;
  const recentBp = bpReadings.filter((r) => Date.parse(r.at) >= recentFrom && r.period === "day");
  const bpBase = recentBp.length ? recentBp : bpReadings.slice(-3);
  const bp = bpBase.length
    ? (() => {
        const s = round(bpBase.reduce((a, r) => a + r.systolic, 0) / bpBase.length, 1);
        const d = round(bpBase.reduce((a, r) => a + r.diastolic, 0) / bpBase.length, 1);
        return { recentMeanSystolic: s, recentMeanDiastolic: d, readings: bpBase.length, category: bpCategory(s, d), isolatedSystolic: isIsolatedSystolic(s, d) };
      })()
    : null;

  const tc = latestValue("total_cholesterol");
  const hdl = latestValue("hdl");
  const tg = latestValue("triglycerides");
  const metabolicInputs = {
    sex,
    waistCm: waist,
    triglycerides: tg,
    hdl,
    systolic: bp?.recentMeanSystolic ?? null,
    diastolic: bp?.recentMeanDiastolic ?? null,
    fastingGlucose: latestValue("glucose_fasting"),
  };

  const age = ageFrom(input.birthDate, asOf);
  const derived: Snapshot["derived"] = {
    bmi: weight && input.heightCm ? { value: bmi(weight, input.heightCm), category: bmiCategory(bmi(weight, input.heightCm)) } : null,
    waistToHeight: waist && input.heightCm ? waistToHeight(waist, input.heightCm) : null,
    nonHdl: tc !== null && hdl !== null ? nonHdl(tc, hdl) : null,
    tgHdl: tg !== null && hdl ? tgHdlRatio(tg, hdl) : null,
    fib4: fib4For(markers, input.birthDate),
    bp,
    dipping: nocturnalDipping(bpReadings),
    metabolicSyndrome: { atp: metabolicSyndromeATP(metabolicInputs), idf: metabolicSyndromeIDF(metabolicInputs) },
  };

  // ── Patterns (deterministic connections the report should explain) ──
  const patterns: Pattern[] = [];
  const m = (code: string) => markers.find((x) => x.code === code);
  const metabolicEvidence: string[] = [];
  const hdlM = m("hdl");
  if (hdlM && (hdlM.trend.meaning === "worsening" || hdlM.flag === "low")) metabolicEvidence.push("HDL bajo o descendiendo");
  const tgM = m("triglycerides");
  if (tgM && (tgM.trend.meaning === "worsening" || tgM.flag === "high")) metabolicEvidence.push("triglicéridos altos o en ascenso");
  const liver = ["alt", "ast", "ggt"].map(m).filter((x) => x && (x.trend.meaning === "worsening" || x.flag === "high" || x.optimal === "suboptimal"));
  if (liver.length) metabolicEvidence.push(`enzimas hepáticas elevadas o en ascenso (${liver.map((x) => x!.name).join(", ")})`);
  if (derived.metabolicSyndrome.idf.criteria.waist === "met" || (derived.waistToHeight ?? 0) >= 0.5) metabolicEvidence.push("adiposidad central (cintura)");
  const glu = latestValue("glucose_fasting");
  const a1c = latestValue("hba1c");
  if ((glu !== null && glu >= 100) || (a1c !== null && a1c >= 5.7)) metabolicEvidence.push("glucosa en rango de prediabetes");
  if (derived.tgHdl !== null && derived.tgHdl >= 3) metabolicEvidence.push(`relación TG/HDL elevada (${derived.tgHdl})`);
  if (metabolicEvidence.length >= 2) {
    patterns.push({ id: "metabolic_cluster", label: "Patrón compatible con resistencia a la insulina / síndrome metabólico", evidence: metabolicEvidence });
  }
  if (derived.metabolicSyndrome.atp.present || derived.metabolicSyndrome.idf.present) {
    patterns.push({
      id: "metabolic_syndrome_criteria",
      label: "Cumple criterios de síndrome metabólico",
      evidence: [
        `ATP III: ${derived.metabolicSyndrome.atp.metCount}/5 criterios`,
        `IDF (cortes para Latinoamérica): ${derived.metabolicSyndrome.idf.present ? "cumple" : "no cumple o datos insuficientes"}`,
      ],
    });
  }
  if (bp && (bp.category === "stage1" || bp.category === "stage2" || bp.category === "crisis")) {
    const ev = [`PA media reciente ${bp.recentMeanSystolic}/${bp.recentMeanDiastolic} mmHg (${bp.readings} lecturas)`];
    if (bp.isolatedSystolic) ev.push("predominio sistólico (diastólica <80)");
    if (derived.dipping && derived.dipping.pattern !== "dipper") ev.push(`patrón nocturno ${derived.dipping.pattern} (descenso ${derived.dipping.dipPercent} %)`);
    patterns.push({ id: "blood_pressure", label: bp.isolatedSystolic ? "Presión sistólica elevada" : "Presión arterial elevada", evidence: ev });
  } else if (derived.dipping && (derived.dipping.pattern === "non_dipper" || derived.dipping.pattern === "reverse_dipper")) {
    patterns.push({ id: "non_dipper", label: "Patrón nocturno de presión sin descenso adecuado", evidence: [`descenso nocturno ${derived.dipping.dipPercent} %`] });
  }

  if (derived.fib4 && derived.fib4.category !== "low") {
    patterns.push({
      id: "liver_fibrosis_risk",
      label: derived.fib4.category === "high" ? "FIB-4 alto: riesgo de fibrosis hepática" : "FIB-4 en zona intermedia: fibrosis hepática no descartada",
      evidence: [`FIB-4 ${derived.fib4.value} (corte inferior ${derived.fib4.lowCutoff}, superior 2,67)`],
    });
  }
  const lpa = m("lpa");
  if (lpa && lpa.latest.value > 50) {
    patterns.push({
      id: "lpa_elevated",
      label: "Lp(a) elevada: riesgo cardiovascular heredado",
      evidence: [`Lp(a) ${lpa.latest.value} mg/dL (>50)`, "no cambia con hábitos; hace más importante bajar LDL/ApoB y presión"],
    });
  }
  if (input.smokingStatus === "current") {
    patterns.push({ id: "smoking", label: "Fuma actualmente", evidence: ["fumar resta más de 10 años de vida; dejarlo antes de los 40 elimina ~90 % del exceso de riesgo"] });
  }
  const drinks = measurementsLatest.alcohol_drinks?.value;
  if (drinks !== undefined && drinks > 7) {
    patterns.push({ id: "alcohol_above_low_risk", label: "Alcohol por encima del umbral de menor riesgo", evidence: [`${drinks} tragos en la última semana reportada (menor riesgo: ≤7)`] });
  }
  const grip = measurementsLatest.grip_strength?.value;
  if (grip !== undefined && lowGripStrength(grip, sex)) {
    patterns.push({ id: "low_grip_strength", label: "Fuerza de agarre baja", evidence: [`${grip} kg (umbral EWGSOP2: <${sex === "male" ? 27 : 16} kg)`] });
  }

  // ── Escalations (on the latest values only) ──
  const recentMeasurements = input.measurements.filter((x) => Date.parse(x.at) >= recentFrom);
  const escalations = evaluateEscalation({
    sex,
    biomarkers: markers.map((x) => ({ code: x.code, value: x.latest.value })),
    measurements: recentMeasurements.map((x) => ({ type: x.type, value: x.value })),
    derived: derived.fib4 ? [{ metric: "fib4", value: derived.fib4.value }] : [],
    // Only the FIB-4 rules are age-bounded, and their cut-offs apply to the age at the test.
    age: derived.fib4?.ageAtTest ?? age,
  });

  // ── Goals ──
  const seriesFor = (metric: string): DatedValue[] => {
    if (BIOMARKERS.some((b) => b.code === metric)) return input.labs.filter((l) => l.code === metric).map((l) => ({ at: l.at, value: l.value }));
    return input.measurements.filter((x) => x.type === metric).map((x) => ({ at: x.at, value: x.value }));
  };
  const goals = input.goals.map((g) => ({ ...g, ...evaluateGoal(g, seriesFor(g.metric), asOf) }));

  return {
    asOf: asOf.toISOString(),
    profile: { sex, age, heightCm: input.heightCm, personalGoal: input.personalGoal ?? null, smokingStatus: input.smokingStatus ?? null },
    markers,
    groups,
    derived,
    measurementsLatest,
    patterns,
    escalations,
    goals,
  };
}

/**
 * FIB-4 needs AST, ALT and platelets from the same sample: uses the most
 * recent date that has all three, with the age on that date.
 */
function fib4For(markers: MarkerSummary[], birthDate: string | null): Snapshot["derived"]["fib4"] {
  if (!birthDate) return null;
  const byCode = (code: string) => markers.find((x) => x.code === code)?.history ?? [];
  const ast = byCode("ast");
  const alt = byCode("alt");
  const plt = byCode("platelets");
  const day = (at: string) => at.slice(0, 10);
  for (const a of [...ast].reverse()) {
    const l = alt.find((x) => day(x.at) === day(a.at));
    const p = plt.find((x) => day(x.at) === day(a.at));
    if (!l || !p) continue;
    const age = ageFrom(birthDate, new Date(a.at));
    if (age === null) return null;
    const value = fib4(age, a.value, l.value, p.value);
    if (value === null) return null;
    return { value, category: fib4Category(value, age), lowCutoff: fib4LowCutoff(age), ageAtTest: age, at: a.at };
  }
  return null;
}

/** A label for any goal metric (measurement type or biomarker code). */
export function metricLabel(metric: string): string {
  const measurementLabels: Record<string, string> = MEASUREMENT_LABEL;
  if (measurementLabels[metric]) return measurementLabels[metric];
  try {
    return getBiomarker(metric).name;
  } catch {
    return metric;
  }
}

export const MEASUREMENT_LABEL: Record<MeasurementType, string> = {
  weight: "Peso",
  waist: "Cintura",
  bp_systolic: "Presión sistólica",
  bp_diastolic: "Presión diastólica",
  resting_hr: "Frecuencia cardiaca en reposo",
  sleep_hours: "Horas de sueño",
  exercise_minutes: "Minutos de ejercicio",
  grip_strength: "Fuerza de agarre",
  vo2max: "VO2max estimado",
  alcohol_drinks: "Tragos de alcohol (semana)",
  steps: "Pasos (día)",
  hrv_ms: "Variabilidad cardiaca (HRV)",
  sleep_deep_hours: "Sueño profundo",
  sleep_rem_hours: "Sueño REM",
  protein_g: "Proteína (día)",
};

export const MEASUREMENT_TYPES = Object.keys(MEASUREMENT_LABEL) as MeasurementType[];

export const MEASUREMENT_UNIT: Record<MeasurementType, string> = {
  weight: "kg",
  waist: "cm",
  bp_systolic: "mmHg",
  bp_diastolic: "mmHg",
  resting_hr: "lpm",
  sleep_hours: "h",
  exercise_minutes: "min",
  grip_strength: "kg",
  vo2max: "ml/kg/min",
  alcohol_drinks: "tragos",
  steps: "pasos",
  hrv_ms: "ms",
  sleep_deep_hours: "h",
  sleep_rem_hours: "h",
  protein_g: "g",
};

/** Plausibility bounds to catch typos on manual entry. */
export const MEASUREMENT_BOUNDS: Record<MeasurementType, [number, number]> = {
  weight: [25, 300],
  waist: [40, 200],
  bp_systolic: [60, 260],
  bp_diastolic: [30, 160],
  resting_hr: [25, 220],
  sleep_hours: [0, 16],
  exercise_minutes: [0, 1440],
  grip_strength: [5, 100],
  vo2max: [10, 90],
  alcohol_drinks: [0, 150],
  steps: [0, 100000],
  hrv_ms: [5, 300],
  sleep_deep_hours: [0, 8],
  sleep_rem_hours: [0, 8],
  protein_g: [0, 400],
};
