"use server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { BIOMARKER_BY_CODE } from "@/domain/biomarkers";
import { canConvert } from "@/domain/classify";
import { deadlineFor } from "@/domain/goals";
import { buildSnapshot } from "@/domain/snapshot";
import { deleteParticipantCompletely } from "@/lib/account";
import { logAdminAccess } from "@/lib/audit";
import { requireAdmin, type ParticipantRow } from "@/lib/auth";
import { commitLabResults } from "@/lib/lab-results";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { env } from "@/lib/env";
import { runCheckinReply, runExtraction } from "@/lib/jobs";
import { generateReport, ReportContentSchema, type ReportContent } from "@/lib/llm/report";
import type { Extraction } from "@/lib/llm/extract";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminState = { ok?: boolean; error?: string; message?: string } | null;

// ─── Participants ───────────────────────────────────────────────────────────

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  display_name: z.string().trim().max(120).optional(),
  send_email: z.string().optional(),
});

export async function inviteParticipant(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = InviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Correo inválido." };
  const { email, display_name, send_email } = parsed.data;

  const svc = createServiceClient();
  const created = await svc.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && !/already/i.test(created.error.message)) return { error: `No se pudo crear el usuario: ${created.error.message}` };

  const supabase = await createClient();
  const { data, error } = await supabase.from("participants").insert({ email, display_name: display_name || null }).select("id").single();
  if (error) return { error: error.code === "23505" ? "Ese correo ya está en el piloto." : "No se pudo crear el participante." };
  await logAdminAccess(supabase, admin.userId, "invite_participant", data.id);

  if (send_email === "yes") {
    const anon = createAnonClient(env.supabaseUrl(), env.supabaseAnonKey(), { auth: { persistSession: false } });
    const r = await anon.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl()}/auth/confirm` } });
    if (r.error) return { ok: true, message: `Participante creado, pero el correo falló (${r.error.message}). Comparte el enlace ${env.siteUrl()}/login.` };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/participantes/${data.id}`);
}

export async function updatePriorities(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(form.get("participant_id"));
  const priorities = [0, 1, 2].map((i) => String(form.get(`priority_${i}`) ?? "").trim()).filter(Boolean);
  const supabase = await createClient();
  const { error } = await supabase.from("participants").update({ priorities }).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  await logAdminAccess(supabase, admin.userId, "update_priorities", id, { priorities });
  revalidatePath(`/admin/participantes/${id}`);
  return { ok: true, message: "Prioridades actualizadas." };
}

export async function setParticipantStatus(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(form.get("participant_id"));
  const status = z.enum(["active", "withdrawn", "completed"]).parse(form.get("status"));
  const supabase = await createClient();
  await supabase
    .from("participants")
    .update({ status, withdrawn_at: status === "withdrawn" ? new Date().toISOString() : null })
    .eq("id", id);
  await logAdminAccess(supabase, admin.userId, "set_status", id, { status });
  revalidatePath("/admin", "layout");
}

export async function deleteParticipant(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(form.get("participant_id"));
  if (String(form.get("confirm")).trim().toUpperCase() !== "ELIMINAR") return { error: "Escribe ELIMINAR para confirmar." };
  const supabase = await createClient();
  const { data: p } = await supabase.from("participants").select("auth_user_id").eq("id", id).single();
  await logAdminAccess(supabase, admin.userId, "delete_participant", null, { participant_id: id });
  await deleteParticipantCompletely(id, p?.auth_user_id ?? null);
  revalidatePath("/admin", "layout");
  redirect("/admin/participantes");
}

export async function recordFeedback(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(form.get("participant_id"));
  const wtp = Number(String(form.get("willingness_to_pay_cop") ?? "").replace(/\D/g, ""));
  const cont = String(form.get("would_continue") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("pilot_feedback").insert({
    participant_id: id,
    week: Number(form.get("week")) || null,
    willingness_to_pay_cop: wtp > 0 ? wtp : null,
    would_continue: ["yes", "maybe", "no"].includes(cont) ? cont : null,
    comments: String(form.get("comments") ?? "").trim() || null,
    recorded_by: admin.userId,
  });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath(`/admin/participantes/${id}`);
  revalidatePath("/admin");
  return { ok: true, message: "Registrado." };
}

const AdminGoalSchema = z.object({
  participant_id: z.string().uuid(),
  metric: z.string().min(1),
  baseline: z.coerce.number().finite(),
  target: z.coerce.number().finite(),
  horizon_months: z.coerce.number().pipe(z.union([z.literal(3), z.literal(6), z.literal(12)])),
  start_date: z.iso.date().optional(),
});

export async function createGoalForParticipant(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = AdminGoalSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success || parsed.data.baseline === parsed.data.target) return { error: "Revisa la meta." };
  const g = parsed.data;
  const start = g.start_date ?? new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    participant_id: g.participant_id,
    metric: g.metric,
    baseline: g.baseline,
    target: g.target,
    horizon_months: g.horizon_months,
    start_date: start,
    deadline: deadlineFor(start, g.horizon_months as 3 | 6 | 12),
    created_by: admin.userId,
  });
  if (error) return { error: "No se pudo crear la meta." };
  revalidatePath(`/admin/participantes/${g.participant_id}`);
  return { ok: true, message: "Meta creada." };
}

