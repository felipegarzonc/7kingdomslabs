import { describe, expect, it } from "vitest";
import { deviceHints, ownHabitRows, parseOwnHabits } from "../own-habits";

const form = (entries: Record<string, string>) => ({ get: (n: string) => entries[n] ?? null });

describe("own habits", () => {
  it("reads checked habits with their days and moment, plus one of their own", () => {
    const own = parseOwnHabits(
      form({ own_caminar: "on", own_caminar_days: "4", own_caminar_anchor: "Después de almorzar", own_frutas: "on", own_fuerza_days: "3", other_title: "Bailo salsa", other_pillar: "movimiento", other_days: "1" }),
    )!;
    expect(ownHabitRows(own)).toEqual([
      { pillar: "movimiento", title: "Caminar o montar en bicicleta", anchor: "Después de almorzar", target_per_week: 4 },
      { pillar: "nutricion", title: "Frutas y verduras", anchor: null, target_per_week: 7 },
      { pillar: "movimiento", title: "Bailo salsa", anchor: null, target_per_week: 1 },
    ]);
  });

  it("accepts an empty list and rejects nonsense", () => {
    expect(parseOwnHabits(form({}))).toEqual({ selected: [], other: null });
    expect(parseOwnHabits(form({ own_caminar: "on", own_caminar_days: "9" }))).toBeNull();
    expect(parseOwnHabits(form({ other_title: "x" }))).toBeNull();
  });

  it("pre-checks what the watch shows", () => {
    expect(deviceHints({ days: 14, steps_per_day: 8200, sleep_hours: 6.4, exercise_minutes_per_week: 135, resting_hr: 58, hrv_ms: null })).toEqual({
      caminar: { days: 5, why: "8.200 pasos al día en promedio" },
      cardio: { days: 3, why: "135 minutos de ejercicio por semana" },
    });
    expect(deviceHints(null)).toEqual({});
  });
});
