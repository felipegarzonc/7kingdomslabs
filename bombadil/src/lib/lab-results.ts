import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcceptedRow } from "@/domain/auto-review";
import { classify, toCanonical } from "@/domain/classify";
import { fib4 } from "@/domain/derived";
import { evaluateEscalation } from "@/domain/escalation";
import { ageFrom } from "@/domain/snapshot";
import { raiseAlerts } from "@/lib/alerts";
import type { ParticipantRow } from "@/lib/auth";

export interface CommitInput {
  documentId: string;
  participant: ParticipantRow;
  sampledOn: string;
  labName: string | null;
  rows: Array<AcceptedRow & { corrected: boolean }>;
  /** Operator who reviewed it, or null when accepted automatically. */
  reviewedBy: string | null;
}

/**
 * Stores a document's results (replacing earlier ones), marks it reviewed and
 * raises its deterministic alerts. Shared by the operator's review and the
 * automatic pipeline.
 */
export async function commitLabResults(db: SupabaseClient, input: CommitInput): Promise<{ error?: string; count: number }> {
  const { documentId, participant, sampledOn } = input;
  const results = input.rows.map((r) => {
    const canonical = toCanonical(r.code, r.value, r.unit);
    const refLow = r.low !== null ? toCanonical(r.code, r.low, r.unit) : null;
    const refHigh = r.high !== null ? toCanonical(r.code, r.high, r.unit) : null;
    const cls = classify(r.code, canonical, participant.sex ?? "male", refLow !== null || refHigh !== null ? { low: refLow ?? undefined, high: refHigh ?? undefined } : null);
    return {
      document_id: documentId,
      participant_id: participant.id,
      biomarker_code: r.code,
      sampled_on: sampledOn,
      value_original: r.value,
      unit_original: r.unit,
      value_canonical: canonical,
      lab_ref_low: refLow,
      lab_ref_high: refHigh,
      flag: cls.flag,
      corrected_by_admin: r.corrected,
    };
  });

  const del = await db.from("lab_results").delete().eq("document_id", documentId);
  if (del.error) return { error: del.error.message, count: 0 };
  if (results.length) {
    const ins = await db.from("lab_results").insert(results);
    if (ins.error) return { error: ins.error.message, count: 0 };
  }
  await db
    .from("lab_documents")
    .update({ status: "reviewed", reviewed_by: input.reviewedBy, reviewed_at: new Date().toISOString(), sampled_on: sampledOn, lab_name: input.labName })
    .eq("id", documentId);

  // Deterministic escalation on the stored values (replaces earlier alerts from this document).
  await db.from("alerts").delete().eq("origin", "lab").eq("origin_id", documentId).eq("status", "open");
  const value = (code: string) => results.find((r) => r.biomarker_code === code)?.value_canonical;
  const ageAtSample = ageFrom(participant.birth_date, new Date(sampledOn));
  const ast = value("ast");
  const alt = value("alt");
  const plt = value("platelets");
  const fib4Value = ageAtSample !== null && ast !== undefined && alt !== undefined && plt !== undefined ? fib4(ageAtSample, ast, alt, plt) : null;
  const triggered = evaluateEscalation({
    sex: participant.sex ?? "male",
    age: ageAtSample,
    biomarkers: results.map((r) => ({ code: r.biomarker_code, value: r.value_canonical })),
    derived: fib4Value !== null ? [{ metric: "fib4", value: fib4Value }] : [],
  });
  await raiseAlerts(db, participant.id, triggered, "lab", documentId);
  return { count: results.length };
}
