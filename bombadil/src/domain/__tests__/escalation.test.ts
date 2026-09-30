import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULESET,
  evaluateEscalation,
  findKeyword,
  highestLevel,
  matchesCondition,
  type EscalationRule,
  type EscalationInput,
} from "../escalation";
import type { MeasurementType } from "../types";

function inputFor(rule: EscalationRule, value: number): EscalationInput {
  const sex = rule.sex ?? "male";
  if (rule.subject.kind === "measurement") return { sex, measurements: [{ type: rule.subject.type as MeasurementType, value }] };
  if (rule.subject.kind === "biomarker") return { sex, biomarkers: [{ code: rule.subject.code, value }] };
  throw new Error("not numeric");
}

/** Values that must fire and must not fire, derived from the rule's own bounds. */
function boundaryCases(rule: EscalationRule): { fire: number[]; quiet: number[] } {
  const c = rule.condition!;
  const eps = 0.01;
  const fire: number[] = [];
  const quiet: number[] = [];
  if (c.outside) {
    fire.push(c.outside[0] - eps, c.outside[1] + eps);
    quiet.push(c.outside[0], c.outside[1], (c.outside[0] + c.outside[1]) / 2);
    return { fire, quiet };
  }
  const lo = c.gte ?? (c.gt !== undefined ? c.gt + eps : undefined);
  const hi = c.lt !== undefined ? c.lt - eps : c.lte;
  if (lo !== undefined) fire.push(lo);
  if (hi !== undefined) fire.push(hi);
  if (c.gte !== undefined) quiet.push(c.gte - eps);
  if (c.gt !== undefined) quiet.push(c.gt);
  if (c.lt !== undefined) quiet.push(c.lt);
  if (c.lte !== undefined) quiet.push(c.lte + eps);
  return { fire, quiet };
}

describe("escalation ruleset", () => {
  it("is marked pending clinical validation and every rule cites a source", () => {
    expect(DEFAULT_RULESET.status).toMatch(/PENDIENTE DE VALIDAR/);
    for (const r of DEFAULT_RULESET.rules) expect(r.source.length, r.id).toBeGreaterThan(5);
  });
  it("has unique rule ids", () => {
    const ids = DEFAULT_RULESET.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const numeric = DEFAULT_RULESET.rules.filter((r) => (r.subject.kind === "measurement" || r.subject.kind === "biomarker") && r.condition);
  describe.each(numeric.map((r) => [r.id, r] as const))("threshold %s", (_id, rule) => {
    const { fire, quiet } = boundaryCases(rule);
    it.each(fire)("fires at %s", (v) => {
      expect(evaluateEscalation(inputFor(rule, v)).map((t) => t.ruleId)).toContain(rule.id);
    });
    it.each(quiet)("does not fire at %s", (v) => {
      expect(evaluateEscalation(inputFor(rule, v)).map((t) => t.ruleId)).not.toContain(rule.id);
    });
  });

  it("sex-specific rules only apply to that sex", () => {
    const f = evaluateEscalation({ sex: "female", biomarkers: [{ code: "hdl", value: 45 }] }).map((t) => t.ruleId);
    const m = evaluateEscalation({ sex: "male", biomarkers: [{ code: "hdl", value: 45 }] }).map((t) => t.ruleId);
    expect(f).toContain("hdl_low_female");
    expect(m).not.toContain("hdl_low_male");
  });
});

describe("urgency", () => {
  it("BP crisis is an urgency", () => {
    const t = evaluateEscalation({ sex: "male", measurements: [{ type: "bp_systolic", value: 185 }, { type: "bp_diastolic", value: 100 }] });
    expect(highestLevel(t)).toBe("urgency");
    expect(t[0].ruleId).toBe("bp_crisis_systolic");
  });
  it("diastolic crisis alone is an urgency", () => {
    expect(highestLevel(evaluateEscalation({ sex: "female", measurements: [{ type: "bp_diastolic", value: 121 }] }))).toBe("urgency");
  });
  it.each(["chest_pain", "shortness_of_breath", "neurological"] as const)("symptom %s is an urgency", (s) => {
    const t = evaluateEscalation({ sex: "male", symptoms: [s] });
    expect(highestLevel(t)).toBe("urgency");
  });
  it("sorts most severe first", () => {
    const t = evaluateEscalation({ sex: "male", biomarkers: [{ code: "glucose_fasting", value: 110 }], symptoms: ["chest_pain"] });
    expect(t.map((x) => x.level)).toEqual(["urgency", "next_visit"]);
  });
  it("normal values trigger nothing", () => {
    const t = evaluateEscalation({
      sex: "male",
      measurements: [{ type: "bp_systolic", value: 118 }, { type: "bp_diastolic", value: 76 }, { type: "resting_hr", value: 60 }],
      biomarkers: [{ code: "ldl", value: 95 }, { code: "glucose_fasting", value: 88 }],
    });
    expect(t).toEqual([]);
    expect(highestLevel(t)).toBeNull();
  });
});

describe("keywords", () => {
  const kws = ["dolor en el pecho", "falta de aire"];
  it("finds accent-insensitive keywords", () => {
    expect(findKeyword("Anoche sentí DOLOR EN EL PECHO al subir escaleras", kws)).toBe("dolor en el pecho");
  });
  it("ignores negated mentions", () => {
    expect(findKeyword("Ya no tengo dolor en el pecho", kws)).toBeNull();
    expect(findKeyword("sin falta de aire esta semana", kws)).toBeNull();
  });
  it("still fires when a later mention is not negated", () => {
    expect(findKeyword("no tuve falta de aire el lunes, pero el jueves otra vez falta de aire", kws)).toBe("falta de aire");
  });
  it("keyword hits escalate for admin review", () => {
    const t = evaluateEscalation({ sex: "male", freeText: "me dio falta de aire subiendo" });
    expect(t.map((x) => x.ruleId)).toContain("keyword_alarm_text");
  });
});

describe("conditions", () => {
  it("matches combined bounds", () => {
    expect(matchesCondition(150, { gte: 140, lt: 160 })).toBe(true);
    expect(matchesCondition(160, { gte: 140, lt: 160 })).toBe(false);
    expect(matchesCondition(5, { outside: [10, 20] })).toBe(true);
    expect(matchesCondition(15, { outside: [10, 20] })).toBe(false);
  });
});

describe("independence from the LLM", () => {
  it("no domain module imports LLM or network code", () => {
    const dir = path.resolve(import.meta.dirname, "..");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
      const src = readFileSync(path.join(dir, f), "utf8");
      expect(src, f).not.toMatch(/from "(@anthropic-ai[^"]*|@supabase[^"]*|@\/lib[^"]*|[^"]*llm[^"]*)"|\bfetch\(/);
    }
  });
});
