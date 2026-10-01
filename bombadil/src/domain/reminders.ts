/**
 * Which habit reminders to send now. Pure: the cron route loads the data and sends.
 *
 * - One reminder per habit per day, at its time (or a default from its anchor), only if it is not done yet.
 * - "Nunca falles dos veces": if a daily-ish habit was missed yesterday, today's reminder says so and
 *   offers the tiny version (Clear, Atomic Habits; Lally 2010: one miss does not undo the habit).
 * - Quiet hours: nothing before 06:00 or after 22:00, and nothing more than 3 h late (if the cron stalled).
 */
import { addDays } from "./habits";

export type ReminderKind = "daily" | "never_twice";

export interface ReminderHabit {
  id: string;
  participant_id: string;
  title: string;
  tiny: string | null;
  anchor: string | null;
  target_per_week: number;
  started_on: string | null;
  /** "HH:MM" or "HH:MM:SS", Colombia time; null = default from the anchor. */
  reminder_time: string | null;
}

export interface DueReminder {
  habit_id: string;
  participant_id: string;
  kind: ReminderKind;
  title: string;
  body: string;
}

/** A sensible time from the habit's anchor ("después de almorzar" → 13:00). */
export function defaultReminderTime(anchor: string | null): string {
  const a = (anchor ?? "").toLowerCase();
  if (/almuerz|almorz/.test(a)) return "13:00";
  if (/desayun|café|cafe|despert|levant|mañana/.test(a)) return "07:30";
  if (/noche|dormir|acost|cepill|cena/.test(a)) return "21:00";
  return "18:00";
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function dueReminders(input: {
  habits: ReminderHabit[];
  today: string;
  /** Minutes since midnight in Colombia. */
  nowMinutes: number;
  /** habit ids logged today / yesterday */
  doneToday: Set<string>;
  doneYesterday: Set<string>;
  /** habit ids already reminded today (any kind) */
  sentToday: Set<string>;
}): DueReminder[] {
  const { today, nowMinutes } = input;
  if (nowMinutes < 6 * 60 || nowMinutes >= 22 * 60) return [];
  const yesterday = addDays(today, -1);
  const out: DueReminder[] = [];
  for (const h of input.habits) {
    if (input.doneToday.has(h.id) || input.sentToday.has(h.id)) continue;
    if (h.started_on && h.started_on > today) continue;
    const at = toMinutes(h.reminder_time ?? defaultReminderTime(h.anchor));
    if (nowMinutes < at || nowMinutes > at + 180) continue;
    const missedYesterday = h.target_per_week >= 5 && !!h.started_on && h.started_on <= yesterday && !input.doneYesterday.has(h.id);
    const easy = h.tiny ? ` Basta con: ${h.tiny}.` : "";
    out.push(
      missedYesterday
        ? { habit_id: h.id, participant_id: h.participant_id, kind: "never_twice", title: "Nunca falles dos veces", body: `Ayer no se dio «${h.title}». Hoy cuenta doble para tu racha.${easy}` }
        : { habit_id: h.id, participant_id: h.participant_id, kind: "daily", title: h.anchor ? `${capitalize(h.anchor)}: ${h.title}` : h.title, body: `Un toque para marcarlo en Bombadil.${easy}` },
    );
  }
  return out;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
