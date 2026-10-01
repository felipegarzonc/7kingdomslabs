import { describe, expect, it } from "vitest";
import { addDays, adherence, progression, streak, todayInColombia, weekProgress, weekStart } from "../habits";

// 2026-10-01 is a Thursday.
const TODAY = "2026-10-01";
const daily = { target_per_week: 7, started_on: "2026-09-01" };
const thrice = { target_per_week: 3, started_on: "2026-09-01" };
const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

describe("dates", () => {
  it("weeks start on Monday", () => {
    expect(weekStart(TODAY)).toBe("2026-09-28");
    expect(weekStart("2026-09-28")).toBe("2026-09-28");
    expect(weekStart("2026-10-04")).toBe("2026-09-28");
  });
  it("today is computed in Colombia time", () => {
    expect(todayInColombia(new Date("2026-10-02T03:00:00Z"))).toBe("2026-10-01");
    expect(todayInColombia(new Date("2026-10-02T06:00:00Z"))).toBe("2026-10-02");
  });
});

describe("weekProgress", () => {
  it("counts this week's logs against the target", () => {
    const p = weekProgress(thrice, ["2026-09-27", "2026-09-28", "2026-09-30"], TODAY);
    expect(p).toEqual({ done: 2, target: 3, daysLeft: 4, met: false });
  });
});

describe("streak", () => {
  it("daily: consecutive days, not broken before today ends", () => {
    expect(streak(daily, range("2026-09-27", 4), TODAY)).toEqual({ value: 4, unit: "días" }); // 27..30
    expect(streak(daily, range("2026-09-27", 5), TODAY)).toEqual({ value: 5, unit: "días" }); // incl. today
    expect(streak(daily, ["2026-09-28", "2026-09-30"], TODAY)).toEqual({ value: 1, unit: "días" });
  });
  it("weekly: consecutive weeks that met the target", () => {
    const logs = ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-29"];
    expect(streak(thrice, logs, TODAY)).toEqual({ value: 2, unit: "semanas" });
    expect(streak(thrice, [...logs, "2026-09-30", "2026-10-01"], TODAY)).toEqual({ value: 3, unit: "semanas" });
  });
});

describe("progression", () => {
  it("is too early before two complete weeks", () => {
    expect(progression({ target_per_week: 3, started_on: "2026-09-24" }, [], TODAY)).toBe("too_early");
  });
  it("levels up after two weeks on target", () => {
    expect(progression(thrice, [...range("2026-09-14", 3), ...range("2026-09-21", 4)], TODAY)).toBe("level_up");
  });
  it("shrinks after two weeks under half the target", () => {
    expect(progression(daily, ["2026-09-15", "2026-09-23", "2026-09-24"], TODAY)).toBe("shrink");
  });
  it("keeps going in between", () => {
    expect(progression(thrice, ["2026-09-14", "2026-09-15", ...range("2026-09-21", 3)], TODAY)).toBe("keep");
  });
});

describe("adherence", () => {
  it("averages complete weeks, capped at the target", () => {
    expect(adherence(thrice, [...range("2026-09-21", 5), "2026-09-14"], TODAY, 2)).toBeCloseTo((1 + 1 / 3) / 2);
    expect(adherence({ target_per_week: 3, started_on: "2026-09-30" }, [], TODAY)).toBeNull();
  });
});
