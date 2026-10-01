/**
 * Automatic acceptance of an LLM lab extraction, replacing the operator's
 * manual review: keeps only rows the catalog can interpret unambiguously.
 * Anything doubtful is skipped (and listed) rather than guessed.
 */
import { BIOMARKER_BY_CODE } from "./biomarkers";
import { canConvert } from "./classify";

export interface ExtractedRow {
  name_as_printed: string;
  biomarker_code: string | null;
  value: number;
  qualifier: "<" | ">" | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
}

export interface AcceptedRow {
  /** Position in the extraction, to trace each result back to the PDF row. */
  index: number;
  code: string;
  value: number;
  unit: string;
  low: number | null;
  high: number | null;
}

export type SkipReason = "not_in_catalog" | "unit_not_convertible" | "invalid_value" | "duplicate";

export interface SkippedRow {
  index: number;
  name: string;
  reason: SkipReason;
}

const finiteOrNull = (v: number | null): number | null => (v !== null && Number.isFinite(v) ? v : null);

export function autoAcceptRows(rows: ExtractedRow[]): { accepted: AcceptedRow[]; skipped: SkippedRow[] } {
  const accepted: AcceptedRow[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();
  rows.forEach((r, index) => {
    const skip = (reason: SkipReason) => skipped.push({ index, name: r.name_as_printed, reason });
    const code = r.biomarker_code;
    if (!code || !BIOMARKER_BY_CODE.has(code)) return skip("not_in_catalog");
    if (!Number.isFinite(r.value) || r.value < 0) return skip("invalid_value");
    const unit = (r.unit ?? "").trim();
    if (!unit || !canConvert(code, unit)) return skip("unit_not_convertible");
    // The first occurrence wins (labs sometimes repeat a value in a summary table).
    if (seen.has(code)) return skip("duplicate");
    seen.add(code);
    accepted.push({ index, code, value: r.value, unit, low: finiteOrNull(r.ref_low), high: finiteOrNull(r.ref_high) });
  });
  return { accepted, skipped };
}
