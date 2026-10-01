/**
 * Unit normalisation. Labs write the same unit many ways ("mg/dl", "mg / dL",
 * "UI/L", "µUI/mL"...). We normalise the string first, then look up a
 * conversion declared in the biomarker catalog.
 */

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\s+/g, ""],
  [/μ/g, "u"], // greek mu
  [/µ/g, "u"], // micro sign
  [/mcg/g, "ug"],
  [/^ui\//, "u/"],
  [/^iu\//, "u/"],
  [/^mui\//, "mu/"],
  [/^miu\//, "mu/"],
  [/^uui\//, "mu/"], // µUI/mL == mUI/L == mIU/L
  [/^uiu\//, "mu/"],
  [/^mu\/ml$/, "mu/ml"],
  [/x10\^?3\/ul|10\^?3\/ul|10e3\/ul|k\/ul|miles\/ul|x10\^?3\/mm3|10\^?3\/mm3|miles\/mm3/, "10^3/ul"],
  [/x10\^?9\/l|10\^?9\/l|10e9\/l/, "10^3/ul"], // 10^9/L is numerically identical to 10^3/µL
  [/\/mm3$/, "/ul"],
  [/cel\/ul|cells\/ul|células\/ul/, "/ul"],
  [/gr\/dl/, "g/dl"],
  [/mg\/l\b/, "mg/l"],
];

export function normalizeUnit(raw: string | null | undefined): string {
  if (!raw) return "";
  let u = raw.trim().toLowerCase();
  for (const [re, rep] of REPLACEMENTS) u = u.replace(re, rep);
  // µUI/mL (mu/ml) is the same quantity as mUI/L for TSH in practice: 1 µIU/mL = 1 mIU/L.
  if (u === "mu/ml" || u === "uu/ml") u = "mu/l";
  return u;
}

export interface UnitConversion {
  /** Normalised unit string (see normalizeUnit). */
  unit: string;
  /** canonical = value * factor + offset */
  factor: number;
  offset?: number;
}

export class UnitConversionError extends Error {
  constructor(
    public readonly unit: string,
    public readonly biomarker: string,
  ) {
    super(`No conversion from "${unit}" for biomarker ${biomarker}`);
    this.name = "UnitConversionError";
  }
}

export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
