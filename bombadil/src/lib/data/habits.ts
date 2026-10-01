import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, type Pillar, todayInColombia } from "@/domain/habits";

export interface HabitRow {
  id: string;
  pillar: Pillar;
  title: string;
  tiny: string | null;
  anchor: string | null;
  why: string | null;
  next_step: string | null;
  target_per_week: number;
  level: number;
  status: "suggested" | "active" | "paused" | "archived";
  source: "plan" | "user";
  started_on: string | null;
  /** "HH:MM:SS" Colombia time; null = default from the anchor. */
  reminder_time: string | null;
  created_at: string;
}

export interface HabitWithLogs extends HabitRow {
  /** Days logged (full or tiny) in the last ~10 weeks. */
  logDays: string[];
  tinyDays: string[];
  /** Day → device that logged it (Strava, Apple Health); manual logs are absent. */
  autoDays: Record<string, string>;
}

export async function loadHabits(supabase: SupabaseClient, participantId: string): Promise<HabitWithLogs[]> {
  const since = addDays(todayInColombia(), -70);
  const [habits, logs] = await Promise.all([
    supabase.from("habits").select("*").eq("participant_id", participantId).neq("status", "archived").order("created_at"),
    supabase.from("habit_logs").select("habit_id, day, full_version, source").eq("participant_id", participantId).gte("day", since),
  ]);
  if (habits.error) throw new Error(habits.error.message);
  if (logs.error) throw new Error(logs.error.message);
  return (habits.data as HabitRow[]).map((h) => {
    const mine = (logs.data ?? []).filter((l) => l.habit_id === h.id);
    return {
      ...h,
      logDays: mine.map((l) => l.day),
      tinyDays: mine.filter((l) => !l.full_version).map((l) => l.day),
      autoDays: Object.fromEntries(mine.filter((l) => l.source && l.source !== "manual").map((l) => [l.day, l.source as string])),
    };
  });
}
