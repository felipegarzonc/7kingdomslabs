/**
 * The game layer: XP, levels, attributes, a forgiving streak, weekly quests and
 * achievements, all derived from what the person already did (habit logs,
 * exams, check-ins, measurements). Nothing is stored, so rules can change and
 * apply to the whole history.
 *
 * Behaviour-science choices (see docs/GAMIFICATION.md):
 * - Reward behaviours, never clinical results (no XP for a "good" lab value).
 * - The tiny version earns XP: showing up beats intensity ("never zero").
 * - Streaks with shields (earned, not bought) so one bad day is not a loss.
 * - Per-day caps so more exercise or more logging is not "more points".
 * - Fresh start every Monday: weekly quests reset.
 * - No leaderboards: health is not a competition with others.
 */
import { addDays, type Pillar, weekStart } from "./habits";

// ─── Rules ──────────────────────────────────────────────────────────────────

export const XP = {
  habitFull: 10,
  habitTiny: 5,
  /** Max habit XP per attribute per day. */
  habitDailyCapPerAttribute: 20,
  weeklyTargetMet: 25,
  exam: 40,
  checkin: 30,
  measurementDay: 5,
  deviceConnected: 50,
  questComplete: 50,
} as const;

/** Every N consecutive active days earns a shield; at most SHIELD_MAX banked. */
export const SHIELD_EVERY = 7;
export const SHIELD_MAX = 2;

export type AttributeKey = Pillar | "sabiduria";

export const ATTRIBUTES: Array<{ key: AttributeKey; label: string; blurb: string }> = [
  { key: "movimiento", label: "Resistencia", blurb: "Capacidad cardiorrespiratoria: el predictor más fuerte de años de vida." },
  { key: "fuerza", label: "Fuerza", blurb: "Músculo y agarre: independencia a los 80." },
  { key: "sueno", label: "Descanso", blurb: "Sueño de 7 a 8 horas: reparación diaria." },
  { key: "nutricion", label: "Nutrición", blurb: "Más plantas, menos ultraprocesados." },
  { key: "estres", label: "Calma", blurb: "Manejo del estrés: presión, sueño y ánimo." },
  { key: "conexion", label: "Vínculos", blurb: "Las relaciones protegen tanto como dejar de fumar." },
  { key: "sustancias", label: "Templanza", blurb: "Menos alcohol, cero tabaco." },
  { key: "sabiduria", label: "Sabiduría", blurb: "Conocerte: exámenes, mediciones y revisiones semanales." },
];

const TITLES: Array<[number, string]> = [
  [1, "Aprendiz del bosque"],
  [2, "Caminante"],
  [3, "Explorador"],
  [5, "Rastreador"],
  [7, "Guardián del sendero"],
  [10, "Custodio del bosque"],
  [15, "Sabio del bosque"],
  [20, "Leyenda de la longevidad"],
];

/** Cumulative XP to reach `level`: base·(n−1)·n, so each level costs a bit more than the last. */
export function xpForLevel(level: number, base = 50): number {
  return base * (level - 1) * level;
}

export function levelFor(xp: number, base = 50): { level: number; into: number; span: number; progress: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1, base)) level++;
  const floor = xpForLevel(level, base);
  const span = xpForLevel(level + 1, base) - floor;
  return { level, into: xp - floor, span, progress: (xp - floor) / span };
}

export function titleFor(level: number): string {
  let t = TITLES[0][1];
  for (const [min, title] of TITLES) if (level >= min) t = title;
  return t;
}

// ─── Input / output ─────────────────────────────────────────────────────────

export interface GameHabit {
  id: string;
  pillar: Pillar;
  target_per_week: number;
  status: string;
  started_on: string | null;
}
export interface GameLog {
  habit_id: string;
  day: string;
  full_version: boolean;
  source?: string | null;
}
export interface GameInput {
  today: string;
  habits: GameHabit[];
  logs: GameLog[];
  /** Colombia-local days on which an exam was uploaded / a check-in sent / any measurement recorded. */
  examDays: string[];
  checkinDays: string[];
  measurementDays: string[];
  deviceConnected: boolean;
  goalsAchieved: number;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  current: number;
  target: number;
}

export interface Quest {
  key: string;
  title: string;
  current: number;
  target: number;
  done: boolean;
  xp: number;
}

