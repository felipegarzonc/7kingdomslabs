/**
 * Data from connected devices and apps, normalised to one daily row per metric.
 * Pure: the Strava and Apple Health clients live in src/lib.
 */
import { addDays, type Pillar } from "./habits";
import type { MeasurementType } from "./types";

export type DeviceSource = "strava" | "apple_health";

export const SOURCE_LABEL: Record<string, string> = {
  manual: "a mano",
  checkin: "revisión semanal",
  abpm: "MAPA",
  strava: "Strava",
  apple_health: "Apple Salud",
};

/** One value to store. `external_id` makes re-imports idempotent. */
export interface ImportedRow {
  type: MeasurementType;
  value: number;
  /** ISO timestamp. Daily totals are stamped at noon Colombia time. */
  measured_at: string;
  external_id: string;
  group_id_key?: string;
}

/** What a day of device data says, for logging habits automatically. */
export interface DayActivity {
  day: string;
  exerciseMinutes: number;
  steps: number;
  strength: boolean;
}

export const noonColombia = (day: string) => new Date(`${day}T12:00:00-05:00`).toISOString();

const round1 = (n: number) => Math.round(n * 10) / 10;

// ─── Strava ─────────────────────────────────────────────────────────────────

export interface StravaActivity {
  id: number;
  sport_type?: string;
  type?: string;
  moving_time: number;
  /** Local wall-clock time, formatted as UTC ("2026-10-01T06:30:00Z"). */
  start_date_local: string;
}

const STRENGTH_SPORTS = new Set(["WeightTraining", "Crossfit"]);

export function isStrengthSport(sport: string | undefined): boolean {
  return !!sport && STRENGTH_SPORTS.has(sport);
}

/** Daily exercise totals from Strava activities (one row per day). */
export function stravaDays(activities: StravaActivity[]): { rows: ImportedRow[]; days: DayActivity[] } {
  const byDay = new Map<string, DayActivity>();
  for (const a of activities) {
    const day = a.start_date_local.slice(0, 10);
    const d = byDay.get(day) ?? { day, exerciseMinutes: 0, steps: 0, strength: false };
    d.exerciseMinutes += Math.max(0, a.moving_time) / 60;
    d.strength ||= isStrengthSport(a.sport_type ?? a.type);
    byDay.set(day, d);
  }
  const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  for (const d of days) d.exerciseMinutes = Math.round(d.exerciseMinutes);
  return {
    days,
    rows: days.map((d) => ({ type: "exercise_minutes", value: d.exerciseMinutes, measured_at: noonColombia(d.day), external_id: `day:${d.day}` })),
  };
}

// ─── Apple Health ───────────────────────────────────────────────────────────
// Accepts the JSON that the "Health Auto Export" iOS app posts (REST API
// automation), and a flat format for Shortcuts:
//   {"date": "2026-10-01", "steps": 8000, "sleep_hours": 7.2, "resting_hr": 58, ...}

interface HaeSample {
  date?: string;
  qty?: number;
  systolic?: number;
  diastolic?: number;
  totalSleep?: number;
  asleep?: number;
  core?: number;
  deep?: number;
  rem?: number;
}
interface HaeMetric {
  name?: string;
  units?: string;
  data?: HaeSample[];
}
interface HaeWorkout {
  name?: string;
  start?: string;
}

const FLAT_KEYS: Record<string, MeasurementType> = {
  steps: "steps",
  sleep_hours: "sleep_hours",
  resting_hr: "resting_hr",
  weight: "weight",
  exercise_minutes: "exercise_minutes",
  vo2max: "vo2max",
  hrv_ms: "hrv_ms",
  sleep_deep_hours: "sleep_deep_hours",
  sleep_rem_hours: "sleep_rem_hours",
};

