/**
 * Levers added from the evidence review: FIB-4, ApoB/Lp(a), grip strength,
 * VO2max, smoking and weekly alcohol.
 */
import { describe, expect, it } from "vitest";
import { getBiomarker } from "../biomarkers";
import { toCanonical } from "../classify";
import { fib4, fib4Category, fib4LowCutoff, lowGripStrength } from "../derived";
import { evaluateEscalation } from "../escalation";
import { buildSnapshot, MEASUREMENT_BOUNDS, MEASUREMENT_LABEL, MEASUREMENT_TYPES, MEASUREMENT_UNIT, type SnapshotInput } from "../snapshot";

const base: SnapshotInput = {
  sex: "male",
  birthDate: "1976-01-15",
  heightCm: 176,
  labs: [],
  measurements: [],
  goals: [],
  asOf: new Date("2026-10-01T12:00:00Z"),
};

describe("FIB-4", () => {
  it("follows the published formula (age × AST) / (platelets × √ALT)", () => {
    // 50 × 36 / (220 × √49) = 1800 / 1540 = 1.169
    expect(fib4(50, 36, 49, 220)).toBe(1.17);
  });
  it("returns null for missing or non-positive inputs", () => {
    expect(fib4(50, 0, 49, 220)).toBeNull();
    expect(fib4(50, 36, 49, 0)).toBeNull();
  });
  it("uses 1.3 as the low cut-off up to 65 and 2.0 after", () => {
    expect(fib4LowCutoff(65)).toBe(1.3);
    expect(fib4LowCutoff(66)).toBe(2.0);
    expect(fib4Category(1.29, 50)).toBe("low");
    expect(fib4Category(1.3, 50)).toBe("indeterminate");
    expect(fib4Category(1.8, 70)).toBe("low");
    expect(fib4Category(2.67, 50)).toBe("indeterminate");
    expect(fib4Category(2.68, 50)).toBe("high");
  });
  it("is computed in the snapshot only from AST, ALT and platelets of the same date", () => {
    const s = buildSnapshot({
      ...base,
      labs: [
        { code: "ast", value: 60, at: "2026-05-20" },
        { code: "alt", value: 49, at: "2026-05-20" },
        { code: "platelets", value: 150, at: "2026-05-20" },
        { code: "ast", value: 90, at: "2026-09-01" }, // no ALT or platelets that day
      ],
    });
    // age 50 on 2026-05-20: 50 × 60 / (150 × 7) = 2.857
    expect(s.derived.fib4).toEqual({ value: 2.86, category: "high", lowCutoff: 1.3, ageAtTest: 50, at: "2026-05-20" });
    expect(s.patterns.map((p) => p.id)).toContain("liver_fibrosis_risk");
    expect(s.escalations.map((e) => e.ruleId)).toContain("fib4_high");
  });
  it("uses the age on the test date for the cut-off", () => {
    // Born 1960-06-01: 65 on 2026-05-20 (cut-off 1.3), 66 at asOf.
    const s = buildSnapshot({
      ...base,
      birthDate: "1960-06-01",
      labs: [
        { code: "ast", value: 30, at: "2026-05-20" },
        { code: "alt", value: 36, at: "2026-05-20" },
        { code: "platelets", value: 200, at: "2026-05-20" },
      ],
    });
    // 65 × 30 / (200 × 6) = 1.625 → intermediate at 65, would be low at 66.
    expect(s.derived.fib4).toMatchObject({ value: 1.63, category: "indeterminate", lowCutoff: 1.3, ageAtTest: 65 });
    expect(s.escalations.map((e) => e.ruleId)).toContain("fib4_indeterminate");
  });
  it("is null without a birth date", () => {
    const s = buildSnapshot({
      ...base,
      birthDate: null,
      labs: [
        { code: "ast", value: 30, at: "2026-05-20" },
        { code: "alt", value: 30, at: "2026-05-20" },
        { code: "platelets", value: 250, at: "2026-05-20" },
      ],
    });
    expect(s.derived.fib4).toBeNull();
  });
});

