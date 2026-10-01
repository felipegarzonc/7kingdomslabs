import { describe, expect, it } from "vitest";
import { BIOMARKERS, matchBiomarker } from "../biomarkers";
import { canConvert, classify, toCanonical } from "../classify";
import { normalizeUnit, UnitConversionError } from "../units";

describe("normalizeUnit", () => {
  it.each([
    ["mg/dl", "mg/dl"],
    ["mg / dL", "mg/dl"],
    ["UI/L", "u/l"],
    ["U/L", "u/l"],
    ["µUI/mL", "mu/l"],
    ["mUI/L", "mu/l"],
    ["µmol/L", "umol/l"],
    ["x10^3/uL", "10^3/ul"],
    ["10^9/L", "10^3/ul"],
    ["células/µL", "/ul"],
    ["/mm3", "/ul"],
    ["mg/dL (urea)", "mg/dl(urea)"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeUnit(raw)).toBe(expected);
  });
});

describe("toCanonical", () => {
  it("converts glucose mmol/L to mg/dL", () => {
    expect(toCanonical("glucose_fasting", 5.5, "mmol/L")).toBeCloseTo(99.1, 1);
  });
  it("converts cholesterol and triglycerides mmol/L", () => {
    expect(toCanonical("hdl", 1.0, "mmol/L")).toBeCloseTo(38.67, 2);
    expect(toCanonical("triglycerides", 1.7, "mmol/L")).toBeCloseTo(150.6, 1);
  });
  it("converts HbA1c IFCC mmol/mol to NGSP %", () => {
    expect(toCanonical("hba1c", 48, "mmol/mol")).toBeCloseTo(6.54, 1);
    expect(toCanonical("hba1c", 39, "mmol/mol")).toBeCloseTo(5.72, 1);
  });
  it("converts creatinine µmol/L", () => {
    expect(toCanonical("creatinine", 88.42, "µmol/L")).toBeCloseTo(1, 3);
  });
  it("converts vitamin D nmol/L", () => {
    expect(toCanonical("vitamin_d", 75, "nmol/L")).toBeCloseTo(30.05, 1);
  });
  it("converts urea to BUN", () => {
    expect(toCanonical("bun", 32.1, "mg/dL (urea)")).toBeCloseTo(15, 1);
  });
  it("converts absolute counts per µL", () => {
    expect(toCanonical("platelets", 250000, "/µL")).toBe(250);
    expect(toCanonical("eosinophils_abs", 300, "células/µL")).toBe(0.3);
  });
  it("treats µUI/mL TSH as mUI/L", () => {
    expect(toCanonical("tsh", 2.1, "µUI/mL")).toBe(2.1);
  });
  it("throws on unknown unit", () => {
    expect(() => toCanonical("ldl", 100, "furlongs")).toThrow(UnitConversionError);
    expect(canConvert("ldl", "furlongs")).toBe(false);
  });
});

describe("classify", () => {
  it("uses sex-specific HDL reference", () => {
    expect(classify("hdl", 45, "male").flag).toBe("normal");
    expect(classify("hdl", 45, "female").flag).toBe("low");
  });
  it("prefers the lab's own reference range", () => {
    const c = classify("alt", 45, "male", { high: 50 });
    expect(c.flag).toBe("normal");
    expect(c.referenceSource).toBe("lab");
    expect(c.optimal).toBe("suboptimal");
  });
  it("flags triglycerides high and optimal", () => {
    expect(classify("triglycerides", 160, "male").flag).toBe("high");
    expect(classify("triglycerides", 90, "male").optimal).toBe("optimal");
  });
});

describe("catalog", () => {
  it("covers every biomarker from the brief", () => {
    const codes = BIOMARKERS.map((b) => b.code);
    for (const c of ["glucose_fasting", "hba1c", "total_cholesterol", "ldl", "hdl", "triglycerides", "ast", "alt", "ggt", "creatinine", "bun", "uric_acid", "tsh", "vitamin_d", "vitamin_b12", "hemoglobin", "hematocrit", "platelets", "wbc", "eosinophils_pct", "eosinophils_abs", "hscrp", "uacr"]) {
      expect(codes).toContain(c);
    }
  });
  it("every biomarker cites a source and converts its own canonical unit", () => {
    for (const b of BIOMARKERS) {
      expect(b.source.length).toBeGreaterThan(5);
      expect(b.conversions.some((c) => c.factor === 1 && !c.offset)).toBe(true);
    }
  });
  it("synonyms are unique across biomarkers", () => {
    const seen = new Map<string, string>();
    for (const b of BIOMARKERS) for (const s of b.synonyms) {
      const k = s.toLowerCase();
      expect(seen.get(k) ?? b.code, `synonym "${s}"`).toBe(b.code);
      seen.set(k, b.code);
    }
  });
  it.each([
    ["Colesterol HDL", "hdl"],
    ["TRIGLICÉRIDOS", "triglycerides"],
    ["Transaminasa Glutámico Pirúvica", "alt"],
    ["TGO", "ast"],
    ["Glicemia", "glucose_fasting"],
    ["Hemoglobina Glicosilada", "hba1c"],
    ["Nitrógeno Ureico", "bun"],
    ["25-Hidroxivitamina D", "vitamin_d"],
    ["Proteína C Reactiva Ultrasensible", "hscrp"],
  ])("matches lab name %s", (name, code) => {
    expect(matchBiomarker(name)).toBe(code);
  });
  it("returns null for unknown names", () => {
    expect(matchBiomarker("Ferritina")).toBeNull();
  });
});
