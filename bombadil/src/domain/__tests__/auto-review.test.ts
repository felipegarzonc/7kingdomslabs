import { describe, expect, it } from "vitest";
import { autoAcceptRows, type ExtractedRow } from "../auto-review";

const row = (over: Partial<ExtractedRow>): ExtractedRow => ({
  name_as_printed: "HDL",
  biomarker_code: "hdl",
  value: 45,
  qualifier: null,
  unit: "mg/dL",
  ref_low: 40,
  ref_high: null,
  ...over,
});

describe("autoAcceptRows", () => {
  it("accepts catalog rows with a convertible unit, keeping the lab's range", () => {
    const { accepted, skipped } = autoAcceptRows([row({}), row({ name_as_printed: "Triglicéridos", biomarker_code: "triglycerides", value: 2.1, unit: "mmol/L", ref_low: null, ref_high: 1.7 })]);
    expect(skipped).toEqual([]);
    expect(accepted).toEqual([
      { index: 0, code: "hdl", value: 45, unit: "mg/dL", low: 40, high: null },
      { index: 1, code: "triglycerides", value: 2.1, unit: "mmol/L", low: null, high: 1.7 },
    ]);
  });

  it("skips rows outside the catalog, with unknown units, invalid values or duplicates", () => {
    const { accepted, skipped } = autoAcceptRows([
      row({ name_as_printed: "Sodio", biomarker_code: null }),
      row({ name_as_printed: "Glucosa", biomarker_code: "glucose_fasting", unit: "mg/24h" }),
      row({ name_as_printed: "LDL", biomarker_code: "ldl", unit: null }),
      row({ name_as_printed: "ALT", biomarker_code: "alt", unit: "U/L", value: -3 }),
      row({ name_as_printed: "Invento", biomarker_code: "made_up" }),
      row({}),
      row({ name_as_printed: "HDL (resumen)" }),
    ]);
    expect(accepted.map((a) => a.index)).toEqual([5]);
    expect(skipped).toEqual([
      { index: 0, name: "Sodio", reason: "not_in_catalog" },
      { index: 1, name: "Glucosa", reason: "unit_not_convertible" },
      { index: 2, name: "LDL", reason: "unit_not_convertible" },
      { index: 3, name: "ALT", reason: "invalid_value" },
      { index: 4, name: "Invento", reason: "not_in_catalog" },
      { index: 6, name: "HDL (resumen)", reason: "duplicate" },
    ]);
  });

  it("drops non-finite reference bounds instead of storing them", () => {
    const { accepted } = autoAcceptRows([row({ ref_low: Number.NaN, ref_high: 90 })]);
    expect(accepted[0]).toMatchObject({ low: null, high: 90 });
  });
});
