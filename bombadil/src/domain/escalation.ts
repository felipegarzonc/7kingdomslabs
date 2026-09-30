/**
 * Deterministic escalation rules. Never depends on the LLM: the LLM receives
 * the computed level and only writes prose around it.
 *
 * Rules live in config/escalation-rules.json (PENDIENTE DE VALIDAR con médico asesor).
 */
import { z } from "zod";
import rulesJson from "../../config/escalation-rules.json";
import type { EscalationLevel, MeasurementType, Sex } from "./types";

export const SYMPTOMS = ["chest_pain", "shortness_of_breath", "neurological"] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export const SYMPTOM_LABEL: Record<Symptom, string> = {
  chest_pain: "Dolor u opresión en el pecho",
  shortness_of_breath: "Dificultad para respirar",
  neurological: "Debilidad o adormecimiento de un lado, dificultad para hablar, pérdida de visión o confusión",
};

const ConditionSchema = z
  .object({
    gt: z.number().optional(),
    gte: z.number().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    outside: z.tuple([z.number(), z.number()]).optional(),
  })
  .strict();

const SubjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("measurement"), type: z.string() }),
  z.object({ kind: z.literal("biomarker"), code: z.string() }),
  z.object({ kind: z.literal("symptom"), symptom: z.enum(SYMPTOMS) }),
  z.object({ kind: z.literal("keyword"), keywords: z.array(z.string()).min(1) }),
]);

export const RuleSchema = z.object({
  id: z.string(),
  level: z.enum(["urgency", "consult_soon", "next_visit"]),
  sex: z.enum(["male", "female"]).optional(),
  subject: SubjectSchema,
  condition: ConditionSchema.optional(),
  message: z.string(),
  source: z.string(),
});

export const RuleSetSchema = z.object({
  version: z.string(),
  status: z.string(),
  rules: z.array(RuleSchema),
});

export type EscalationRule = z.infer<typeof RuleSchema>;
export type RuleSet = z.infer<typeof RuleSetSchema>;

export const DEFAULT_RULESET: RuleSet = RuleSetSchema.parse(rulesJson);

export const LEVEL_ORDER: Record<EscalationLevel, number> = { urgency: 0, consult_soon: 1, next_visit: 2 };
export const LEVEL_LABEL: Record<EscalationLevel, string> = {
  urgency: "Urgencia",
  consult_soon: "Consultar pronto",
  next_visit: "Mencionar en la próxima cita",
};

export interface EscalationInput {
  sex: Sex;
  measurements?: Array<{ type: MeasurementType; value: number }>;
  biomarkers?: Array<{ code: string; value: number }>;
  symptoms?: Symptom[];
  freeText?: string | null;
}

export interface TriggeredRule {
  ruleId: string;
  level: EscalationLevel;
  message: string;
  source: string;
  /** What fired it: the value, symptom or keyword. */
  evidence: string;
}

export function matchesCondition(value: number, c: z.infer<typeof ConditionSchema> | undefined): boolean {
  if (!c) return true;
  if (c.gt !== undefined && !(value > c.gt)) return false;
  if (c.gte !== undefined && !(value >= c.gte)) return false;
  if (c.lt !== undefined && !(value < c.lt)) return false;
  if (c.lte !== undefined && !(value <= c.lte)) return false;
  if (c.outside !== undefined && value >= c.outside[0] && value <= c.outside[1]) return false;
  return true;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const NEGATION = /(^|\s)(no|sin|ya no|nunca|ningun|ninguna)(\s\S+){0,2}\s?$/;

/** Finds a keyword not immediately preceded by a negation ("ya no tengo dolor en el pecho"). */
export function findKeyword(text: string, keywords: string[]): string | null {
  const t = normalizeText(text);
  for (const kw of keywords) {
    const k = normalizeText(kw);
    let idx = t.indexOf(k);
    while (idx !== -1) {
      const before = t.slice(Math.max(0, idx - 25), idx);
      if (!NEGATION.test(before)) return kw;
      idx = t.indexOf(k, idx + 1);
    }
  }
  return null;
}

export function evaluateEscalation(input: EscalationInput, ruleset: RuleSet = DEFAULT_RULESET): TriggeredRule[] {
  const out: TriggeredRule[] = [];
  for (const rule of ruleset.rules) {
    if (rule.sex && rule.sex !== input.sex) continue;
    const s = rule.subject;
    const fire = (evidence: string) =>
      out.push({ ruleId: rule.id, level: rule.level, message: rule.message, source: rule.source, evidence });

    switch (s.kind) {
      case "measurement":
        for (const m of input.measurements ?? []) {
          if (m.type === s.type && matchesCondition(m.value, rule.condition)) fire(`${m.type}=${m.value}`);
        }
        break;
      case "biomarker":
        for (const b of input.biomarkers ?? []) {
          if (b.code === s.code && matchesCondition(b.value, rule.condition)) fire(`${b.code}=${b.value}`);
        }
        break;
      case "symptom":
        if (input.symptoms?.includes(s.symptom)) fire(`symptom:${s.symptom}`);
        break;
      case "keyword": {
        if (!input.freeText) break;
        const kw = findKeyword(input.freeText, s.keywords);
        if (kw) fire(`keyword:${kw}`);
        break;
      }
    }
  }
  // One entry per rule, most severe first.
  const seen = new Set<string>();
  return out
    .filter((r) => (seen.has(r.ruleId) ? false : (seen.add(r.ruleId), true)))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export function highestLevel(triggered: TriggeredRule[]): EscalationLevel | null {
  if (!triggered.length) return null;
  return triggered.reduce((best, r) => (LEVEL_ORDER[r.level] < LEVEL_ORDER[best] ? r.level : best), triggered[0].level);
}
