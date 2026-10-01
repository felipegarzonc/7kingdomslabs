/**
 * Life's Essential 8 (American Heart Association, Lloyd-Jones et al., Circulation 2022).
 * Eight components scored 0–100; the overall score is their mean. We score only the
 * components we have data for and say how many that is ("6 de 8").
 *
 * Simplifications, stated in the UI:
 * - Diet: the AHA uses the MEPA questionnaire; we approximate it from two lifestyle answers.
 * - Nicotine: "former" is scored 50 (AHA: quit ≥1 year); no secondhand-smoke adjustment.
 * - Blood pressure: no −20 adjustment for treated hypertension (we don't record medication).
 */
import type { SmokingStatus } from "./types";

export type Le8Key = "diet" | "activity" | "nicotine" | "sleep" | "bmi" | "lipids" | "glucose" | "bp";

export interface Le8Input {
  /** Lifestyle answers (src/domain/lifestyle.ts). */
  vegetables?: string | null;
  processed?: string | null;
  lifestyleActivity?: string | null;
  lifestyleSleep?: string | null;
  /** Device data wins over lifestyle answers when present. */
  activityMinutesPerWeek?: number | null;
  sleepHours?: number | null;
  smoking?: SmokingStatus | null;
  bmi?: number | null;
  nonHdl?: number | null;
  fastingGlucose?: number | null;
  hba1c?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
}

export interface Le8Component {
  key: Le8Key;
  label: string;
  score: number;
  /** Where the number came from, in plain Spanish. */
  basis: string;
}

export interface Le8Result {
  score: number;
  category: "high" | "moderate" | "low";
  components: Le8Component[];
  missing: Le8Key[];
}

export const LE8_LABEL: Record<Le8Key, string> = {
  diet: "Alimentación",
  activity: "Actividad física",
  nicotine: "Nicotina",
  sleep: "Sueño",
  bmi: "Peso (IMC)",
  lipids: "Colesterol no-HDL",
  glucose: "Glucosa",
  bp: "Presión arterial",
};

const ORDER: Le8Key[] = ["diet", "activity", "nicotine", "sleep", "bmi", "lipids", "glucose", "bp"];

export function dietScore(vegetables: string, processed: string): number | null {
  const v = { "0_1": 0, "2_3": 1, "4plus": 2 }[vegetables];
  const p = { daily: 0, weekly: 1, rare: 2 }[processed];
  if (v === undefined || p === undefined) return null;
  return [0, 25, 50, 80, 100][v + p];
}

export function activityScore(minutesPerWeek: number): number {
  const m = minutesPerWeek;
  if (m >= 150) return 100;
  if (m >= 120) return 90;
  if (m >= 90) return 80;
  if (m >= 60) return 60;
  if (m >= 30) return 40;
  if (m >= 1) return 20;
  return 0;
}

export function sleepScore(hours: number): number {
  const h = hours;
  if (h >= 7 && h < 9) return 100;
  if (h >= 9 && h < 10) return 90;
  if (h >= 6 && h < 7) return 70;
  if ((h >= 5 && h < 6) || h >= 10) return 40;
  if (h >= 4 && h < 5) return 20;
  return 0;
}

export function nicotineScore(s: SmokingStatus): number {
  return { never: 100, former: 50, current: 0 }[s];
}

export function bmiScore(bmi: number): number {
  if (bmi < 25) return 100;
  if (bmi < 30) return 70;
  if (bmi < 35) return 30;
  if (bmi < 40) return 15;
  return 0;
}

export function lipidScore(nonHdl: number): number {
  if (nonHdl < 130) return 100;
  if (nonHdl < 160) return 60;
  if (nonHdl < 190) return 40;
  if (nonHdl < 220) return 20;
  return 0;
}

