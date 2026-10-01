import { describe, expect, it } from "vitest";
import { addDays } from "../habits";
import { habitPath, nextExamDue, PATH_HISTORY_WEEKS } from "../path";

const TODAY = "2026-10-01"; // Thursday; week starts 2026-09-28
const walk = { pillar: "movimiento" as const, target_per_week: 3, started_on: "2026-09-14", next_step: "Caminar 20 minutos" };
const week = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

describe("habitPath", () => {
  it("lays out past weeks, the current one, the next milestone, the next level and the boss", () => {
    const logs = [...week("2026-09-14", 3), ...week("2026-09-21", 1), ...week("2026-09-28", 2)];
    const p = habitPath(walk, logs, TODAY);
    expect(p.map((n) => n.kind)).toEqual(["done", "missed", "current", "milestone", "levelup", "boss"]);
    expect(p[2]).toMatchObject({ label: "Semana 3", progress: { done: 2, target: 3 } });
    expect(p[3]).toMatchObject({ label: "Hito: 3 semanas cumplidas", detail: "Te faltan 2 semanas", reached: false });
    expect(p[4]).toMatchObject({ detail: "Caminar 20 minutos", reached: false });
    expect(p[5]).toMatchObject({ label: "Prueba: tu VO2max", href: "/app/mediciones" });
  });

  it("marks reached milestones and a ready level-up after two strong weeks", () => {
    const habit = { ...walk, started_on: "2026-09-07" };
    const logs = [...week("2026-09-07", 3), ...week("2026-09-14", 3), ...week("2026-09-21", 3)];
    const p = habitPath(habit, logs, TODAY);
    expect(p.filter((n) => n.kind === "milestone").map((n) => n.reached)).toEqual([true, false]);
    expect(p.find((n) => n.kind === "levelup")).toMatchObject({ reached: true, href: "/app/plan" });
  });

  it("starts with the current week for a new habit and keeps long histories short", () => {
    expect(habitPath({ ...walk, started_on: TODAY }, [], TODAY)[0].kind).toBe("current");
    const old = habitPath({ ...walk, started_on: "2026-01-05" }, [], TODAY);
    expect(old.filter((n) => n.kind === "missed")).toHaveLength(PATH_HISTORY_WEEKS);
  });
});

describe("nextExamDue", () => {
  it("is three months after the last exam", () => {
    expect(nextExamDue(null, TODAY)).toBeNull();
    expect(nextExamDue("2026-08-01", TODAY)).toEqual({ due: "2026-10-30", daysLeft: 29 });
    expect(nextExamDue("2026-05-01", TODAY)?.daysLeft).toBeLessThan(0);
  });
});