export interface GameState {
  xp: number;
  level: number;
  title: string;
  levelProgress: number;
  xpIntoLevel: number;
  xpForNext: number;
  attributes: Array<{ key: AttributeKey; label: string; blurb: string; xp: number; level: number; progress: number }>;
  streak: { current: number; best: number; shields: number; activeToday: boolean; protectedDays: string[] };
  today: { done: number; target: number; xp: number };
  quests: Quest[];
  achievements: Achievement[];
  /** Last 12 weeks, Monday first: day → share of active habits logged (0..1). */
  heatmap: Array<{ day: string; value: number; protected: boolean }>;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

/** Colombia (UTC−5, no DST) calendar day of an ISO timestamp. */
export function dayInColombia(iso: string): string {
  return new Date(Date.parse(iso) - 5 * 3600e3).toISOString().slice(0, 10);
}

function streakOf(activeDays: Set<string>, today: string) {
  const sorted = [...activeDays].filter((d) => d <= today).sort();
  if (!sorted.length) return { current: 0, best: 0, shields: 0, protectedDays: [] as string[] };
  let current = 0;
  let best = 0;
  let run = 0; // consecutive active days, for earning shields
  let shields = 0;
  const protectedDays: string[] = [];
  for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
    if (activeDays.has(d)) {
      current++;
      run++;
      if (run % SHIELD_EVERY === 0) shields = Math.min(SHIELD_MAX, shields + 1);
    } else if (d === today) {
      // Today is still open: it can't break anything yet.
    } else if (shields > 0) {
      shields--;
      protectedDays.push(d);
      run = 0;
    } else {
      current = 0;
      run = 0;
    }
    best = Math.max(best, current);
  }
  return { current, best, shields, protectedDays };
}