export function glucoseScore(fbg: number | null, a1c: number | null): number | null {
  if (a1c !== null && a1c >= 6.5) {
    if (a1c < 7) return 40;
    if (a1c < 8) return 30;
    if (a1c < 9) return 20;
    if (a1c < 10) return 10;
    return 0;
  }
  if (fbg !== null && fbg >= 126 && a1c === null) return 40;
  const pre = (fbg !== null && fbg >= 100) || (a1c !== null && a1c >= 5.7);
  if (pre) return 60;
  if (fbg !== null || a1c !== null) return 100;
  return null;
}

export function bpScore(sys: number, dia: number): number {
  if (sys >= 160 || dia >= 100) return 0;
  if (sys >= 140 || dia >= 90) return 25;
  if (sys >= 130 || dia >= 80) return 50;
  if (sys >= 120) return 75;
  return 100;
}

/** Midpoints of the lifestyle answers, used only when there is no device data. */
const ACTIVITY_ANSWER: Record<string, number> = { none: 0, lt60: 30, "60_150": 105, gt150: 150 };
const SLEEP_ANSWER: Record<string, number> = { lt6: 5.5, "6_7": 6.5, "7_8": 7.5, gt8: 8.5 };

export function le8(input: Le8Input): Le8Result | null {
  const got = new Map<Le8Key, Omit<Le8Component, "key" | "label">>();
  if (input.vegetables && input.processed) {
    const s = dietScore(input.vegetables, input.processed);
    if (s !== null) got.set("diet", { score: s, basis: "Aproximado con tus respuestas de verduras y ultraprocesados" });
  }
  if (input.activityMinutesPerWeek != null) {
    got.set("activity", { score: activityScore(input.activityMinutesPerWeek), basis: `${input.activityMinutesPerWeek} min/semana según tu dispositivo` });
  } else if (input.lifestyleActivity && input.lifestyleActivity in ACTIVITY_ANSWER) {
    got.set("activity", { score: activityScore(ACTIVITY_ANSWER[input.lifestyleActivity]), basis: "Según lo que contaste al empezar" });
  }
  if (input.smoking) got.set("nicotine", { score: nicotineScore(input.smoking), basis: "Según tu perfil" });
  if (input.sleepHours != null) {
    got.set("sleep", { score: sleepScore(input.sleepHours), basis: `${input.sleepHours} h por noche según tu dispositivo` });
  } else if (input.lifestyleSleep && input.lifestyleSleep in SLEEP_ANSWER) {
    got.set("sleep", { score: sleepScore(SLEEP_ANSWER[input.lifestyleSleep]), basis: "Según lo que contaste al empezar" });
  }
  if (input.bmi != null) got.set("bmi", { score: bmiScore(input.bmi), basis: `IMC ${input.bmi}` });
  if (input.nonHdl != null) got.set("lipids", { score: lipidScore(input.nonHdl), basis: `No-HDL ${input.nonHdl} mg/dL` });
  const g = glucoseScore(input.fastingGlucose ?? null, input.hba1c ?? null);
  if (g !== null) {
    const parts = [input.fastingGlucose != null ? `glucosa ${input.fastingGlucose} mg/dL` : null, input.hba1c != null ? `HbA1c ${input.hba1c} %` : null].filter(Boolean);
    got.set("glucose", { score: g, basis: parts.join(", ") });
  }
  if (input.systolic != null && input.diastolic != null) {
    got.set("bp", { score: bpScore(input.systolic, input.diastolic), basis: `Promedio ${Math.round(input.systolic)}/${Math.round(input.diastolic)} mmHg` });
  }
  if (!got.size) return null;
  const components = ORDER.filter((k) => got.has(k)).map((k) => ({ key: k, label: LE8_LABEL[k], ...got.get(k)! }));
  const score = Math.round(components.reduce((a, c) => a + c.score, 0) / components.length);
  return {
    score,
    category: score >= 80 ? "high" : score >= 50 ? "moderate" : "low",
    components,
    missing: ORDER.filter((k) => !got.has(k)),
  };
}
