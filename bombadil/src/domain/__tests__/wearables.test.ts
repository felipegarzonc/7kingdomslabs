import { describe, expect, it } from "vitest";
import { autoHabitLogs, deviceSummary, noonColombia, parseAppleHealth, stravaDays } from "../wearables";

describe("stravaDays", () => {
  it("adds moving time per local day and flags strength sessions", () => {
    const { rows, days } = stravaDays([
      { id: 1, sport_type: "Run", moving_time: 1800, start_date_local: "2026-10-01T06:30:00Z" },
      { id: 2, sport_type: "WeightTraining", moving_time: 2700, start_date_local: "2026-10-01T18:00:00Z" },
      { id: 3, sport_type: "Walk", moving_time: 610, start_date_local: "2026-09-30T12:00:00Z" },
    ]);
    expect(days).toEqual([
      { day: "2026-09-30", exerciseMinutes: 10, steps: 0, strength: false },
      { day: "2026-10-01", exerciseMinutes: 75, steps: 0, strength: true },
    ]);
    expect(rows[1]).toEqual({ type: "exercise_minutes", value: 75, measured_at: noonColombia("2026-10-01"), external_id: "day:2026-10-01" });
  });
});

describe("parseAppleHealth", () => {
  it("reads Health Auto Export daily metrics, sleep, pounds, blood pressure and workouts", () => {
    const { rows, days } = parseAppleHealth({
      data: {
        metrics: [
          { name: "step_count", units: "count", data: [{ date: "2026-10-01 00:00:00 -0500", qty: 4000 }, { date: "2026-10-01 00:00:00 -0500", qty: 4500 }] },
          { name: "resting_heart_rate", units: "count/min", data: [{ date: "2026-10-01 00:00:00 -0500", qty: 57.6 }] },
          { name: "sleep_analysis", units: "hr", data: [{ date: "2026-10-01 00:00:00 -0500", totalSleep: 7.24 }] },
          { name: "weight_body_mass", units: "lb", data: [{ date: "2026-10-01 07:00:00 -0500", qty: 176.4 }] },
          { name: "blood_pressure", units: "mmHg", data: [{ date: "2026-10-01 08:12:00 -0500", systolic: 128, diastolic: 82 }] },
          { name: "heart_rate", units: "count/min", data: [{ date: "2026-10-01 00:00:00 -0500", qty: 70 }] },
        ],
        workouts: [{ name: "Traditional Strength Training", start: "2026-10-01 18:00:00 -0500" }],
      },
    });
    const by = (t: string) => rows.find((r) => r.type === t)?.value;
    expect(by("steps")).toBe(8500);
    expect(by("resting_hr")).toBe(58);
    expect(by("sleep_hours")).toBe(7.2);
    expect(by("weight")).toBe(80);
    expect(by("bp_systolic")).toBe(128);
    expect(rows.find((r) => r.type === "bp_diastolic")?.measured_at).toBe("2026-10-01T13:12:00.000Z");
    expect(rows.some((r) => r.type === ("heart_rate" as never))).toBe(false);
    expect(days).toEqual([{ day: "2026-10-01", exerciseMinutes: 0, steps: 8500, strength: true }]);
  });

  it("reads HRV and deep/REM sleep", () => {
    const { rows } = parseAppleHealth({
      data: {
        metrics: [
          { name: "heart_rate_variability", units: "ms", data: [{ date: "2026-10-01 07:00:00 -0500", qty: 41.4 }, { date: "2026-10-01 22:00:00 -0500", qty: 52.6 }] },
          { name: "sleep_analysis", units: "hr", data: [{ date: "2026-10-01", totalSleep: 7, deep: 1.24, rem: 1.66 }] },
        ],
      },
    });
    const by = (t: string) => rows.find((r) => r.type === t)?.value;
    expect([by("hrv_ms"), by("sleep_hours"), by("sleep_deep_hours"), by("sleep_rem_hours")]).toEqual([47, 7, 1.2, 1.7]);
  });

  it("falls back to sleep stages when there is no total", () => {
    const { rows } = parseAppleHealth({ data: { metrics: [{ name: "sleep_analysis", data: [{ date: "2026-10-01", asleep: 0, core: 4, deep: 1.1, rem: 1.5 }] }] } });
    expect(rows.find((r) => r.type === "sleep_hours")?.value).toBe(6.6);
  });

  it("accepts the flat Shortcuts format, one day or many", () => {
    const one = parseAppleHealth({ date: "2026-10-01", steps: "9000", sleep_hours: 6.5, systolic: 120, diastolic: 78 });
    expect(one.rows.map((r) => [r.type, r.value])).toEqual([
      ["steps", 9000],
      ["sleep_hours", 6.5],
      ["bp_systolic", 120],
      ["bp_diastolic", 78],
    ]);
    const many = parseAppleHealth([{ date: "2026-09-30", steps: 100 }, { date: "nope", steps: 5 }, { date: "2026-10-01", exercise_minutes: 30 }]);
    expect(many.days.map((d) => d.day)).toEqual(["2026-09-30", "2026-10-01"]);
  });

  it("ignores junk", () => {
    expect(parseAppleHealth(null).rows).toEqual([]);
    expect(parseAppleHealth({ data: { metrics: [{ name: "step_count", data: [{ date: "x", qty: 1 }] }] } }).rows).toEqual([]);
  });
});

