import { describe, expect, it } from "vitest";
import { addDays } from "../habits";
import { computeGame, dayInColombia, type GameInput, levelFor, titleFor, XP, xpForLevel } from "../game";

const TODAY = "2026-10-01"; // a Thursday; the week starts on Monday 2026-09-28
const walk = { id: "walk", pillar: "movimiento" as const, target_per_week: 3, status: "active", started_on: "2026-09-01" };
const squats = { id: "squats", pillar: "fuerza" as const, target_per_week: 2, status: "active", started_on: "2026-09-01" };

function input(over: Partial<GameInput> = {}): GameInput {
  return { today: TODAY, habits: [walk, squats], logs: [], examDays: [], checkinDays: [], measurementDays: [], deviceConnected: false, goalsAchieved: 0, ...over };
}
const log = (habit_id: string, day: string, full_version = true, source = "manual") => ({ habit_id, day, full_version, source });

describe("levels", () => {
  it("costs a bit more each level and names it", () => {
    expect([1, 2, 3, 4, 5].map((l) => xpForLevel(l))).toEqual([0, 100, 300, 600, 1000]);
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, span: 100 });
    expect(levelFor(350)).toMatchObject({ level: 3, into: 50, span: 300 });
    expect(titleFor(1)).toBe("Aprendiz del bosque");
    expect(titleFor(6)).toBe("Rastreador");
  });
  it("reads Colombia days from timestamps", () => {
    expect(dayInColombia("2026-10-02T03:00:00Z")).toBe("2026-10-01");
  });
});

describe("computeGame", () => {
  it("is empty but valid with no history", () => {
    const g = computeGame(input());
    expect(g).toMatchObject({ xp: 0, level: 1, streak: { current: 0, best: 0, shields: 0 }, today: { done: 0, target: 2, xp: 0 } });
    expect(g.heatmap).toHaveLength(84);
    expect(g.achievements.every((a) => !a.unlocked)).toBe(true);
  });

  it("pays habits, the tiny version, weekly targets and quests; caps a pillar per day", () => {
    const g = computeGame(
      input({
        logs: [
          log("walk", "2026-09-28"),
          log("walk", "2026-09-29", false),
          log("walk", "2026-10-01"),
          log("squats", "2026-09-30"),
          log("squats", "2026-10-01"),
        ],
      }),
    );
    // walk: 10 + 5 + 10 + weekly 25; squats: 10 + 10 + weekly 25; quest "metas" (2 habits met) +50.
    const resistencia = g.attributes.find((a) => a.key === "movimiento")!;
    expect(resistencia.xp).toBe(50);
    expect(g.attributes.find((a) => a.key === "fuerza")!.xp).toBe(45);
    expect(g.quests.find((q) => q.key === "metas")).toMatchObject({ current: 2, target: 2, done: true });
    expect(g.quests.find((q) => q.key === "constancia")).toMatchObject({ current: 4, done: false });
    expect(g.xp).toBe(50 + 45 + XP.questComplete);
    expect(g.today).toEqual({ done: 2, target: 2, xp: 20 });
    expect(g.achievements.find((a) => a.key === "tres_de_tres")).toMatchObject({ unlocked: false, current: 2, target: 3 });
  });

  it("caps habit XP per attribute per day", () => {
    const twoWalks = { ...walk, id: "walk2" };
    const g = computeGame(input({ habits: [walk, twoWalks], logs: [log("walk", TODAY), log("walk2", TODAY), { ...log("walk", TODAY), habit_id: "walk" }] }));
    const habitXp = g.attributes.find((a) => a.key === "movimiento")!.xp;
    expect(habitXp).toBe(XP.habitDailyCapPerAttribute);
  });

  it("streak: today pending does not break it; shields cover a missed day; two misses reset", () => {
    const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => log("walk", addDays(from, i)));
    // 7 days in a row → 1 shield; miss 1 day (covered); 3 more days; today not yet logged.
    const g = computeGame(input({ logs: [...days("2026-09-20", 7), ...days("2026-09-28", 3)] }));
    expect(g.streak).toMatchObject({ current: 10, best: 10, shields: 0, activeToday: false, protectedDays: ["2026-09-27"] });
    expect(g.heatmap.find((h) => h.day === "2026-09-27")?.protected).toBe(true);
    // Without the shield the run breaks.
    const broken = computeGame(input({ logs: [...days("2026-09-24", 3), ...days("2026-09-29", 3)] }));
    expect(broken.streak).toMatchObject({ current: 3, best: 3, shields: 0 });
    expect(computeGame(input({ logs: days("2026-09-10", 21) })).streak.shields).toBe(2);
  });

  it("knowing yourself: exams, check-ins, measurements and a device feed Sabiduría", () => {
    const g = computeGame(input({ examDays: ["2026-09-01", "2026-09-01"], checkinDays: [TODAY], measurementDays: ["2026-09-02", TODAY], deviceConnected: true }));
    expect(g.attributes.find((a) => a.key === "sabiduria")!.xp).toBe(XP.exam + XP.checkin + 2 * XP.measurementDay + XP.deviceConnected);
    expect(g.quests.find((q) => q.key === "revision")?.done).toBe(true);
    expect(g.today.xp).toBe(XP.checkin + XP.measurementDay);
    const unlocked = g.achievements.filter((a) => a.unlocked).map((a) => a.key);
    expect(unlocked).toEqual(expect.arrayContaining(["conocete", "conectado"]));
  });

  it("ignores logs of unknown habits and future days; heatmap marks future cells", () => {
    const g = computeGame(input({ logs: [log("ghost", TODAY), log("walk", "2026-10-03")] }));
    expect(g.xp).toBe(0);
    expect(g.heatmap.at(-1)).toMatchObject({ day: "2026-10-04", value: -1 });
  });
});