// ─── Lab documents: extraction and human review ─────────────────────────────

export async function uploadLabForParticipant(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const participantId = String(form.get("participant_id"));
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.type !== "application/pdf") return { error: "Elige un PDF." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${participantId}/${crypto.randomUUID()}.pdf`;
  const supabase = await createClient();
  const up = await supabase.storage.from("lab-pdfs").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error) return { error: `No se pudo subir: ${up.error.message}` };
  const { data: doc, error } = await supabase
    .from("lab_documents")
    .insert({ participant_id: participantId, storage_path: path, original_filename: file.name.slice(0, 200), lab_name: String(form.get("lab_name") ?? "") || null, uploaded_by: admin.userId })
    .select("id")
    .single();
  if (error) return { error: "No se pudo registrar el documento." };
  await logAdminAccess(supabase, admin.userId, "upload_lab", participantId, { document_id: doc.id });
  after(() => runExtraction(doc.id));
  revalidatePath(`/admin/participantes/${participantId}`);
  return { ok: true, message: "Subido. La extracción corre en segundo plano; recarga en un minuto." };
}

export async function rerunExtraction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(form.get("document_id"));
  const supabase = await createClient();
  const { data: doc } = await supabase.from("lab_documents").select("participant_id").eq("id", id).single();
  if (!doc) return;
  await logAdminAccess(supabase, admin.userId, "rerun_extraction", doc.participant_id, { document_id: id });
  await runExtraction(id);
  revalidatePath(`/admin/documentos/${id}`);
}

interface ReviewRow {
  include: boolean;
  code: string;
  value: number;
  unit: string;
  low: number | null;
  high: number | null;
}

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export async function saveReview(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const documentId = String(form.get("document_id"));
  const sampledOn = String(form.get("sampled_on") ?? "");
  const labName = String(form.get("lab_name") ?? "").trim() || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sampledOn)) return { error: "Falta la fecha de toma (AAAA-MM-DD)." };

  const supabase = await createClient();
  const { data: doc } = await supabase.from("lab_documents").select("id, participant_id, extraction, participants(*)").eq("id", documentId).single();
  if (!doc) return { error: "Documento no encontrado." };
  const participant = doc.participants as unknown as ParticipantRow;
  const extraction = (doc.extraction as Extraction | null)?.results ?? [];

  const count = Number(form.get("row_count"));
  const rows: Array<ReviewRow & { index: number }> = [];
  const problems: string[] = [];
  for (let i = 0; i < count; i++) {
    if (form.get(`include_${i}`) !== "on") continue;
    const code = String(form.get(`code_${i}`) ?? "");
    const value = num(form.get(`value_${i}`));
    const unit = String(form.get(`unit_${i}`) ?? "").trim();
    const low = num(form.get(`low_${i}`));
    const high = num(form.get(`high_${i}`));
    const label = `Fila ${i + 1}`;
    if (!BIOMARKER_BY_CODE.has(code)) problems.push(`${label}: elige un biomarcador o desmárcala.`);
    else if (value === null || Number.isNaN(value)) problems.push(`${label}: valor inválido.`);
    else if (!canConvert(code, unit)) problems.push(`${label}: la unidad "${unit}" no es convertible para ${BIOMARKER_BY_CODE.get(code)!.name} (usa ${BIOMARKER_BY_CODE.get(code)!.unit}).`);
    else if (Number.isNaN(low) || Number.isNaN(high)) problems.push(`${label}: rango inválido.`);
    else rows.push({ index: i, include: true, code, value, unit, low, high });
  }
  const dup = rows.map((r) => r.code).find((c, i, xs) => xs.indexOf(c) !== i);
  if (dup) problems.push(`${BIOMARKER_BY_CODE.get(dup)!.name} aparece dos veces; deja solo una fila.`);
  if (problems.length) return { error: problems.join(" ") };

  const reviewed = rows.map((r) => {
    const o = extraction[r.index];
    const corrected = !o || o.biomarker_code !== r.code || o.value !== r.value || (o.unit ?? "") !== r.unit || o.ref_low !== r.low || o.ref_high !== r.high;
    return { ...r, corrected };
  });
  const corrections = reviewed.filter((r) => r.corrected).length;
  const committed = await commitLabResults(supabase, { documentId, participant, sampledOn, labName, reviewedBy: admin.userId, rows: reviewed });
  if (committed.error) return { error: committed.error };
  await logAdminAccess(supabase, admin.userId, "review_lab", doc.participant_id, { document_id: documentId, results: committed.count, corrections });

  revalidatePath("/admin", "layout");
  return { ok: true, message: `Guardados ${committed.count} resultados (${corrections} corregidos a mano).` };
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function generateReportDraft(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const participantId = String(form.get("participant_id"));
  const supabase = await createClient();
  const { data: p } = await supabase.from("participants").select("*").eq("id", participantId).single();
  if (!p) return { error: "Participante no encontrado." };
  const snapshot = buildSnapshot(toSnapshotInput(p as ParticipantRow, await loadParticipantData(supabase, participantId)));
  if (!snapshot.markers.length && !Object.keys(snapshot.measurementsLatest).length) return { error: "No hay datos revisados para interpretar." };
  let draft;
  try {
    draft = await generateReport(snapshot);
  } catch (e) {
    return { error: `No se pudo generar el informe: ${e instanceof Error ? e.message : String(e)}` };
  }
  const { data, error } = await supabase
    .from("reports")
    .insert({ participant_id: participantId, content: draft.content, input_snapshot: snapshot, prompt_version: draft.promptVersion, model: draft.model, status: "draft" })
    .select("id")
    .single();
  if (error) return { error: "No se pudo guardar el borrador." };
  await logAdminAccess(supabase, admin.userId, "generate_report", participantId, { report_id: data.id });
  redirect(`/admin/informes/${data.id}`);
}

function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function reportFromForm(form: FormData): ReportContent {
  const priorities = [0, 1, 2]
    .map((i) => ({
      title: String(form.get(`p_title_${i}`) ?? "").trim(),
      kind: (form.get(`p_kind_${i}`) === "nice" ? "nice" : "must") as "must" | "nice",
      why: String(form.get(`p_why_${i}`) ?? "").trim(),
      how: String(form.get(`p_how_${i}`) ?? "").trim(),
    }))
    .filter((p) => p.title);
  return ReportContentSchema.parse({
    headline: String(form.get("headline") ?? "").trim(),
    worsened: lines(form.get("worsened")),
    improved: lines(form.get("improved")),
    stable: lines(form.get("stable")),
    connections: String(form.get("connections") ?? "").trim(),
    priorities,
    see_doctor: String(form.get("see_doctor") ?? "").trim(),
    closing: String(form.get("closing") ?? "").trim(),
  });
}

export async function saveReport(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(form.get("report_id"));
  const intent = String(form.get("intent"));
  let content: ReportContent;
  try {
    content = reportFromForm(form);
  } catch {
    return { error: "El informe necesita titular y entre 1 y 3 prioridades con título." };
  }
  const supabase = await createClient();
  const { data: report } = await supabase.from("reports").select("participant_id, status").eq("id", id).single();
  if (!report) return { error: "Informe no encontrado." };
  if (report.status !== "draft") return { error: "Solo se editan borradores." };

  if (intent === "approve") {
    await supabase.from("reports").update({ status: "archived" }).eq("participant_id", report.participant_id).eq("status", "approved");
    const { error } = await supabase.from("reports").update({ content, status: "approved", approved_by: admin.userId, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) return { error: "No se pudo aprobar." };
    await supabase.from("participants").update({ priorities: content.priorities.map((p) => p.title) }).eq("id", report.participant_id);
    await logAdminAccess(supabase, admin.userId, "approve_report", report.participant_id, { report_id: id });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Informe aprobado. El participante ya lo ve y sus prioridades se actualizaron." };
  }
  const { error } = await supabase.from("reports").update({ content }).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  return { ok: true, message: "Borrador guardado." };
}

export async function discardReport(form: FormData): Promise<void> {
  await requireAdmin();
  const id = String(form.get("report_id"));
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select("participant_id").eq("id", id).single();
  await supabase.from("reports").delete().eq("id", id).eq("status", "draft");
  redirect(data ? `/admin/participantes/${data.participant_id}` : "/admin");
}

// ─── Check-in replies ───────────────────────────────────────────────────────

export async function sendReply(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const checkinId = String(form.get("checkin_id"));
  const text = String(form.get("final_text") ?? "").trim();
  if (text.length < 5) return { error: "Escribe la respuesta." };
  const supabase = await createClient();
  const { data: checkin } = await supabase.from("checkins").select("participant_id").eq("id", checkinId).single();
  if (!checkin) return { error: "Check-in no encontrado." };
  const { error } = await supabase
    .from("checkin_replies")
    .upsert({ checkin_id: checkinId, participant_id: checkin.participant_id, final_text: text, status: "sent", sent_by: admin.userId, sent_at: new Date().toISOString() }, { onConflict: "checkin_id" });
  if (error) return { error: "No se pudo enviar." };
  await logAdminAccess(supabase, admin.userId, "send_checkin_reply", checkin.participant_id, { checkin_id: checkinId });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Respuesta enviada." };
}

export async function regenerateReply(form: FormData): Promise<void> {
  await requireAdmin();
  await runCheckinReply(String(form.get("checkin_id")));
  revalidatePath("/admin/checkins");
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export async function updateAlert(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(form.get("alert_id"));
  const status = z.enum(["acknowledged", "resolved"]).parse(form.get("status"));
  const supabase = await createClient();
  await supabase
    .from("alerts")
    .update({ status, resolved_by: admin.userId, resolved_at: status === "resolved" ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/admin", "layout");
}
