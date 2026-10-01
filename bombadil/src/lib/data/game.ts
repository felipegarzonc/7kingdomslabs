import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeGame, dayInColombia, type GameHabit, type GameLog, type GameState } from "@/domain/game";
import { todayInColombia } from "@/domain/habits";

/** Everything the game engine needs, read with the participant's own (RLS) client. */
export async function loadGame(supabase: SupabaseClient, participantId: string, opts: { goalsAchieved?: number } = {}): Promise<GameState> {
  const [habits, logs, docs, checkins, measurements, devices] = await Promise.all([
    supabase.from("habits").select("id, pillar, target_per_week, status, started_on").eq("participant_id", participantId),
    supabase.from("habit_logs").select("habit_id, day, full_version, source").eq("participant_id", participantId),
    supabase.from("lab_documents").select("created_at").eq("participant_id", participantId),
    supabase.from("checkins").select("submitted_at").eq("participant_id", participantId),
    supabase.from("measurements").select("measured_at").eq("participant_id", participantId),
    supabase.from("device_connections").select("id", { count: "exact", head: true }).eq("participant_id", participantId),
  ]);
  for (const r of [habits, logs, docs, checkins, measurements]) if (r.error) throw new Error(r.error.message);
  return computeGame({
    today: todayInColombia(),
    habits: (habits.data ?? []) as GameHabit[],
    logs: (logs.data ?? []) as GameLog[],
    examDays: (docs.data ?? []).map((d) => dayInColombia(d.created_at)),
    checkinDays: (checkins.data ?? []).map((c) => dayInColombia(c.submitted_at)),
    measurementDays: (measurements.data ?? []).map((m) => dayInColombia(m.measured_at)),
    deviceConnected: (devices.count ?? 0) > 0,
    goalsAchieved: opts.goalsAchieved ?? 0,
  });
}