describe("FIB-4 escalation is age-aware", () => {
  const ids = (value: number, age: number | null) => evaluateEscalation({ sex: "female", age, derived: [{ metric: "fib4", value }] }).map((t) => t.ruleId);
  it("1.5 is intermediate at 50 but low at 70", () => {
    expect(ids(1.5, 50)).toEqual(["fib4_indeterminate"]);
    expect(ids(1.5, 70)).toEqual([]);
  });
  it("2.2 is intermediate at both ages, each with its own rule", () => {
    expect(ids(2.2, 50)).toEqual(["fib4_indeterminate"]);
    expect(ids(2.2, 70)).toEqual(["fib4_indeterminate_over65"]);
  });
  it("high values escalate regardless of age, even when age is unknown", () => {
    expect(ids(3.1, null)).toEqual(["fib4_high"]);
  });
  it("age-bounded rules are skipped when age is unknown", () => {
    expect(ids(2.2, null)).toEqual([]);
  });
});

describe("ApoB and Lp(a)", () => {
  it("are in the catalog with linked evidence", () => {
    for (const code of ["apob", "lpa"]) {
      const b = getBiomarker(code);
      expect(b.category).toBe("lipids");
      expect(b.evidence?.length).toBeGreaterThan(0);
    }
  });
  it("convert ApoB from g/L and Lp(a) from nmol/L", () => {
    expect(toCanonical("apob", 1.05, "g/L")).toBeCloseTo(105);
    expect(toCanonical("lpa", 215, "nmol/L")).toBeCloseTo(100, 0);
  });
  it("elevated Lp(a) is flagged as an inherited risk", () => {
    const s = buildSnapshot({ ...base, labs: [{ code: "lpa", value: 85, at: "2026-05-20" }] });
    expect(s.patterns.map((p) => p.id)).toContain("lpa_elevated");
    expect(s.escalations.map((e) => e.ruleId)).toContain("lpa_high");
  });
});

describe("strength, fitness, smoking and alcohol", () => {
  it("new measurement types have a label, unit and plausibility bounds", () => {
    for (const t of ["grip_strength", "vo2max", "alcohol_drinks"] as const) {
      expect(MEASUREMENT_TYPES).toContain(t);
      expect(MEASUREMENT_LABEL[t]).toBeTruthy();
      expect(MEASUREMENT_UNIT[t]).toBeTruthy();
      expect(MEASUREMENT_BOUNDS[t][0]).toBeLessThan(MEASUREMENT_BOUNDS[t][1]);
    }
  });
  it("low grip strength uses the EWGSOP2 sex-specific cut-offs", () => {
    expect(lowGripStrength(26, "male")).toBe(true);
    expect(lowGripStrength(27, "male")).toBe(false);
    expect(lowGripStrength(15, "female")).toBe(true);
    expect(lowGripStrength(16, "female")).toBe(false);
  });
  it("the snapshot surfaces smoking, alcohol and low grip strength as patterns", () => {
    const at = "2026-09-28T12:00:00Z";
    const s = buildSnapshot({
      ...base,
      smokingStatus: "current",
      measurements: [
        { type: "grip_strength", value: 24, at },
        { type: "vo2max", value: 34, at },
        { type: "alcohol_drinks", value: 16, at },
      ],
    });
    expect(s.profile.smokingStatus).toBe("current");
    expect(s.measurementsLatest.vo2max?.value).toBe(34);
    expect(s.patterns.map((p) => p.id)).toEqual(expect.arrayContaining(["smoking", "alcohol_above_low_risk", "low_grip_strength"]));
    expect(s.escalations.map((e) => e.ruleId)).toContain("alcohol_high");
  });
  it("moderate habits raise no patterns", () => {
    const at = "2026-09-28T12:00:00Z";
    const s = buildSnapshot({
      ...base,
      smokingStatus: "former",
      measurements: [
        { type: "grip_strength", value: 42, at },
        { type: "alcohol_drinks", value: 4, at },
      ],
    });
    expect(s.patterns).toEqual([]);
    expect(s.escalations).toEqual([]);
  });
});
