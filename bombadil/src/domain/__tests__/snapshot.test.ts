import { describe, expect, it } from "vitest";
import { buildSnapshot, pairBloodPressure } from "../snapshot";
import { userZero } from "../__fixtures__/user-zero";

describe("snapshot for the synthetic user-zero fixture (acceptance criterion §10)", () => {
  const s = buildSnapshot(userZero);

  it("detects HDL trending down", () => {
    const hdl = s.markers.find((m) => m.code === "hdl")!;
    expect(hdl.trend.direction).toBe("down");
    expect(s.groups.worsened).toContain("hdl");
  });
  it("detects triglycerides and transaminases rising", () => {
    expect(s.groups.worsened).toEqual(expect.arrayContaining(["triglycerides", "alt", "ast"]));
  });
  it("detects metabolic syndrome", () => {
    expect(s.derived.metabolicSyndrome.atp.present).toBe(true);
    expect(s.derived.metabolicSyndrome.idf.present).toBe(true);
    expect(s.patterns.map((p) => p.id)).toEqual(expect.arrayContaining(["metabolic_cluster", "metabolic_syndrome_criteria"]));
  });
  it("detects systolic hypertension with a non-dipper pattern", () => {
    expect(s.derived.dipping?.pattern).toBe("non_dipper");
    expect(s.derived.bp?.category).toBe("stage2");
    expect(s.derived.bp?.isolatedSystolic).toBe(true); // day DBP mean 79.6
    const bp = s.patterns.find((p) => p.id === "blood_pressure")!;
    expect(bp.evidence.join(" ")).toMatch(/non_dipper/);
  });
  it("computes derived metrics", () => {
    expect(s.derived.bmi?.value).toBe(28.4);
    expect(s.derived.waistToHeight).toBeGreaterThan(0.5);
    expect(s.derived.tgHdl).toBeGreaterThan(3);
    expect(s.profile.age).toBe(43);
  });
  it("escalates deterministically (glucose prediabetes, ALT above reference, BP)", () => {
    const ids = s.escalations.map((e) => e.ruleId);
    expect(ids).toEqual(expect.arrayContaining(["glucose_prediabetes", "alt_above_ref", "hdl_low_male", "bp_stage1", "tg_high"]));
    expect(ids).not.toContain("bp_crisis_systolic");
  });
});

describe("pairBloodPressure", () => {
  it("pairs by group id and infers the period from Bogotá time when missing", () => {
    const r = pairBloodPressure([
      { type: "bp_systolic", value: 130, at: "2026-01-01T04:00:00Z", groupId: "x" }, // 23:00 Bogotá
      { type: "bp_diastolic", value: 80, at: "2026-01-01T04:00:00Z", groupId: "x" },
      { type: "bp_systolic", value: 120, at: "2026-01-01T15:00:00Z", groupId: "y" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].period).toBe("night");
  });
});
