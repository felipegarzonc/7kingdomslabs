import type { DatedValue, GoalStatus } from "./types";
import { round } from "./units";
import { sortByDate } from "./trends";

export type GoalHorizon = 3 | 6 | 12;

export interface GoalInput {
  baseline: number;
  target: number;
  /** ISO date the goal started (baseline date). */
  startDate: string;
  /** ISO date the goal is due. */
  deadline: string;
}

export interface GoalEvaluation {
  status: GoalStatus;
  current: number | null;
  /** Fraction of the way from baseline to target (can be negative or >1). */
  progress: number | null;
  /** Fraction of the time elapsed. */
  expected: number;
}

/** How far behind schedule still counts as "on track". */
export const ON_TRACK_TOLERANCE = 0.2;
/** Moving away from target by more than this fraction of the gap = regressing. */
export const REGRESSION_THRESHOLD = 0.1;

export function deadlineFor(startDate: string, horizon: GoalHorizon): string {
  const d = new Date(startDate);
  d.setUTCMonth(d.getUTCMonth() + horizon);
  return d.toISOString().slice(0, 10);
}

/**
 * Status of a goal against the participant's own baseline.
 * `current` is the mean of the last up-to-3 points (smooths daily noise for
 * measurements like weight and BP).
 */
export function evaluateGoal(goal: GoalInput, points: DatedValue[], asOf: Date = new Date()): GoalEvaluation {
  const start = Date.parse(goal.startDate);
  const end = Date.parse(goal.deadline);
  const expected = Math.min(1, Math.max(0, (asOf.getTime() - start) / Math.max(1, end - start)));
  const relevant = sortByDate(points).filter((p) => Date.parse(p.at) >= start && Date.parse(p.at) <= asOf.getTime());
  if (!relevant.length) return { status: "no_data", current: null, progress: null, expected: round(expected, 2) };

  const lastThree = relevant.slice(-3);
  const current = round(lastThree.reduce((a, p) => a + p.value, 0) / lastThree.length, 2);
  const gap = goal.target - goal.baseline;
  if (gap === 0) {
    return { status: current === goal.target ? "achieved" : "regressing", current, progress: 1, expected: round(expected, 2) };
  }
  const progress = (current - goal.baseline) / gap;

  let status: GoalStatus;
  if (progress >= 1) status = "achieved";
  else if (progress < -REGRESSION_THRESHOLD) status = "regressing";
  else if (progress >= expected - ON_TRACK_TOLERANCE) status = "on_track";
  else status = "stalled";

  return { status, current, progress: round(progress, 2), expected: round(expected, 2) };
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  achieved: "Lograda",
  on_track: "En camino",
  stalled: "Estancada",
  regressing: "Retrocediendo",
  no_data: "Sin datos",
};
