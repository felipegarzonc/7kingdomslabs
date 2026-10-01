export type Sex = "male" | "female";

/** Numeric interval; either bound may be open. Inclusive on both ends. */
export interface Range {
  low?: number;
  high?: number;
}

export type SexedRange = Range | { male: Range; female: Range };

/** Which direction is healthier for a marker. */
export type BetterWhen = "lower" | "higher" | "in_range";

export type Flag = "low" | "normal" | "high";
export type OptimalFlag = "optimal" | "suboptimal";

export interface DatedValue {
  /** ISO date or datetime string. */
  at: string;
  value: number;
}

export type MeasurementType =
  | "weight"
  | "waist"
  | "bp_systolic"
  | "bp_diastolic"
  | "resting_hr"
  | "sleep_hours"
  | "exercise_minutes"
  | "grip_strength"
  | "vo2max"
  | "alcohol_drinks"
  | "steps";

export type SmokingStatus = "never" | "former" | "current";

export type EscalationLevel = "urgency" | "consult_soon" | "next_visit";

export type GoalStatus = "achieved" | "on_track" | "stalled" | "regressing" | "no_data";

export type TrendDirection = "up" | "down" | "stable" | "insufficient_data";
export type TrendMeaning = "improving" | "worsening" | "stable" | "unknown";
