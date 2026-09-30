import { describe, expect, it } from "vitest";
import { computeTrend, recentAverage, slopePerYear } from "../trends";
import {
  bmi,
  bpCategory,
  isIsolatedSystolic,
  metabolicSyndromeATP,
  metabolicSyndromeIDF,
  nocturnalDipping,
  nonHdl,
  tgHdlRatio,
  waistToHeight,
  type BpReading,
} from "../derived";

describe("trends", () => {
  it("computes a slope per year", () => {
    const s = slopePerYear([
      { at: "2023-01-01", value: 50 },
      { at: "2025-01-01", value: 40 },
    ]);
    expect(s).toBeCloseTo(-5, 1);
  });
  it("marks HDL falling as worsening", () => {
    const t = computeTrend(
      [
        { at: "2023-01-01", value: 46 },
        { at: "2025-01-01", value: 41 },
        { at: "2026-01-01", value: 37 },
      ],
      4,
      "higher",
    );
    expect(t.direction).toBe("down");
    expect(t.meaning).toBe("worsening");
  });
  it("treats small changes as stable", () => {
    const t = computeTrend(
      [
        { at: "2023-01-01", value: 100 },
        { at: "2025-01-01", value: 103 },
      ],
      10,
      "lower",
    );
    expect(t.direction).toBe("stable");
  });
  it("needs two points", () => {
    expect(computeTrend([{ at: "2025-01-01", value: 1 }], 1, "lower").direction).toBe("insufficient_data");
  });
  it("in_range markers improve when entering the range", () => {
    const t = computeTrend(
      [
        { at: "2024-01-01", value: 15 },
        { at: "2025-01-01", value: 35 },
      ],
      5,
      "in_range",
      (v) => v >= 30 && v <= 100,
    );
    expect(t.meaning).toBe("improving");
  });
  it("sorts unordered input", () => {
    const t = computeTrend(
      [
        { at: "2026-01-01", value: 200 },
        { at: "2023-01-01", value: 150 },
      ],
      20,
      "lower",
    );
    expect(t.direction).toBe("up");
    expect(t.first?.value).toBe(150);
  });
  it("recentAverage windows by date", () => {
    const asOf = new Date("2026-01-10T00:00:00Z");
    expect(
      recentAverage(
        [
          { at: "2026-01-09T00:00:00Z", value: 80 },
          { at: "2026-01-05T00:00:00Z", value: 82 },
          { at: "2025-12-01T00:00:00Z", value: 90 },
        ],
        7,
        asOf,
      ),
    ).toBe(81);
  });
});

describe("derived metrics", () => {
  it("BMI, WHtR, non-HDL, TG/HDL", () => {
    expect(bmi(88, 176)).toBe(28.4);
    expect(waistToHeight(98, 176)).toBe(0.557);
    expect(nonHdl(212, 37)).toBe(175);
    expect(tgHdlRatio(231, 37)).toBe(6.24);
  });
  it("BP categories (ACC/AHA 2017)", () => {
    expect(bpCategory(118, 76)).toBe("normal");
    expect(bpCategory(125, 78)).toBe("elevated");
    expect(bpCategory(132, 78)).toBe("stage1");
    expect(bpCategory(145, 82)).toBe("stage2");
    expect(bpCategory(182, 90)).toBe("crisis");
    expect(isIsolatedSystolic(146, 78)).toBe(true);
    expect(isIsolatedSystolic(146, 92)).toBe(false);
  });
});

describe("metabolic syndrome", () => {
  const base = { sex: "male" as const, waistCm: 98, triglycerides: 231, hdl: 37, systolic: 146, diastolic: 80, fastingGlucose: 102 };
  it("ATP III: ≥3 criteria", () => {
    const r = metabolicSyndromeATP(base);
    expect(r.present).toBe(true);
    expect(r.criteria.waist).toBe("not_met"); // 98 ≤ 102
    expect(r.metCount).toBe(4);
  });
  it("IDF uses Latin American (South Asian) waist cut-offs", () => {
    const r = metabolicSyndromeIDF(base);
    expect(r.criteria.waist).toBe("met"); // ≥90
    expect(r.present).toBe(true);
  });
  it("IDF requires central obesity", () => {
    expect(metabolicSyndromeIDF({ ...base, waistCm: 85 }).present).toBe(false);
  });
  it("returns null when data is insufficient to decide", () => {
    expect(metabolicSyndromeATP({ sex: "female", hdl: 45, triglycerides: 160 }).present).toBeNull();
  });
  it("returns false when even unknowns cannot reach the threshold", () => {
    expect(metabolicSyndromeATP({ sex: "female", hdl: 60, triglycerides: 90, fastingGlucose: 85 }).present).toBe(false);
  });
  it("treatment counts as meeting the criterion", () => {
    expect(metabolicSyndromeATP({ sex: "male", systolic: 118, diastolic: 70, onBpTreatment: true }).criteria.blood_pressure).toBe("met");
  });
});

describe("nocturnal dipping", () => {
  const mk = (period: "day" | "night", s: number, d: number, i: number): BpReading => ({ at: `2026-01-0${i + 1}`, systolic: s, diastolic: d, period });
  it("classifies non-dipper", () => {
    const r = nocturnalDipping([mk("day", 150, 80, 0), mk("day", 146, 80, 1), mk("day", 148, 80, 2), mk("night", 142, 75, 3), mk("night", 140, 75, 4), mk("night", 141, 75, 5)]);
    expect(r?.pattern).toBe("non_dipper");
    expect(r?.dipPercent).toBeCloseTo(4.7, 1);
  });
  it("classifies dipper, extreme and reverse", () => {
    const series = (night: number) => [0, 1, 2].map((i) => mk("day", 140, 80, i)).concat([3, 4, 5].map((i) => mk("night", night, 70, i)));
    expect(nocturnalDipping(series(120))?.pattern).toBe("dipper");
    expect(nocturnalDipping(series(110))?.pattern).toBe("extreme_dipper");
    expect(nocturnalDipping(series(145))?.pattern).toBe("reverse_dipper");
  });
  it("requires ≥3 day and night readings", () => {
    expect(nocturnalDipping([mk("day", 140, 80, 0), mk("night", 130, 70, 1)])).toBeNull();
  });
});
