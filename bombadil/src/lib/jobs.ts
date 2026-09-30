import "server-only";
import { buildSnapshot, metricLabel, MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/domain/snapshot";
import { GOAL_STATUS_LABEL } from "@/domain/goals";
import type { ParticipantRow } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { env } from "@/lib/env";
import { generateCheckinReply } from "@/lib/llm/checkin";
import { extractLabResults } from "@/lib/llm/extract";
import { looksScanned, pdfToText } from "@/lib/pdf";
import { redactPii } from "@/lib/redact";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Background jobs that write LLM output. They run with the service role
 * (participants cannot write extractions or replies under RLS), so every
 * caller must have authorised the actor for this participant first.
 */

export async function runExtraction(documentId: string): Promise<void> {
  const db = createServiceClient();
  const { data: doc, error } = await db.from("lab_documents").select("*, participants(email, display_name)").eq("id", documentId).single();
  if (error || !doc) throw new Error(`document ${documentId} not found`);
  await db.from("lab_documents").update({ status: "extracting", extraction_error: null }).eq("id", documentId);
  try {
    const file = await db.storage.from("lab-pdfs").download(doc.storage_path);
    if (file.error) throw new Error(`No se pudo leer el PDF: ${file.error.message}`);
    const { text, pages } = await pdfToText(new Uint8Array(await file.data.arrayBuffer()));
    if (looksScanned(text, pages)) {
      throw new Error("El PDF no tiene texto seleccionable (parece escaneado). Transcribe los valores manualmente en la revisión.");
    }
    const p = doc.participants as { email: string; display_name: string | null } | null;
    const names = [p?.display_name ?? "", p?.email.split("@")[0] ?? ""];
    const redacted = redactPii(text, names);
    const out = await extractLabResults(redacted.text);
    await db
      .from("lab_documents")
      .update({
        status: "extracted",
        extraction: out.extraction,
        prompt_version: out.promptVersion,
        model: out.model,
        redactions: redacted.redactions,
        lab_name: doc.lab_name ?? out.extraction.lab_name,
        sampled_on: doc.sampled_on ?? (isIsoDate(out.extraction.sampled_on) ? out.extraction.sampled_on : null),
      })
      .eq("id", documentId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("lab_documents").update({ status: "failed", extraction_error: message.slice(0, 500) }).eq("id", documentId);
  }
}

function isIsoDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

const ADHERENCE_LABEL: Record<string, string> = { done: "sí", partial: "a medias", no: "no" };

export async function runCheckinReply(checkinId: string): Promise<void> {
  const db = createServiceClient();
  const { data: checkin } = await db.from("checkins").select("*").eq("id", checkinId).single();
  if (!checkin) throw new Error(`checkin ${checkinId} not found`);
  const { data: participant } = await db.from("participants").select("*").eq("id", checkin.participant_id).single();
  if (!participant) throw new Error("participant not found");

  await db.from("checkin_replies").upsert({ checkin_id: checkinId, participant_id: checkin.participant_id, status: "pending", error: null }, { onConflict: "checkin_id" });

  try {
    const data = await loadParticipantData(db, checkin.participant_id);
    const snapshot = buildSnapshot(toSnapshotInput(participant as ParticipantRow, data));
    const { data: alerts } = await db.from("alerts").select("level, message").eq("origin", "checkin").eq("origin_id", checkinId);
    const weekMeasurements = data.measurements.filter((m) => m.source === "checkin" && Date.parse(m.measured_at) >= Date.parse(checkin.submitted_at) - 36e5);

    const reply = await generateCheckinReply({
      week: checkin.week,
      priorities: participant.priorities ?? [],
      adherence: (checkin.adherence as Array<{ priority: string; status: string }>).map((a) => ({ priority: a.priority, status: ADHERENCE_LABEL[a.status] ?? a.status })),
      measurements: weekMeasurements.map((m) => ({ label: MEASUREMENT_LABEL[m.type], value: m.value, unit: MEASUREMENT_UNIT[m.type] })),
      goals: snapshot.goals.map((g) => ({ label: metricLabel(g.metric), status: GOAL_STATUS_LABEL[g.status], current: g.current, target: g.target })),
      alerts: alerts ?? [],
      freeText: checkin.free_text,
    });
    const autoSend = env.checkinAutoSend();
    await db
      .from("checkin_replies")
      .update({
        draft: reply.text,
        final_text: autoSend ? reply.text : null,
        status: autoSend ? "sent" : "draft",
        sent_at: autoSend ? new Date().toISOString() : null,
        prompt_version: reply.promptVersion,
        model: reply.model,
      })
      .eq("checkin_id", checkinId);
  } catch (e) {
    await db
      .from("checkin_replies")
      .update({ status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 500) })
      .eq("checkin_id", checkinId);
  }
}
