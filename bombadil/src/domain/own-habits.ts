/**
 * Habits the person already has. We ask for them first, track them from day one
 * and only then suggest one or two changes where there is a real gap.
 */
import { z } from "zod";
import { PILLARS, type Pillar } from "./habits";
import type { DeviceSummary } from "./wearables";

export interface OwnHabitOption {
  key: string;
  pillar: Pillar;
  /** What the person checks ("Camino o monto en bicicleta"). */
  label: string;
  /** The habit as it appears in the app. */
  title: string;
  defaultDays: number;
}

export const OWN_HABITS: OwnHabitOption[] = [
  { key: "caminar", pillar: "movimiento", label: "Camino o monto en bicicleta", title: "Caminar o montar en bicicleta", defaultDays: 5 },
  { key: "cardio", pillar: "movimiento", label: "Corro, nado o hago algún deporte", title: "Cardio o deporte", defaultDays: 3 },
  { key: "fuerza", pillar: "fuerza", label: "Hago pesas o ejercicios de fuerza", title: "Entrenamiento de fuerza", defaultDays: 2 },
  { key: "dormir", pillar: "sueno", label: "Duermo 7 horas o más", title: "Dormir 7 horas o más", defaultDays: 5 },
  { key: "horario", pillar: "sueno", label: "Me acuesto a la misma hora", title: "Acostarme a la misma hora", defaultDays: 5 },
  { key: "frutas", pillar: "nutricion", label: "Como frutas y verduras todos los días", title: "Frutas y verduras", defaultDays: 7 },
  { key: "proteina", pillar: "nutricion", label: "Como proteína en cada comida", title: "Proteína en cada comida", defaultDays: 7 },
  { key: "sin_gaseosa", pillar: "nutricion", label: "Casi no tomo gaseosa ni como paquetes", title: "Sin gaseosa ni paquetes", defaultDays: 7 },
  { key: "calma", pillar: "estres", label: "Medito, rezo o hago respiraciones", title: "Momento de calma", defaultDays: 5 },
  { key: "vinculos", pillar: "conexion", label: "Comparto con familia o amigos", title: "Tiempo con familia o amigos", defaultDays: 3 },
  { key: "sin_alcohol", pillar: "sustancias", label: "Tomo poco o nada de alcohol", title: "Poco o nada de alcohol", defaultDays: 7 },
];

const Days = z.coerce.number().int().min(1).max(7);
const Anchor = z.string().trim().max(140).optional();

export const OwnHabitsSchema = z.object({
  selected: z.array(z.object({ key: z.string().refine((k) => OWN_HABITS.some((o) => o.key === k)), days: Days, anchor: Anchor })).max(OWN_HABITS.length),
  other: z.object({ title: z.string().trim().min(3).max(140), pillar: z.enum(PILLARS), days: Days, anchor: Anchor }).nullable(),
});
export type OwnHabits = z.infer<typeof OwnHabitsSchema>;

/** Reads the onboarding form: own_<key> checkbox, own_<key>_days, own_<key>_anchor, and other_*. */
export function parseOwnHabits(form: { get(name: string): unknown }): OwnHabits | null {
  const str = (n: string) => {
    const v = form.get(n);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const selected = OWN_HABITS.filter((o) => str(`own_${o.key}`)).map((o) => ({ key: o.key, days: str(`own_${o.key}_days`) ?? o.defaultDays, anchor: str(`own_${o.key}_anchor`) }));
  const otherTitle = str("other_title");
  const other = otherTitle ? { title: otherTitle, pillar: str("other_pillar") ?? "movimiento", days: str("other_days") ?? 3, anchor: str("other_anchor") } : null;
  const parsed = OwnHabitsSchema.safeParse({ selected, other });
  return parsed.success ? parsed.data : null;
}

export interface OwnHabitRow {
  pillar: Pillar;
  title: string;
  anchor: string | null;
  target_per_week: number;
}

export function ownHabitRows(own: OwnHabits): OwnHabitRow[] {
  const rows = own.selected.map((s) => {
    const o = OWN_HABITS.find((x) => x.key === s.key)!;
    return { pillar: o.pillar, title: o.title, anchor: s.anchor ?? null, target_per_week: s.days };
  });
  if (own.other) rows.push({ pillar: own.other.pillar, title: own.other.title, anchor: own.other.anchor ?? null, target_per_week: own.other.days });
  return rows;
}

/** What the watch already shows the person does, to pre-check the list. */
export function deviceHints(d: DeviceSummary | null): Record<string, { days: number; why: string }> {
  const out: Record<string, { days: number; why: string }> = {};
  if (!d) return out;
  if (d.steps_per_day !== null && d.steps_per_day >= 7000) out.caminar = { days: 5, why: `${d.steps_per_day.toLocaleString("es-CO")} pasos al día en promedio` };
  if (d.exercise_minutes_per_week !== null && d.exercise_minutes_per_week >= 60) {
    out.cardio = { days: Math.min(7, Math.max(1, Math.round(d.exercise_minutes_per_week / 45))), why: `${d.exercise_minutes_per_week} minutos de ejercicio por semana` };
  }
  if (d.sleep_hours !== null && d.sleep_hours >= 7) out.dormir = { days: 5, why: `${d.sleep_hours.toLocaleString("es-CO")} horas de sueño en promedio` };
  return out;
}
