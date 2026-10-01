import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateEscalation } from "@/domain/escalation";
import { todayInColombia } from "@/domain/habits";
import { MEASUREMENT_BOUNDS, MEASUREMENT_UNIT } from "@/domain/snapshot";
import { autoHabitLogs, type DayActivity, type DeviceSource, type HabitForAutoLog, type ImportedRow } from "@/domain/wearables";
import { raiseAlerts } from "@/lib/alerts";

export interface DeviceConnection {
  id: string;
  participant_id: string;
  provider: DeviceSource;
  status: "active" | "revoked" | "error";
  external_user_id: string | null;
  display_name: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}

/**
 * Stores imported rows (idempotent), raises deterministic alerts for new readings
 * and logs movement/strength habits the data proves done. `db` is the service role.
 */
export async function storeImport(
  db: SupabaseClient,
  participant: { id: string; sex: "male" | "female" | null },
  source: DeviceSource,
  data: { rows: ImportedRow[]; days: DayActivity[] },
): Promise<{ stored: number; habitsLogged: number }> {
  const groups = new Map<string, string>();
  const rows = data.rows
    .filter((r) => {
      const [lo, hi] = MEASUREMENT_BOUNDS[r.type];
      return r.value >= lo && r.value <= hi;
    })
    .map((r) => {
      let group_id: string | null = null;
      if (r.group_id_key) {
        group_id = groups.get(r.group_id_key) ?? randomUUID();
        groups.set(r.group_id_key, group_id);
      }
      return { participant_id: participant.id, type: r.type, value: r.value, unit: MEASUREMENT_UNIT[r.type], measured_at: r.measured_at, external_id: r.external_id, group_id, source, context: {} };
    });

  let stored = 0;
  if (rows.length) {
    const startedAt = Date.now() - 5_000;
    const { data: saved, error } = await db
      .from("measurements")
      .upsert(rows, { onConflict: "participant_id,source,type,external_id" })
      .select("id, type, value, created_at");
    if (error) throw new Error(error.message);
    stored = saved?.length ?? 0;
    // Alerts only for readings we had not seen before (re-syncs update in place).
    const fresh = (saved ?? []).filter((m) => Date.parse(m.created_at) >= startedAt);
    if (fresh.length) {
      const triggered = evaluateEscalation({ sex: participant.sex ?? "male", measurements: fresh.map((m) => ({ type: m.type, value: Number(m.value) })) });
      await raiseAlerts(db, participant.id, triggered, "measurement", fresh[0].id);
    }
  }

  let habitsLogged = 0;
  if (data.days.length) {
    const { data: habits } = await db.from("habits").select("id, pillar, status, started_on").eq("participant_id", participant.id).eq("status", "active");
    const logs = autoHabitLogs((habits ?? []) as HabitForAutoLog[], data.days, todayInColombia());
    if (logs.length) {
      const { data: inserted, error } = await db
        .from("habit_logs")
        .upsert(
          logs.map((l) => ({ ...l, participant_id: participant.id, full_version: true, source })),
          { onConflict: "habit_id,day", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw new Error(error.message);
      habitsLogged = inserted?.length ?? 0;
    }
  }
  return { stored, habitsLogged };
}

export async function markSynced(db: SupabaseClient, connectionId: string, error: string | null = null) {
  await db
    .from("device_connections")
    .update(error ? { last_error: error.slice(0, 300), status: "error" } : { last_sync_at: new Date().toISOString(), last_error: null, status: "active" })
    .eq("id", connectionId);
}

export function newIngestToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Creates (or rotates) the participant's personal Apple Health upload link token. */
export async function rotateAppleHealthToken(db: SupabaseClient, participantId: string): Promise<string> {
  const { data: conn, error } = await db
    .from("device_connections")
    .upsert({ participant_id: participantId, provider: "apple_health", status: "active", display_name: "Apple Salud" }, { onConflict: "participant_id,provider" })
    .select("id")
    .single();
  if (error || !conn) throw new Error(error?.message ?? "no connection");
  const token = newIngestToken();
  const { error: e2 } = await db.from("device_secrets").upsert({ connection_id: conn.id, ingest_token: token });
  if (e2) throw new Error(e2.message);
  return token;
}