describe("autoHabitLogs", () => {
  const habits = [
    { id: "walk", pillar: "movimiento" as const, status: "active", started_on: "2026-09-28" },
    { id: "squats", pillar: "fuerza" as const, status: "active", started_on: "2026-09-28" },
    { id: "sleep", pillar: "sueno" as const, status: "active", started_on: "2026-09-28" },
    { id: "later", pillar: "movimiento" as const, status: "suggested", started_on: null },
  ];
  it("logs movement with enough minutes or steps and strength only on strength days", () => {
    const out = autoHabitLogs(
      habits,
      [
        { day: "2026-09-27", exerciseMinutes: 60, steps: 0, strength: true }, // before the habit started
        { day: "2026-09-29", exerciseMinutes: 9, steps: 7000, strength: false },
        { day: "2026-09-30", exerciseMinutes: 5, steps: 2000, strength: false },
        { day: "2026-10-01", exerciseMinutes: 40, steps: 0, strength: true },
        { day: "2026-10-02", exerciseMinutes: 40, steps: 0, strength: true }, // future
      ],
      "2026-10-01",
    );
    expect(out).toEqual([
      { habit_id: "walk", day: "2026-09-29" },
      { habit_id: "walk", day: "2026-10-01" },
      { habit_id: "squats", day: "2026-10-01" },
    ]);
  });
  it("only fills the last week", () => {
    expect(autoHabitLogs(habits, [{ day: "2026-09-24", exerciseMinutes: 60, steps: 0, strength: false }], "2026-10-05")).toEqual([]);
  });
});

describe("deviceSummary", () => {
  it("averages recent device data and ignores manual entries", () => {
    const at = (d: string) => noonColombia(d);
    const s = deviceSummary(
      [
        { type: "steps", value: 8000, measured_at: at("2026-10-01"), source: "apple_health" },
        { type: "steps", value: 6000, measured_at: at("2026-09-30"), source: "apple_health" },
        { type: "steps", value: 99999, measured_at: at("2026-09-01"), source: "apple_health" },
        { type: "exercise_minutes", value: 30, measured_at: at("2026-10-01"), source: "strava" },
        { type: "exercise_minutes", value: 20, measured_at: at("2026-10-01"), source: "apple_health" },
        { type: "exercise_minutes", value: 40, measured_at: at("2026-09-29"), source: "strava" },
        { type: "sleep_hours", value: 5, measured_at: at("2026-10-01"), source: "manual" },
      ],
      "2026-10-01",
      7,
    );
    expect(s).toEqual({ days: 7, steps_per_day: 7000, sleep_hours: null, exercise_minutes_per_week: 70, resting_hr: null, hrv_ms: null });
    expect(deviceSummary([], "2026-10-01")).toBeNull();
  });
});
