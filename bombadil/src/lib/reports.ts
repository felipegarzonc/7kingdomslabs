import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSnapshot } from "@/domain/snapshot";
import type { ParticipantRow } from "@/lib/auth";
import { loadImagingForReport, loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { generateReport } from "@/lib/llm/report";

/**
 * Generates a report from the participant's current data and publishes it
 * straight away (no operator approval): archives the previous one and makes
 * its priorities the participant's. Alerts are raised separately and never
 * depend on this LLM call.
 */
export async function publishAutomaticReport(db: SupabaseClient, participantId: string): Promise<{ reportId: string } | { error: string }> {
  const { data: participant } = await db.from("participants").select("*").eq("id", participantId).single();
  if (!participant) return { error: "participant not found" };
  const snapshot = buildSnapshot(toSnapshotInput(participant as ParticipantRow, await loadParticipantData(db, participantId)));
  const imaging = await loadImagingForReport(db, participantId);
  if (!snapshot.markers.length && !imaging.length) return { error: "no lab or imaging results to interpret" };

  let draft;
  try {
    draft = await generateReport(snapshot, imaging);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  await db.from("reports").update({ status: "archived" }).eq("participant_id", participantId).eq("status", "approved");
  const { data, error } = await db
    .from("reports")
    .insert({
      participant_id: participantId,
      content: draft.content,
      input_snapshot: snapshot,
      prompt_version: draft.promptVersion,
      model: draft.model,
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await db.from("participants").update({ priorities: draft.content.priorities.map((p) => p.title) }).eq("id", participantId);
  return { reportId: data.id };
}
