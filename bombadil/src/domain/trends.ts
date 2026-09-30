import type { BetterWhen, DatedValue, TrendDirection, TrendMeaning } from "./types";
import { round } from "./units";

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export function sortByDate<T extends { at: string }>(points: T[]): T[] {
  return [...points].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Ordinary least squares slope in units per year. */
export function slopePerYear(points: DatedValue[]): number | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => Date.parse(p.at) / MS_PER_YEAR);
  const ys = points.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

export interface Trend {
  direction: TrendDirection;
  meaning: TrendMeaning;
  /** Change between first and last value, from the fitted line. */
  fittedChange: number | null;
  slopePerYear: number | null;
  first: DatedValue | null;
  last: DatedValue | null;
  n: number;
}

/**
 * Direction of a series. A change smaller than `meaningfulChange` across the
 * whole span is "stable" — lab noise is real and we should not over-read it.
 */
export function computeTrend(
  rawPoints: DatedValue[],
  meaningfulChange: number,
  betterWhen: BetterWhen,
  inRange?: (v: number) => boolean,
): Trend {
  const points = sortByDate(rawPoints);
  const n = points.length;
  const first = points[0] ?? null;
  const last = points[n - 1] ?? null;
  if (n < 2) {
    return { direction: "insufficient_data", meaning: "unknown", fittedChange: null, slopePerYear: null, first, last, n };
  }
  const slope = slopePerYear(points);
  const spanYears = (Date.parse(last!.at) - Date.parse(first!.at)) / MS_PER_YEAR;
  const fittedChange = slope === null ? null : slope * spanYears;
  let direction: TrendDirection = "stable";
  if (fittedChange !== null && Math.abs(fittedChange) >= meaningfulChange) {
    direction = fittedChange > 0 ? "up" : "down";
  }
  return {
    direction,
    meaning: meaningOf(direction, betterWhen, first!.value, last!.value, inRange),
    fittedChange: fittedChange === null ? null : round(fittedChange, 2),
    slopePerYear: slope === null ? null : round(slope, 3),
    first,
    last,
    n,
  };
}

function meaningOf(
  direction: TrendDirection,
  betterWhen: BetterWhen,
  firstValue: number,
  lastValue: number,
  inRange?: (v: number) => boolean,
): TrendMeaning {
  if (direction === "insufficient_data") return "unknown";
  if (direction === "stable") return "stable";
  if (betterWhen === "lower") return direction === "down" ? "improving" : "worsening";
  if (betterWhen === "higher") return direction === "up" ? "improving" : "worsening";
  // in_range: moving into range is improving, moving out is worsening.
  if (!inRange) return "unknown";
  const wasIn = inRange(firstValue);
  const isIn = inRange(lastValue);
  if (!wasIn && isIn) return "improving";
  if (wasIn && !isIn) return "worsening";
  return "stable";
}

/** Average of values within the last `days` days before `asOf` (inclusive). */
export function recentAverage(points: DatedValue[], days: number, asOf: Date = new Date()): number | null {
  const from = asOf.getTime() - days * 24 * 3600 * 1000;
  const vals = points.filter((p) => {
    const t = Date.parse(p.at);
    return t >= from && t <= asOf.getTime();
  });
  if (!vals.length) return null;
  return round(vals.reduce((a, p) => a + p.value, 0) / vals.length, 2);
}
