import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append-only log of admin access to participant data (docs/BRIEF.md §7).
 * RLS only lets an admin insert rows as themselves.
 */
export async function logAdminAccess(
  supabase: SupabaseClient,
  actorUserId: string,
  action: string,
  participantId: string | null,
  detail: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("audit_log").insert({ actor_user_id: actorUserId, action, participant_id: participantId, detail });
  if (error) console.error("audit_log insert failed", error.message);
}
