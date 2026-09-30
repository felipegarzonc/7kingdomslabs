import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { missingCheckinThisWeek, pilotWeek, retentionByWeek } from "@/domain/pilot";
import { buildSnapshot } from "@/domain/snapshot";
import type { ParticipantRow } from "@/lib/auth";
import { toSnapshotInput, type GoalDbRow, type LabResultRow, type MeasurementRow } from "./snapshot-input";

/** Everything the pilot dashboard needs, computed with the pure domain module. */
export async function loadPilotOverview(supabase: SupabaseClient) {
  const [participants, checkins, alerts, feedback, docs, replies, labs, measurements, goals] = await Promise.all([
    supabase.from("participants").select("*").order("created_at"),
    supabase.from("checkins").select("participant_id, week, submitted_at, duration_seconds"),
    supabase.from("alerts").select("id, participant_id, level, status").eq("status", "open"),
    supabase.from("pilot_feedback").select("*").order("recorded_at", { ascending: false }),
    supabase.from("lab_documents").select("id, status").in("status", ["uploaded", "extracting", "extracted", "failed"]),
    supabase.from("checkin_replies").select("id, status").in("status", ["pending", "draft", "failed"]),
    supabase.from("lab_results").select("*"),
    supabase.from("measurements").select("*"),
    supabase.from("goals").select("*").eq("active", true),
  ]);
  const ps = (participants.data ?? []) as ParticipantRow[];
  const cs = checkins.data ?? [];
  const now = new Date();

  const retentionParticipants = ps.map((p) => ({ id: p.id, pilotStart: p.status === "invited" ? null : p.pilot_start, withdrawnAt: p.withdrawn_at }));
  const retentionCheckins = cs.map((c) => ({ participantId: c.participant_id, week: c.week }));
  const retention = retentionByWeek(retentionParticipants, retentionCheckins, 12, now);
  const missing = new Set(missingCheckinThisWeek(retentionParticipants, retentionCheckins, now));

  const rows = ps.map((p) => {
    const snapshot =
      p.status === "invited"
        ? null
        : buildSnapshot(
            toSnapshotInput(p, {
              labs: ((labs.data ?? []) as LabResultRow[]).filter((l) => (l as unknown as { participant_id: string }).participant_id === p.id).map((l) => ({ ...l, value_canonical: Number(l.value_canonical) })),
              measurements: ((measurements.data ?? []) as Array<MeasurementRow & { participant_id: string }>).filter((m) => m.participant_id === p.id).map((m) => ({ ...m, value: Number(m.value) })),
              goals: ((goals.data ?? []) as Array<GoalDbRow & { participant_id: string }>).filter((g) => g.participant_id === p.id).map((g) => ({ ...g, baseline: Number(g.baseline), target: Number(g.target) })),
            }),
          );
    const mine = cs.filter((c) => c.participant_id === p.id);
    const lastFeedback = (feedback.data ?? []).find((f) => f.participant_id === p.id) ?? null;
    return {
      participant: p,
      week: p.pilot_start ? pilotWeek(p.pilot_start, now) : null,
      checkins: mine.length,
      lastCheckin: mine.map((c) => c.submitted_at).sort().at(-1) ?? null,
      missingThisWeek: missing.has(p.id),
      openAlerts: (alerts.data ?? []).filter((a) => a.participant_id === p.id),
      goals: snapshot?.goals ?? [],
      /** Pilot "effect" question: at least one goal achieved or on track, or one marker improving. */
      effect: snapshot ? snapshot.goals.some((g) => g.status === "achieved" || g.status === "on_track") || snapshot.groups.improved.length > 0 : false,
      feedback: lastFeedback,
    };
  });

  const wtp = (feedback.data ?? []).map((f) => f.willingness_to_pay_cop).filter((x): x is number => typeof x === "number" && x > 0).sort((a, b) => a - b);
  const median = wtp.length ? (wtp.length % 2 ? wtp[(wtp.length - 1) / 2] : (wtp[wtp.length / 2 - 1] + wtp[wtp.length / 2]) / 2) : null;
  const durations = cs.map((c) => c.duration_seconds).filter((x): x is number => typeof x === "number" && x > 0).sort((a, b) => a - b);

  return {
    rows,
    retention,
    counts: {
      active: ps.filter((p) => p.status === "active").length,
      invited: ps.filter((p) => p.status === "invited").length,
      urgentAlerts: (alerts.data ?? []).filter((a) => a.level === "urgency").length,
      openAlerts: (alerts.data ?? []).length,
      pendingDocs: (docs.data ?? []).filter((d) => d.status !== "extracting" && d.status !== "uploaded").length,
      processingDocs: (docs.data ?? []).filter((d) => d.status === "extracting" || d.status === "uploaded").length,
      pendingReplies: (replies.data ?? []).length,
    },
    wtp: {
      responses: (feedback.data ?? []).length,
      median,
      values: wtp,
      wouldContinue: {
        yes: (feedback.data ?? []).filter((f) => f.would_continue === "yes").length,
        maybe: (feedback.data ?? []).filter((f) => f.would_continue === "maybe").length,
        no: (feedback.data ?? []).filter((f) => f.would_continue === "no").length,
      },
      recent: (feedback.data ?? []).slice(0, 10),
    },
    medianCheckinSeconds: durations.length ? durations[Math.floor(durations.length / 2)] : null,
  };
}
