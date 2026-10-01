/**
 * "El camino": a habit's history as a Duolingo-style path of weekly nodes,
 * plus a milestone every few weeks, the next level and a "boss" test that
 * measures the attribute the habit trains. Pure.
 */
import { addDays, type HabitForStats, type Pillar, progression, weekStart } from "./habits";

export type PathNodeKind = "done" | "missed" | "current" | "milestone" | "locked" | "levelup" | "boss";

export interface PathNode {
  kind: PathNodeKind;
  label: string;
  detail?: string;
  /** Current week: logged days so far / target. */
  progress?: { done: number; target: number };
  /** Milestones and level-up are reached or not. */
  reached?: boolean;
  href?: string;
}

/** Weeks shown before the current one, so long histories stay short. */
export const PATH_HISTORY_WEEKS = 6;
/** A milestone every N weeks met. */
export const MILESTONE_EVERY = 3;

export const BOSS: Record<Pillar, { label: string; detail: string; href: string }> = {
  movimiento: { label: "Prueba: tu VO2max", detail: "Mídelo con tu reloj o una prueba de esfuerzo", href: "/app/mediciones" },
  fuerza: { label: "Prueba: fuerza de agarre", detail: "Con un dinamómetro, el mejor de 3 intentos", href: "/app/mediciones" },
  sueno: { label: "Prueba: una semana de sueño", detail: "7 noches registradas, idealmente de 7 a 8 horas", href: "/app/conexiones" },
  nutricion: { label: "Prueba: examen de control", detail: "Glucosa y perfil de lípidos", href: "/app/examenes" },
  estres: { label: "Prueba: presión en reposo", detail: "Dos tomas, mañana y noche, una semana", href: "/app/mediciones" },
  conexion: { label: "Prueba: revisión semanal", detail: "Cuenta con quién te conectaste", href: "/app/checkin" },
  sustancias: { label: "Prueba: tragos de la semana", detail: "Anótalos y compáralos con tu meta", href: "/app/mediciones" },
};

export function habitPath(
  habit: HabitForStats & { pillar: Pillar; next_step: string | null },
  logDays: string[],
  today: string,
): PathNode[] {
  const days = new Set(logDays);
  const count = (ws: string) => Array.from({ length: 7 }, (_, i) => addDays(ws, i)).filter((d) => days.has(d) && d <= today).length;
  const thisWeek = weekStart(today);
  const firstWeek = weekStart(habit.started_on);

  const nodes: PathNode[] = [];
  let met = 0;
  let weekNo = 0;
  for (let ws = firstWeek; ws < thisWeek; ws = addDays(ws, 7)) {
    weekNo++;
    const n = count(ws);
    const ok = n >= habit.target_per_week;
    if (ok) met++;
    nodes.push({ kind: ok ? "done" : "missed", label: `Semana ${weekNo}`, detail: `${n}/${habit.target_per_week} días` });
    if (ok && met % MILESTONE_EVERY === 0) nodes.push({ kind: "milestone", label: `Hito: ${met} semanas cumplidas`, reached: true });
  }
  const shown = nodes.slice(-PATH_HISTORY_WEEKS);

  const current = count(thisWeek);
  shown.push({ kind: "current", label: `Semana ${weekNo + 1}`, detail: "Esta semana", progress: { done: current, target: habit.target_per_week } });

  const toMilestone = MILESTONE_EVERY - (met % MILESTONE_EVERY);
  shown.push({ kind: "milestone", label: `Hito: ${met + toMilestone} semanas cumplidas`, detail: toMilestone === 1 ? "Cumple esta semana y llegas" : `Te faltan ${toMilestone} semanas`, reached: false });
  const ready = progression(habit, logDays, today) === "level_up";
  shown.push({
    kind: "levelup",
    label: "Siguiente nivel",
    detail: habit.next_step ?? "Un poco más de lo mismo",
    reached: ready,
    href: ready ? "/app/plan" : undefined,
  });
  shown.push({ kind: "boss", ...BOSS[habit.pillar] });
  return shown;
}

/** When the next control exam is due: three months after the last one. */
export const EXAM_EVERY_DAYS = 90;
export function nextExamDue(lastExamDay: string | null, today: string): { due: string; daysLeft: number } | null {
  if (!lastExamDay) return null;
  const due = addDays(lastExamDay, EXAM_EVERY_DAYS);
  return { due, daysLeft: Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) };
}
