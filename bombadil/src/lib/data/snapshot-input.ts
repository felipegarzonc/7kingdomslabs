import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoalRow, LabPoint, MeasurementPoint, SnapshotInput } from "@/domain/snapshot";
import type { MeasurementType } from "@/domain/types";
import type { ParticipantRow } from "@/lib/auth";

export interface LabResultRow {
  id: string;
  document_id: string;
  biomarker_code: string;
  sampled_on: string;
  value_original: number;
  unit_original: string;
  value_canonical: number;
  lab_ref_low: number | null;
  lab_ref_high: number | null;
  flag: string | null;
}

export interface MeasurementRow {
  id: string;
  type: MeasurementType;
  value: number;
  unit: string;
  measured_at: string;
  context: MeasurementPoint["context"];
  group_id: string | null;
  source: string;
}

export interface GoalDbRow {
  id: string;
  metric: string;
  baseline: number;
  target: number;
  horizon_months: number;
  start_date: string;
  deadline: string;
  notes: string | null;
  active: boolean;
}

export async function loadParticipantData(supabase: SupabaseClient, participantId: string) {
  const [labs, measurements, goals] = await Promise.all([
    supabase.from("lab_results").select("*").eq("participant_id", participantId).order("sampled_on"),
    supabase.from("measurements").select("*").eq("participant_id", participantId).order("measured_at"),
    supabase.from("goals").select("*").eq("participant_id", participantId).eq("active", true).order("created_at"),
  ]);
  for (const r of [labs, measurements, goals]) if (r.error) throw new Error(r.error.message);
  return {
    labs: (labs.data ?? []).map((r) => ({ ...r, value_canonical: Number(r.value_canonical), value_original: Number(r.value_original) })) as LabResultRow[],
    measurements: (measurements.data ?? []).map((m) => ({ ...m, value: Number(m.value) })) as MeasurementRow[],
    goals: (goals.data ?? []).map((g) => ({ ...g, baseline: Number(g.baseline), target: Number(g.target) })) as GoalDbRow[],
  };
}

export function toSnapshotInput(participant: ParticipantRow, data: Awaited<ReturnType<typeof loadParticipantData>>): SnapshotInput {
  const labs: LabPoint[] = data.labs.map((l) => ({
    code: l.biomarker_code,
    value: l.value_canonical,
    at: l.sampled_on,
    labReference: l.lab_ref_low !== null || l.lab_ref_high !== null ? { low: l.lab_ref_low ?? undefined, high: l.lab_ref_high ?? undefined } : null,
  }));
  const measurements: MeasurementPoint[] = data.measurements.map((m) => ({
    type: m.type,
    value: m.value,
    at: m.measured_at,
    groupId: m.group_id,
    context: m.context,
  }));
  const goals: GoalRow[] = data.goals.map((g) => ({
    id: g.id,
    metric: g.metric,
    baseline: g.baseline,
    target: g.target,
    startDate: g.start_date,
    deadline: g.deadline,
    horizonMonths: g.horizon_months,
  }));
  return {
    sex: participant.sex ?? "male",
    birthDate: participant.birth_date,
    heightCm: participant.height_cm ? Number(participant.height_cm) : null,
    personalGoal: participant.personal_goal,
    labs,
    measurements,
    goals,
  };
}
