/**
 * Habit engine. Deterministic: streaks, weekly progress and the weekly
 * "level up / make it smaller" recommendation never depend on the LLM.
 *
 * Behaviour-design principles (Fogg "Tiny Habits", Gollwitzer implementation
 * intentions, Lally et al. 2010 on habit formation): start tiny, anchor to an
 * existing routine, progress only once it feels easy, shrink instead of quit.
 */

export const PILLARS = ["movimiento", "fuerza", "nutricion", "sueno", "estres", "conexion", "sustancias"] as const;
export type Pillar = (typeof PILLARS)[number];

export const PILLAR_LABEL: Record<Pillar, string> = {
  movimiento: "Movimiento y cardio",
  fuerza: "Fuerza",
  nutricion: "Nutrición",
  sueno: "Sueño",
  estres: "Estrés y mente",
  conexion: "Relaciones",
  sustancias: "Alcohol y tabaco",
};

/** Starting with more than three new habits at once rarely sticks. */
export const MAX_ACTIVE_HABITS = 3;

export interface HabitForStats {
  target_per_week: number;
  /** YYYY-MM-DD; the first day the habit counted. */
  started_on: string;
}

const DAY = 86_400_000;

/** Today's date in Colombia (UTC-5, no DST) as YYYY-MM-DD. */
export function todayInColombia(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

function toTime(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

export function addDays(day: string, n: number): string {
  return new Date(toTime(day) + n * DAY).toISOString().slice(0, 10);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const dow = (new Date(toTime(day)).getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(day, -dow);
}

function countBetween(days: Set<string>, from: string, toInclusive: string): number {
  let n = 0;
  for (let d = from; d <= toInclusive; d = addDays(d, 1)) if (days.has(d)) n++;
  return n;
}

export interface WeekProgress {
  done: number;
  target: number;
  /** Days left in the week including today. */
  daysLeft: number;
  met: boolean;
}

export function weekProgress(habit: HabitForStats, logDays: string[], today: string): WeekProgress {
  const days = new Set(logDays);
  const start = weekStart(today);
  const done = countBetween(days, start, today);
  const daysLeft = 7 - Math.round((toTime(today) - toTime(start)) / DAY);
  return { done, target: habit.target_per_week, daysLeft, met: done >= habit.target_per_week };
}

/**
 * Daily habits (7/week): consecutive days ending today (or yesterday, so the
 * streak is not "lost" before the day is over). Other frequencies: consecutive
 * weeks that met the target, counting the current week once it is met.
 */
export function streak(habit: HabitForStats, logDays: string[], today: string): { value: number; unit: "días" | "semanas" } {
  const days = new Set(logDays);
  if (habit.target_per_week >= 7) {
    let d = days.has(today) ? today : addDays(today, -1);
    let n = 0;
    while (days.has(d) && d >= habit.started_on) {
      n++;
      d = addDays(d, -1);
    }
    return { value: n, unit: "días" };
  }
  let n = weekProgress(habit, logDays, today).met ? 1 : 0;
  for (let ws = addDays(weekStart(today), -7); addDays(ws, 6) >= habit.started_on; ws = addDays(ws, -7)) {
    if (countBetween(days, ws, addDays(ws, 6)) >= habit.target_per_week) n++;
    else break;
  }
  return { value: n, unit: "semanas" };
}

export type Progression = "level_up" | "shrink" | "keep" | "too_early";

/**
 * Looks at the last two complete weeks since the habit started:
 * - both at or above target → it is easy now: level up;
 * - both under half the target → too big: shrink it (tiny version, fewer days);
 * - otherwise keep going.
 */
export function progression(habit: HabitForStats, logDays: string[], today: string): Progression {
  const days = new Set(logDays);
  const lastWeekStart = addDays(weekStart(today), -7);
  const prevWeekStart = addDays(lastWeekStart, -7);
  if (prevWeekStart < weekStart(habit.started_on) || prevWeekStart < habit.started_on) return "too_early";
  const ratios = [prevWeekStart, lastWeekStart].map((ws) => countBetween(days, ws, addDays(ws, 6)) / habit.target_per_week);
  if (ratios.every((r) => r >= 1)) return "level_up";
  if (ratios.every((r) => r < 0.5)) return "shrink";
  return "keep";
}

/** Share of the target met over the last `weeks` complete weeks (0–1), for the check-in and the operator. */
export function adherence(habit: HabitForStats, logDays: string[], today: string, weeks = 4): number | null {
  const days = new Set(logDays);
  const ratios: number[] = [];
  for (let i = 1; i <= weeks; i++) {
    const ws = addDays(weekStart(today), -7 * i);
    if (addDays(ws, 6) < habit.started_on) break;
    ratios.push(Math.min(1, countBetween(days, ws, addDays(ws, 6)) / habit.target_per_week));
  }
  return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
}
