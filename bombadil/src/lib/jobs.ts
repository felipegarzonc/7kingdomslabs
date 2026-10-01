import "server-only";
import { autoAcceptRows } from "@/domain/auto-review";
import { imagingAlarm } from "@/domain/imaging";
import { buildSnapshot, metricLabel, MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/domain/snapshot";
import { GOAL_STATUS_LABEL } from "@/domain/goals";
import type { ParticipantRow } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { raiseAlerts } from "@/lib/alerts";
import { env } from "@/lib/env";
import { commitLabResults } from "@/lib/lab-results";
import { generateCheckinReply } from "@/lib/llm/checkin";
import { extractLabResults, type Extraction } from "@/lib/llm/extract";
import { interpretImaging, type StoredImaging } from "@/lib/llm/imaging";
import { looksScanned, pdfToText } from "@/lib/pdf";
import { redactPii } from "@/lib/redact";
import { publishAutomaticReport } from "@/lib/reports";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Background jobs that write LLM output. They run with the service role
 * (participants cannot write extractions or replies under RLS), so every
 * caller must have authorised the actor for this participant first.
 */

/**
 * PDF → redacted text → LLM extraction → automatic acceptance of the rows the
 * catalog can interpret → alerts → a new published report. The operator can
 * still open the document and correct it afterwards.
 */
export async function runExtraction(documentId: string): Promise<void> {
  const db = createServiceClient();
  const { data: doc, error } = await db.from("lab_documents").select("*, participants(*)").eq("id", documentId).single();
  if (error || !doc) throw new Error(`document ${documentId} not found`);
  await db.from("lab_documents").update({ status: "extracting", extraction_error: null }).eq("id", documentId);
  const participant = doc.participants as ParticipantRow;
  let extraction: Extraction;
  let reportText: string;
  try {
    const file = await db.storage.from("lab-pdfs").download(doc.storage_path);
    if (file.error) throw new Error(`No se pudo leer el PDF: ${file.error.message}`);
    const { text, pages } = await pdfToText(new Uint8Array(await file.data.arrayBuffer()));
    if (looksScanned(text, pages)) {
      throw new Error("El PDF no tiene texto seleccionable (parece escaneado). Transcribe los valores manualmente en la revisión.");
    }
    const names = [participant.display_name ?? "", participant.email.split("@")[0] ?? ""];
    const redacted = redactPii(text, names);
    reportText = redacted.text;
    const out = await extractLabResults(redacted.text);
    extraction = out.extraction;
    await db
      .from("lab_documents")
      .update({
        status: "extracted",
        kind: "lab",
        imaging: null,
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
    return;
  }

  // No lab values: it may be an imaging report (MRI, ultrasound, X-ray…).
  if (!extraction.results.length) {
    await runImagingInterpretation(db, documentId, doc, participant.id, reportText);
    return;
  }

  // ── Automatic acceptance (no human review) ──
  const { accepted, skipped } = autoAcceptRows(extraction.results);
  if (!accepted.length) {
    await db.from("lab_documents").update({ extraction_error: "Ningún valor del informe coincidió con el catálogo; revísalo a mano." }).eq("id", documentId);
    return;
  }
  // Without a printed sample date, the upload date is the best available stand-in.
  const sampledOn = doc.sampled_on ?? (isIsoDate(extraction.sampled_on) ? extraction.sampled_on : String(doc.created_at).slice(0, 10));
  const committed = await commitLabResults(db, {
    documentId,
    participant,
    sampledOn,
    labName: doc.lab_name ?? extraction.lab_name,
    rows: accepted.map((r) => ({ ...r, corrected: false })),
    reviewedBy: null,
  });
  if (committed.error) {
    await db.from("lab_documents").update({ status: "extracted", extraction_error: `No se pudieron guardar los resultados: ${committed.error}`.slice(0, 500) }).eq("id", documentId);
    return;
  }
  if (skipped.length) {
    const names = skipped.map((x) => x.name).join(", ");
    await db.from("lab_documents").update({ extraction_error: `Guardado automáticamente. Sin guardar (fuera del catálogo o unidad no reconocida): ${names}`.slice(0, 500) }).eq("id", documentId);
  }

  const report = await publishAutomaticReport(db, participant.id);
  if ("error" in report) console.error(`automatic report for ${participant.id} failed:`, report.error);
}

export const NO_LAB_RESULTS =
  "No encontramos resultados de laboratorio ni un informe de imágenes en este PDF. Bombadil interpreta exámenes de sangre u orina e informes de resonancias, ecografías, radiografías y tomografías.";

/**
 * Plain-language interpretation of a radiology report. Alerts come from the
 * report's own words (deterministic), never from the LLM's reading.
 */
async function runImagingInterpretation(
  db: ReturnType<typeof createServiceClient>,
  documentId: string,
  doc: { sampled_on: string | null; created_at: string },
  participantId: string,
  reportText: string,
): Promise<void> {
  let imaging: StoredImaging;
  try {
    imaging = await interpretImaging(reportText);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("lab_documents").update({ status: "failed", extraction_error: `No se pudo interpretar el informe: ${message}`.slice(0, 500) }).eq("id", documentId);
    return;
  }
  if (!imaging.is_imaging_report) {
    await db.from("lab_documents").update({ status: "failed", extraction_error: NO_LAB_RESULTS }).eq("id", documentId);
    return;
  }
  await db.from("lab_results").delete().eq("document_id", documentId);
  await db
    .from("lab_documents")
    .update({
      kind: "imaging",
      imaging,
      status: "reviewed",
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
      extraction_error: null,
      sampled_on: doc.sampled_on ?? (isIsoDate(imaging.study_date) ? imaging.study_date : String(doc.created_at).slice(0, 10)),
    })
    .eq("id", documentId);
  await db.from("alerts").delete().eq("origin", "lab").eq("origin_id", documentId).eq("status", "open");
  await raiseAlerts(db, participantId, imagingAlarm(reportText), "lab", documentId);
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
