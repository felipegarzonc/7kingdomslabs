/**
 * Two-minute lifestyle baseline. It lets the habit plan start on day one,
 * before any lab or imaging report exists.
 */
import { z } from "zod";
import { PILLARS } from "./habits";

export type LifestyleKey = "activity" | "strength" | "sleep" | "vegetables" | "processed" | "alcohol" | "stress" | "time";

export interface Question {
  key: LifestyleKey;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export const LIFESTYLE_QUESTIONS: Question[] = [
  {
    key: "activity",
    label: "¿Cuánto ejercicio que te agite la respiración haces a la semana?",
    options: [
      { value: "none", label: "Casi nada" },
      { value: "lt60", label: "Menos de 1 hora" },
      { value: "60_150", label: "1 a 2,5 horas" },
      { value: "gt150", label: "Más de 2,5 horas" },
    ],
  },
  {
    key: "strength",
    label: "¿Cuántos días a la semana haces fuerza (pesas, bandas, peso corporal)?",
    options: [
      { value: "0", label: "Ninguno" },
      { value: "1", label: "1 día" },
      { value: "2", label: "2 días" },
      { value: "3plus", label: "3 o más" },
    ],
  },
  {
    key: "sleep",
    label: "¿Cuántas horas duermes una noche normal?",
    options: [
      { value: "lt6", label: "Menos de 6" },
      { value: "6_7", label: "6 a 7" },
      { value: "7_8", label: "7 a 8" },
      { value: "gt8", label: "Más de 8" },
    ],
  },
  {
    key: "vegetables",
    label: "¿Cuántas porciones de verduras y frutas comes al día?",
    options: [
      { value: "0_1", label: "0 a 1" },
      { value: "2_3", label: "2 a 3" },
      { value: "4plus", label: "4 o más" },
    ],
  },
  {
    key: "processed",
    label: "¿Qué tan seguido tomas gaseosa o comes paquetes, comida rápida o dulces?",
    options: [
      { value: "daily", label: "Todos los días" },
      { value: "weekly", label: "Varias veces por semana" },
      { value: "rare", label: "Rara vez" },
    ],
  },
  {
    key: "alcohol",
    label: "¿Cuántos tragos de alcohol tomas en una semana normal?",
    options: [
      { value: "0", label: "Ninguno" },
      { value: "1_7", label: "1 a 7" },
      { value: "8_14", label: "8 a 14" },
      { value: "15plus", label: "15 o más" },
    ],
  },
  {
    key: "stress",
    label: "¿Cómo está tu nivel de estrés últimamente?",
    options: [
      { value: "low", label: "Bajo" },
      { value: "medium", label: "Medio" },
      { value: "high", label: "Alto" },
    ],
  },
  {
    key: "time",
    label: "¿Cuánto tiempo al día puedes dedicarle a tu salud, siendo realista?",
    options: [
      { value: "10", label: "10 minutos" },
      { value: "20", label: "20 minutos" },
      { value: "40", label: "40 minutos o más" },
    ],
  },
];

const answer = (q: LifestyleKey): z.ZodString => z.string().refine((v) => LIFESTYLE_QUESTIONS.find((x) => x.key === q)!.options.some((o) => o.value === v));

export const LifestyleSchema = z.object({
  activity: answer("activity"),
  strength: answer("strength"),
  sleep: answer("sleep"),
  vegetables: answer("vegetables"),
  processed: answer("processed"),
  alcohol: answer("alcohol"),
  stress: answer("stress"),
  time: answer("time"),
  /** Up to three areas the person wants to work on first. */
  focus: z.array(z.enum(PILLARS)).max(3),
  /** Injuries, schedules, preferences: "trabajo de noche", "me duele la rodilla". */
  constraints: z.string().max(500).optional(),
});
export type Lifestyle = z.infer<typeof LifestyleSchema>;

/** Human-readable answers, for the habit-plan prompt and the operator. */
export function describeLifestyle(l: Lifestyle): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of LIFESTYLE_QUESTIONS) {
    const v = l[q.key];
    out[q.label] = q.options.find((o) => o.value === v)?.label ?? String(v);
  }
  if (l.constraints) out["Limitaciones o preferencias"] = l.constraints;
  return out;
}
