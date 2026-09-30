import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Full deletion (Ley 1581 — supresión): storage files, every row (FK cascade)
 * and the auth user. Callers must authorise: the participant themself or an admin.
 */
export async function deleteParticipantCompletely(participantId: string, authUserId: string | null): Promise<void> {
  const db = createServiceClient();
  const { data: files } = await db.storage.from("lab-pdfs").list(participantId, { limit: 1000 });
  if (files?.length) await db.storage.from("lab-pdfs").remove(files.map((f) => `${participantId}/${f.name}`));
  const { error } = await db.from("participants").delete().eq("id", participantId);
  if (error) throw new Error(`delete participant failed: ${error.message}`);
  if (authUserId) await db.auth.admin.deleteUser(authUserId);
}

/** Everything we hold about a participant, for the right of access / portability. */
export async function exportParticipantData(supabase: import("@supabase/supabase-js").SupabaseClient, participantId: string) {
  const tables = ["consents", "lab_documents", "lab_results", "measurements", "goals", "checkins", "checkin_replies", "reports", "alerts", "pilot_feedback"] as const;
  const { data: participant } = await supabase.from("participants").select("*").eq("id", participantId).single();
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), participant };
  for (const t of tables) {
    const { data } = await supabase.from(t).select("*").eq("participant_id", participantId);
    out[t] = data ?? [];
  }
  return out;
}
