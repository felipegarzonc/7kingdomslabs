import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TriggeredRule } from "@/domain/escalation";
import { env } from "@/lib/env";

/**
 * Persists deterministic escalations and notifies the operator of urgencies.
 * Runs before (and independently of) any LLM call.
 */
export async function raiseAlerts(
  supabase: SupabaseClient,
  participantId: string,
  triggered: TriggeredRule[],
  origin: "measurement" | "checkin" | "lab",
  originId: string | null,
): Promise<void> {
  if (!triggered.length) return;
  const rows = triggered.map((t) => ({
    participant_id: participantId,
    rule_id: t.ruleId,
    level: t.level,
    origin,
    origin_id: originId,
    message: t.message,
    evidence: t.evidence,
  }));
  const { error } = await supabase.from("alerts").insert(rows);
  if (error) console.error("alerts insert failed", error.message);
  const urgent = triggered.filter((t) => t.level === "urgency");
  if (urgent.length) await notifyOperator(`⚠️ Bombadil — urgencia (${origin}) participante ${participantId.slice(0, 8)}: ${urgent.map((u) => u.ruleId).join(", ")}`);
}

/**
 * Optional webhook (Slack/Discord-compatible `{text}` payload). No participant
 * health values or identity beyond a short id are sent.
 */
export async function notifyOperator(text: string): Promise<void> {
  const url = env.alertWebhookUrl();
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text }) });
  } catch (e) {
    console.error("alert webhook failed", e);
  }
}