type Agg = "sum" | "mean" | "last";
const HAE_METRICS: Record<string, { type: MeasurementType; agg: Agg }> = {
  step_count: { type: "steps", agg: "sum" },
  apple_exercise_time: { type: "exercise_minutes", agg: "sum" },
  resting_heart_rate: { type: "resting_hr", agg: "mean" },
  weight_body_mass: { type: "weight", agg: "last" },
  vo2_max: { type: "vo2max", agg: "last" },
  sleep_analysis: { type: "sleep_hours", agg: "sum" },
  heart_rate_variability: { type: "hrv_ms", agg: "mean" },
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const dayOf = (s: string | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

function sleepHours(s: HaeSample): number | null {
  if (isNum(s.totalSleep)) return s.totalSleep;
  if (isNum(s.asleep) && s.asleep > 0) return s.asleep;
  const parts = [s.core, s.deep, s.rem].filter(isNum);
  if (parts.length) return parts.reduce((a, b) => a + b, 0);
  return isNum(s.qty) ? s.qty : null;
}

function toKg(value: number, units: string | undefined): number {
  return units && /^lb/i.test(units) ? value * 0.45359237 : value;
}

export function parseAppleHealth(payload: unknown): { rows: ImportedRow[]; days: DayActivity[] } {
  const acc = new Map<string, { type: MeasurementType; agg: Agg; day: string; values: number[] }>();
  const add = (type: MeasurementType, agg: Agg, day: string, v: number) => {
    const k = `${type}:${day}`;
    const e = acc.get(k) ?? { type, agg, day, values: [] };
    e.values.push(v);
    acc.set(k, e);
  };
  const bp: ImportedRow[] = [];
  const strengthDays = new Set<string>();

  const p = payload as { data?: { metrics?: HaeMetric[]; workouts?: HaeWorkout[] } } | Record<string, unknown>[] | Record<string, unknown>;
  const hae = !Array.isArray(p) && typeof p === "object" && p && "data" in p ? (p as { data?: { metrics?: HaeMetric[]; workouts?: HaeWorkout[] } }).data : null;

  if (hae) {
    for (const m of hae.metrics ?? []) {
      if (m.name === "blood_pressure") {
        for (const s of m.data ?? []) {
          const day = dayOf(s.date);
          if (!day || !isNum(s.systolic) || !isNum(s.diastolic)) continue;
          const at = new Date(s.date!.replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2"));
          const iso = Number.isNaN(at.getTime()) ? noonColombia(day) : at.toISOString();
          bp.push(
            { type: "bp_systolic", value: s.systolic, measured_at: iso, external_id: `bp:${s.date}`, group_id_key: `bp:${s.date}` },
            { type: "bp_diastolic", value: s.diastolic, measured_at: iso, external_id: `bp:${s.date}`, group_id_key: `bp:${s.date}` },
          );
        }
        continue;
      }
      const spec = m.name ? HAE_METRICS[m.name] : undefined;
      if (!spec) continue;
      for (const s of m.data ?? []) {
        const day = dayOf(s.date);
        if (!day) continue;
        if (spec.type === "sleep_hours") {
          if (isNum(s.deep) && s.deep > 0) add("sleep_deep_hours", "sum", day, s.deep);
          if (isNum(s.rem) && s.rem > 0) add("sleep_rem_hours", "sum", day, s.rem);
        }
        let v = spec.type === "sleep_hours" ? sleepHours(s) : isNum(s.qty) ? s.qty : null;
        if (v === null) continue;
        if (spec.type === "weight") v = toKg(v, m.units);
        add(spec.type, spec.agg, day, v);
      }
    }
    for (const w of hae.workouts ?? []) {
      const day = dayOf(w.start);
      if (day && w.name && /strength|fuerza|crossfit/i.test(w.name)) strengthDays.add(day);
    }
  } else {
    const entries = (Array.isArray(p) ? p : [p]) as unknown[];
    for (const raw of entries) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const day = dayOf(typeof e.date === "string" ? e.date : undefined);
      if (!day) continue;
      for (const [key, type] of Object.entries(FLAT_KEYS)) {
        const v = Number(e[key]);
        if (e[key] !== undefined && e[key] !== null && e[key] !== "" && Number.isFinite(v)) add(type, "last", day, v);
      }
      const sys = Number(e.systolic);
      const dia = Number(e.diastolic);
      if (e.systolic != null && e.diastolic != null && Number.isFinite(sys) && Number.isFinite(dia)) {
        bp.push(
          { type: "bp_systolic", value: sys, measured_at: noonColombia(day), external_id: `bp:${day}`, group_id_key: `bp:${day}` },
          { type: "bp_diastolic", value: dia, measured_at: noonColombia(day), external_id: `bp:${day}`, group_id_key: `bp:${day}` },
        );
      }
      if (e.strength === true) strengthDays.add(day);
    }
  }

  const rows: ImportedRow[] = [];
  for (const e of acc.values()) {
    const v = e.agg === "sum" ? e.values.reduce((a, b) => a + b, 0) : e.agg === "mean" ? e.values.reduce((a, b) => a + b, 0) / e.values.length : e.values[e.values.length - 1];
    const value = e.type === "steps" || e.type === "exercise_minutes" || e.type === "resting_hr" || e.type === "hrv_ms" ? Math.round(v) : round1(v);
    rows.push({ type: e.type, value, measured_at: noonColombia(e.day), external_id: `day:${e.day}` });
  }
  rows.push(...bp);

  const dayKeys = new Set([...acc.values()].map((e) => e.day).concat([...strengthDays]));
  const valueOf = (type: MeasurementType, day: string) => rows.find((r) => r.type === type && r.external_id === `day:${day}`)?.value ?? 0;
  const days = [...dayKeys].sort().map((day) => ({ day, exerciseMinutes: valueOf("exercise_minutes", day), steps: valueOf("steps", day), strength: strengthDays.has(day) }));
  return { rows, days };
}

// ─── Habits logged by devices ───────────────────────────────────────────────

export const AUTO_MIN_EXERCISE_MINUTES = 10;
export const AUTO_MIN_STEPS = 7000;
/** Devices only fill in the last week; older days stay as the person left them. */
export const AUTO_LOG_WINDOW_DAYS = 7;

export interface HabitForAutoLog {
  id: string;
  pillar: Pillar;
  status: string;
  started_on: string | null;
}

/** Which (habit, day) pairs the device data proves done. Only movement and strength habits qualify. */
export function autoHabitLogs(habits: HabitForAutoLog[], days: DayActivity[], today: string): Array<{ habit_id: string; day: string }> {
  const from = addDays(today, -(AUTO_LOG_WINDOW_DAYS - 1));
  const out: Array<{ habit_id: string; day: string }> = [];
  for (const h of habits) {
    if (h.status !== "active" || !h.started_on) continue;
    for (const d of days) {
      if (d.day < from || d.day > today || d.day < h.started_on) continue;
      const moved = d.exerciseMinutes >= AUTO_MIN_EXERCISE_MINUTES || d.steps >= AUTO_MIN_STEPS;
      if ((h.pillar === "movimiento" && moved) || (h.pillar === "fuerza" && d.strength)) out.push({ habit_id: h.id, day: d.day });
    }
  }
  return out;
}

// ─── Summary for the coach ──────────────────────────────────────────────────

export interface DeviceSummary {
  days: number;
  steps_per_day: number | null;
  sleep_hours: number | null;
  exercise_minutes_per_week: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
}

/** Averages of the last `days` days of device data (null when there is none). */
export function deviceSummary(rows: Array<{ type: string; value: number; measured_at: string; source: string }>, today: string, days = 14): DeviceSummary | null {
  const from = noonColombia(addDays(today, -(days - 1))).slice(0, 10);
  const mine = rows.filter((r) => (r.source === "strava" || r.source === "apple_health") && r.measured_at.slice(0, 10) >= from);
  if (!mine.length) return null;
  const mean = (t: string) => {
    const v = mine.filter((r) => r.type === t).map((r) => Number(r.value));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const exercise = mine.filter((r) => r.type === "exercise_minutes");
  // Sum per day first: Strava and Apple Health may both report the same day; keep the larger.
  const perDay = new Map<string, number>();
  for (const r of exercise) perDay.set(r.measured_at.slice(0, 10), Math.max(perDay.get(r.measured_at.slice(0, 10)) ?? 0, Number(r.value)));
  const total = [...perDay.values()].reduce((a, b) => a + b, 0);
  const steps = mean("steps");
  const sleep = mean("sleep_hours");
  const hr = mean("resting_hr");
  const hrv = mean("hrv_ms");
  return {
    days,
    steps_per_day: steps === null ? null : Math.round(steps),
    sleep_hours: sleep === null ? null : round1(sleep),
    exercise_minutes_per_week: exercise.length ? Math.round((total / days) * 7) : null,
    resting_hr: hr === null ? null : Math.round(hr),
    hrv_ms: hrv === null ? null : Math.round(hrv),
  };
}
