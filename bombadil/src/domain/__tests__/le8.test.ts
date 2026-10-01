import { describe, expect, it } from "vitest";
import { activityScore, bmiScore, bpScore, dietScore, glucoseScore, le8, lipidScore, sleepScore } from "../le8";

describe("LE8 component scores (AHA 2022 tables)", () => {
  it("scores activity, sleep, BMI and lipids at the cutoffs", () => {
    expect([150, 149, 120, 90, 60, 30, 1, 0].map(activityScore)).toEqual([100, 90, 90, 80, 60, 40, 20, 0]);
    expect([7, 8.9, 9, 6.5, 5, 10, 4.5, 3].map(sleepScore)).toEqual([100, 100, 90, 70, 40, 40, 20, 0]);
    expect([24.9, 25, 30, 35, 40].map(bmiScore)).toEqual([100, 70, 30, 15, 0]);
    expect([129, 130, 160, 190, 220].map(lipidScore)).toEqual([100, 60, 40, 20, 0]);
  });

  it("scores glucose from fasting glucose and HbA1c", () => {
    expect(glucoseScore(92, null)).toBe(100);
    expect(glucoseScore(92, 5.8)).toBe(60);
    expect(glucoseScore(110, null)).toBe(60);
    expect(glucoseScore(130, null)).toBe(40);
    expect(glucoseScore(130, 7.4)).toBe(30);
    expect(glucoseScore(null, 10.2)).toBe(0);
    expect(glucoseScore(null, null)).toBeNull();
  });

  it("scores BP by the worse of systolic and diastolic", () => {
    expect(bpScore(118, 76)).toBe(100);
    expect(bpScore(124, 78)).toBe(75);
    expect(bpScore(118, 82)).toBe(50);
    expect(bpScore(142, 70)).toBe(25);
    expect(bpScore(150, 101)).toBe(0);
  });

  it("approximates diet from two answers", () => {
    expect(dietScore("4plus", "rare")).toBe(100);
    expect(dietScore("2_3", "weekly")).toBe(50);
    expect(dietScore("0_1", "daily")).toBe(0);
    expect(dietScore("x", "rare")).toBeNull();
  });
});

describe("le8", () => {
  it("averages the components it has and lists the missing ones", () => {
    const r = le8({ vegetables: "2_3", processed: "rare", lifestyleActivity: "60_150", activityMinutesPerWeek: 160, smoking: "never", lifestyleSleep: "6_7", bmi: 26.1 })!;
    expect(r.components.map((c) => [c.key, c.score])).toEqual([
      ["diet", 80],
      ["activity", 100],
      ["nicotine", 100],
      ["sleep", 70],
      ["bmi", 70],
    ]);
    expect(r.score).toBe(84);
    expect(r.category).toBe("high");
    expect(r.missing).toEqual(["lipids", "glucose", "bp"]);
  });

  it("prefers device sleep over the answer and returns null with no data", () => {
    expect(le8({ lifestyleSleep: "lt6", sleepHours: 7.4 })!.components[0]).toMatchObject({ key: "sleep", score: 100 });
    expect(le8({})).toBeNull();
  });

  it("categorises low scores", () => {
    expect(le8({ smoking: "current", nonHdl: 200, systolic: 150, diastolic: 95 })!.category).toBe("low");
  });
});
