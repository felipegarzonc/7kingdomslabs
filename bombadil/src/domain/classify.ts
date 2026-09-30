import { getBiomarker } from "./biomarkers";
import type { Flag, OptimalFlag, Range, Sex, SexedRange } from "./types";
import { normalizeUnit, round, UnitConversionError } from "./units";

export function resolveRange(range: SexedRange | undefined, sex: Sex): Range | undefined {
  if (!range) return undefined;
  if ("male" in range) return range[sex];
  return range;
}

export function toCanonical(code: string, value: number, unit: string): number {
  const b = getBiomarker(code);
  const nu = normalizeUnit(unit);
  const conv = b.conversions.find((c) => c.unit === nu);
  if (!conv) throw new UnitConversionError(unit, code);
  return round(value * conv.factor + (conv.offset ?? 0), 3);
}

export function canConvert(code: string, unit: string): boolean {
  const nu = normalizeUnit(unit);
  return getBiomarker(code).conversions.some((c) => c.unit === nu);
}

export function flagAgainst(value: number, range: Range | undefined): Flag {
  if (!range) return "normal";
  if (range.low !== undefined && value < range.low) return "low";
  if (range.high !== undefined && value > range.high) return "high";
  return "normal";
}

export interface Classification {
  flag: Flag;
  optimal: OptimalFlag | null;
  referenceUsed: Range | undefined;
  referenceSource: "lab" | "catalog";
}

/**
 * Classify a canonical value. A lab-provided reference range (already converted
 * to canonical units) wins over the catalog's generic range.
 */
export function classify(
  code: string,
  canonicalValue: number,
  sex: Sex,
  labReference?: Range | null,
): Classification {
  const b = getBiomarker(code);
  const hasLabRange = !!labReference && (labReference.low !== undefined || labReference.high !== undefined);
  const reference = hasLabRange ? labReference! : resolveRange(b.reference, sex);
  const optimalRange = resolveRange(b.optimal, sex);
  return {
    flag: flagAgainst(canonicalValue, reference),
    optimal: optimalRange ? (flagAgainst(canonicalValue, optimalRange) === "normal" ? "optimal" : "suboptimal") : null,
    referenceUsed: reference,
    referenceSource: hasLabRange ? "lab" : "catalog",
  };
}