export function computeGame(input: GameInput): GameState {
  const { today } = input;
  const habitById = new Map(input.habits.map((h) => [h.id, h]));
  const logs = input.logs.filter((l) => l.day <= today && habitById.has(l.habit_id));
  const attrXp = new Map<AttributeKey, number>(ATTRIBUTES.map((a) => [a.key, 0]));
  const addAttr = (k: AttributeKey, n: number) => attrXp.set(k, (attrXp.get(k) ?? 0) + n);
  let todayXp = 0;

  // Habit logs, capped per attribute per day.
  const perAttrDay = new Map<string, number>();
  for (const l of logs) {
    const pillar = habitById.get(l.habit_id)!.pillar;
    const key = `${pillar}:${l.day}`;
    const used = perAttrDay.get(key) ?? 0;
    const gain = Math.max(0, Math.min(l.full_version ? XP.habitFull : XP.habitTiny, XP.habitDailyCapPerAttribute - used));
    perAttrDay.set(key, used + gain);
    addAttr(pillar, gain);
    if (l.day === today) todayXp += gain;
  }

  // Weekly targets met (completed weeks and the current one once met).
  const logsByHabit = new Map<string, string[]>();
  for (const l of logs) logsByHabit.set(l.habit_id, [...(logsByHabit.get(l.habit_id) ?? []), l.day]);
  const metByWeek = new Map<string, number>();
  for (const [habitId, days] of logsByHabit) {
    const h = habitById.get(habitId)!;
    const perWeek = new Map<string, number>();
    for (const d of days) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1);
    for (const [ws, n] of perWeek) {
      if (n >= h.target_per_week) {
        addAttr(h.pillar, XP.weeklyTargetMet);
        metByWeek.set(ws, (metByWeek.get(ws) ?? 0) + 1);
      }
    }
  }

  // Knowing yourself.
  const uniq = (xs: string[]) => [...new Set(xs.filter((d) => d <= today))];
  const examDays = uniq(input.examDays);
  const checkinDays = uniq(input.checkinDays);
  const measurementDays = uniq(input.measurementDays);
  addAttr("sabiduria", examDays.length * XP.exam + checkinDays.length * XP.checkin + measurementDays.length * XP.measurementDay + (input.deviceConnected ? XP.deviceConnected : 0));
  if (examDays.includes(today)) todayXp += XP.exam;
  if (checkinDays.includes(today)) todayXp += XP.checkin;
  if (measurementDays.includes(today)) todayXp += XP.measurementDay;

  // Streak over days with any habit logged.
  const activeDays = new Set(logs.map((l) => l.day));
  const s = streakOf(activeDays, today);

  // Weekly quests (fresh start each Monday); past completed weeks pay out too.
  const active = input.habits.filter((h) => h.status === "active");
  const questTarget = Math.max(1, Math.min(2, active.length));
  const weeks = new Set([...activeDays, ...checkinDays].map((d) => weekStart(d)));
  let questXp = 0;
  const questsFor = (ws: string): Quest[] => {
    const end = addDays(ws, 6);
    const daysActive = [...activeDays].filter((d) => d >= ws && d <= end).length;
    const qs: Quest[] = [
      { key: "metas", title: `Cumple la meta semanal de ${questTarget === 1 ? "un hábito" : `${questTarget} hábitos`}`, current: Math.min(questTarget, metByWeek.get(ws) ?? 0), target: questTarget, done: false, xp: XP.questComplete },
      { key: "constancia", title: "Aparece 5 de los 7 días (vale la versión mínima)", current: Math.min(5, daysActive), target: 5, done: false, xp: XP.questComplete },
      { key: "revision", title: "Haz tu revisión semanal", current: checkinDays.some((d) => d >= ws && d <= end) ? 1 : 0, target: 1, done: false, xp: XP.questComplete },
    ];
    for (const q of qs) q.done = q.current >= q.target;
    return qs;
  };
  for (const ws of weeks) questXp += questsFor(ws).filter((q) => q.done).length * XP.questComplete;
  const quests = questsFor(weekStart(today));

  const habitXp = [...attrXp.values()].reduce((a, b) => a + b, 0);
  const xp = habitXp + questXp;
  const lv = levelFor(xp);

  const attributes = ATTRIBUTES.map((a) => {
    const ax = attrXp.get(a.key) ?? 0;
    const al = levelFor(ax, 20);
    return { ...a, xp: ax, level: al.level, progress: al.progress };
  });

  // Achievements.
  const tinyCount = logs.filter((l) => !l.full_version).length;
  const deviceLogs = logs.filter((l) => l.source && l.source !== "manual").length;
  const bestWeekHabits = Math.max(0, ...metByWeek.values());
  const a = (key: string, title: string, description: string, current: number, target: number): Achievement => ({
    key,
    title,
    description,
    current: Math.min(current, target),
    target,
    unlocked: current >= target,
  });
  const achievements: Achievement[] = [
    a("primer_paso", "Primer paso", "Registra tu primer hábito.", logs.length, 1),
    a("racha_3", "Chispa", "3 días seguidos.", s.best, 3),
    a("racha_7", "Fogata", "7 días seguidos (ganas tu primer escudo).", s.best, 7),
    a("racha_30", "Fuego eterno", "30 días seguidos.", s.best, 30),
    a("semana", "Semana cumplida", "Cumple la meta semanal de un hábito.", bestWeekHabits, 1),
    a("tres_de_tres", "Tres de tres", "Cumple la meta semanal de 3 hábitos en la misma semana.", bestWeekHabits, 3),
    a("nunca_cero", "Nunca cero", "Usa la versión mínima 5 veces: aparecer es lo que cuenta.", tinyCount, 5),
    a("conocete", "Conócete", "Sube tu primer examen.", examDays.length, 1),
    a("revision", "Brújula", "Haz 4 revisiones semanales.", checkinDays.length, 4),
    a("conectado", "Conectado", "Conecta Strava o Apple Salud.", input.deviceConnected ? 1 : 0, 1),
    a("automatico", "Piloto automático", "10 hábitos registrados por tu reloj.", deviceLogs, 10),
    a("nivel_5", "Rastreador", "Llega al nivel 5.", lv.level, 5),
    a("mision", "Misión cumplida", "Logra una de tus metas.", input.goalsAchieved, 1),
  ];

  // Heatmap: 12 weeks ending this week.
  const first = addDays(weekStart(today), -77);
  const protectedSet = new Set(s.protectedDays);
  const perDay = new Map<string, number>();
  for (const l of logs) perDay.set(l.day, (perDay.get(l.day) ?? 0) + 1);
  const denom = Math.max(1, active.length);
  const heatmap = Array.from({ length: 84 }, (_, i) => {
    const day = addDays(first, i);
    return { day, value: day > today ? -1 : Math.min(1, (perDay.get(day) ?? 0) / denom), protected: protectedSet.has(day) };
  });

  const doneToday = active.filter((h) => logs.some((l) => l.habit_id === h.id && l.day === today)).length;

  return {
    xp,
    level: lv.level,
    title: titleFor(lv.level),
    levelProgress: lv.progress,
    xpIntoLevel: lv.into,
    xpForNext: lv.span,
    attributes,
    streak: { current: s.current, best: s.best, shields: s.shields, activeToday: activeDays.has(today), protectedDays: s.protectedDays },
    today: { done: doneToday, target: active.length, xp: todayXp },
    quests,
    achievements,
    heatmap,
  };
}
