import { describe, expect, it } from "vitest";
import { deadlineFor, evaluateGoal } from "../goals";
import { missingCheckinThisWeek, pilotWeek, retentionByWeek } from "../pilot";

describe("goals", () => {
  const goal = { baseline: 98, target: 92, startDate: "2026-01-01", deadline: "2026-04-01" };
  it("computes deadlines from horizons", () => {
    expect(deadlineFor("2026-01-15", 3)).toBe("2026-04-15");
    expect(deadlineFor("2026-01-15", 12)).toBe("2027-01-15");
  });
  it("no data", () => {
    expect(evaluateGoal(goal, [], new Date("2026-02-01")).status).toBe("no_data");
  });
  it("on track when progress keeps pace", () => {
    const r = evaluateGoal(goal, [{ at: "2026-02-10", value: 95.5 }], new Date("2026-02-15"));
    expect(r.status).toBe("on_track");
  });
  it("stalled when behind schedule", () => {
    const r = evaluateGoal(goal, [{ at: "2026-03-10", value: 97.5 }], new Date("2026-03-15"));
    expect(r.status).toBe("stalled");
  });
  it("regressing when moving away from target", () => {
    const r = evaluateGoal(goal, [{ at: "2026-02-10", value: 100 }], new Date("2026-02-15"));
    expect(r.status).toBe("regressing");
  });
  it("achieved", () => {
    const r = evaluateGoal(goal, [{ at: "2026-03-10", value: 91.8 }], new Date("2026-03-15"));
    expect(r.status).toBe("achieved");
  });
  it("works for goals where higher is better", () => {
    const r = evaluateGoal({ baseline: 60, target: 150, startDate: "2026-01-01", deadline: "2026-04-01" }, [{ at: "2026-02-10", value: 120 }], new Date("2026-02-15"));
    expect(r.status).toBe("on_track");
  });
  it("smooths with the mean of the last three points and ignores pre-start points", () => {
    const r = evaluateGoal(
      goal,
      [
        { at: "2025-12-01", value: 80 },
        { at: "2026-02-01", value: 96 },
        { at: "2026-02-05", value: 95 },
        { at: "2026-02-09", value: 97 },
      ],
      new Date("2026-02-10"),
    );
    expect(r.current).toBe(96);
  });
});

describe("pilot", () => {
  it("numbers weeks from the pilot start", () => {
    expect(pilotWeek("2026-01-01", new Date("2026-01-01T10:00:00Z"))).toBe(1);
    expect(pilotWeek("2026-01-01", new Date("2026-01-07T23:00:00Z"))).toBe(1);
    expect(pilotWeek("2026-01-01", new Date("2026-01-08T00:00:00Z"))).toBe(2);
    expect(pilotWeek("2026-01-01", new Date("2026-02-12T00:00:00Z"))).toBe(7);
  });
  it("retention counts only eligible participants", () => {
    const participants = [
      { id: "a", pilotStart: "2026-01-01" },
      { id: "b", pilotStart: "2026-01-01" },
      { id: "c", pilotStart: "2026-01-15" },
      { id: "d", pilotStart: null },
    ];
    const checkins = [
      { participantId: "a", week: 1 },
      { participantId: "b", week: 1 },
      { participantId: "c", week: 1 },
      { participantId: "a", week: 3 },
    ];
    const rows = retentionByWeek(participants, checkins, 4, new Date("2026-01-20T00:00:00Z"));
    expect(rows[0]).toEqual({ week: 1, eligible: 3, reported: 3, rate: 1 });
    expect(rows[2]).toEqual({ week: 3, eligible: 2, reported: 1, rate: 0.5 });
    expect(rows[3]).toEqual({ week: 4, eligible: 0, reported: 0, rate: null });
  });
  it("withdrawn participants stop counting", () => {
    const rows = retentionByWeek([{ id: "a", pilotStart: "2026-01-01", withdrawnAt: "2026-01-09" }], [], 3, new Date("2026-01-25"));
    expect(rows.map((r) => r.eligible)).toEqual([1, 0, 0]);
  });
  it("lists who has not checked in this week", () => {
    const missing = missingCheckinThisWeek(
      [
        { id: "a", pilotStart: "2026-01-01" },
        { id: "b", pilotStart: "2026-01-01" },
      ],
      [{ participantId: "a", week: 2 }],
      new Date("2026-01-10"),
    );
    expect(missing).toEqual(["b"]);
  });
});
