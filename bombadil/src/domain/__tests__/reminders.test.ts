import { describe, expect, it } from "vitest";
import { defaultReminderTime, dueReminders, type ReminderHabit } from "../reminders";

const habit = (over: Partial<ReminderHabit> = {}): ReminderHabit => ({
  id: "walk",
  participant_id: "ana",
  title: "Caminar 10 minutos",
  tiny: "ponerte los tenis",
  anchor: "después de almorzar",
  target_per_week: 5,
  started_on: "2026-09-20",
  reminder_time: null,
  ...over,
});
const base = { today: "2026-10-01", doneToday: new Set<string>(), doneYesterday: new Set(["walk"]), sentToday: new Set<string>() };
const at = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe("defaultReminderTime", () => {
  it("reads the anchor", () => {
    expect(defaultReminderTime("después de almorzar")).toBe("13:00");
    expect(defaultReminderTime("con el café de la mañana")).toBe("07:30");
    expect(defaultReminderTime("antes de dormir")).toBe("21:00");
    expect(defaultReminderTime(null)).toBe("18:00");
  });
});

describe("dueReminders", () => {
  it("sends at the habit's time, within a 3-hour window, once", () => {
    expect(dueReminders({ ...base, habits: [habit()], nowMinutes: at("12:45") })).toEqual([]);
    expect(dueReminders({ ...base, habits: [habit()], nowMinutes: at("13:00") })).toEqual([
      { habit_id: "walk", participant_id: "ana", kind: "daily", title: "Después de almorzar: Caminar 10 minutos", body: "Un toque para marcarlo en Bombadil. Basta con: ponerte los tenis." },
    ]);
    expect(dueReminders({ ...base, habits: [habit()], nowMinutes: at("16:15") })).toEqual([]);
    expect(dueReminders({ ...base, habits: [habit()], nowMinutes: at("13:30"), sentToday: new Set(["walk"]) })).toEqual([]);
    expect(dueReminders({ ...base, habits: [habit()], nowMinutes: at("13:30"), doneToday: new Set(["walk"]) })).toEqual([]);
  });

  it("uses the chosen time and respects quiet hours", () => {
    expect(dueReminders({ ...base, habits: [habit({ reminder_time: "05:30:00" })], nowMinutes: at("05:45") })).toEqual([]);
    expect(dueReminders({ ...base, habits: [habit({ reminder_time: "06:15:00" })], nowMinutes: at("06:15") })).toHaveLength(1);
  });

  it("switches to 'never miss twice' after a missed day for near-daily habits", () => {
    const r = dueReminders({ ...base, habits: [habit()], doneYesterday: new Set(), nowMinutes: at("13:10") });
    expect(r[0]).toMatchObject({ kind: "never_twice", title: "Nunca falles dos veces" });
    const weekly = dueReminders({ ...base, habits: [habit({ target_per_week: 3 })], doneYesterday: new Set(), nowMinutes: at("13:10") });
    expect(weekly[0].kind).toBe("daily");
    const newHabit = dueReminders({ ...base, habits: [habit({ started_on: "2026-10-01" })], doneYesterday: new Set(), nowMinutes: at("13:10") });
    expect(newHabit[0].kind).toBe("daily");
  });
});
