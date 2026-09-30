"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { BIOMARKER_BY_CODE } from "@/domain/biomarkers";
import { evaluateEscalation, SYMPTOMS, type TriggeredRule } from "@/domain/escalation";
import { deadlineFor } from "@/domain/goals";
import { pilotWeek } from "@/domain/pilot";
import { MEASUREMENT_BOUNDS, MEASUREMENT_UNIT } from "@/domain/snapshot";
import type { MeasurementType } from "@/domain/types";
import { raiseAlerts } from "@/lib/alerts";
import { requireParticipant } from "@/lib/auth";
import { runCheckinReply, runExtraction } from "@/lib/jobs";
import { deleteParticipantCompletely } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Deterministic escalations to show immediately. */
  alerts?: Array<Pick<TriggeredRule, "level" | "message">>;
} | null;

const optionalNumber = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))), z.number().finite().optional());

function checkBounds(type: MeasurementType, value: number): string | null {
  const [lo, hi] = MEASUREMENT_BOUNDS[type];
  return value < lo || value > hi ? `El valor de ${type} (${value}) parece un error de digitación.` : null;
}

function localToIso(local: string | undefined): string {
  // datetime-local has no zone; the pilot runs in Colombia (UTC-5, no DST).
  if (!local) return new Date().toISOString();
  return new Date(`${local}:00-05:00`).toISOString();
}

// ─── Measurements ───────────────────────────────────────────────────────────

const MeasurementForm = z.object({
  type: z.enum(["weight", "waist", "bp", "resting_hr", "sleep_hours", "exercise_minutes"]),
  value: optionalNumber,
  systolic: optionalNumber,
  diastolic: optionalNumber,
  arm: z.enum(["left", "right"]).optional(),
  period: z.enum(["day", "night"]).optional(),
  measured_at: z.string().optional(),
});

export async function addMeasurement(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await requireParticipant();
  const parsed = MeasurementForm.safeParse(Object.fromEntries([...form.entries()].filter(([, x]) => x !== "")));
  if (!parsed.success) return { error: "Revisa los datos de la medición." };
  const f = parsed.data;
  const at = localToIso(f.measured_at);
  if (Date.parse(at) > Date.now() + 5 * 60e3) return { error: "La fecha no puede estar en el futuro." };

  const rows: Array<{ type: MeasurementType; value: number; context: Record<string, string>; group_id: string | null }> = [];
  if (f.type === "bp") {
    if (f.systolic === undefined || f.diastolic === undefined) return { error: "Escribe la sistólica y la diastólica." };
    if (f.diastolic >= f.systolic) return { error: "La diastólica debe ser menor que la sistólica." };
    const ctx: Record<string, string> = {};
    if (f.arm) ctx.arm = f.arm;
    if (f.period) ctx.period = f.period;
    const group = randomUUID();
    rows.push({ type: "bp_systolic", value: f.systolic, context: ctx, group_id: group }, { type: "bp_diastolic", value: f.diastolic, context: ctx, group_id: group });
  } else {
    if (f.value === undefined) return { error: "Escribe el valor." };
    rows.push({ type: f.type, value: f.value, context: {}, group_id: null });
  }
  for (const r of rows) {
    const err = checkBounds(r.type, r.value);
    if (err) return { error: err };
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("measurements")
    .insert(rows.map((r) => ({ participant_id: v.participant.id, type: r.type, value: r.value, unit: MEASUREMENT_UNIT[r.type], measured_at: at, context: r.context, group_id: r.group_id, source: "manual" })))
    .select("id");
  if (error) return { error: "No se pudo guardar la medición." };

  // Deterministic escalation — independent of any LLM.
  const triggered = evaluateEscalation({ sex: v.participant.sex ?? "male", measurements: rows.map((r) => ({ type: r.type, value: r.value })) });
  await raiseAlerts(supabase, v.participant.id, triggered, "measurement", inserted?.[0]?.id ?? null);

  revalidatePath("/app", "layout");
  return {
    ok: true,
    message: "Medición guardada.",
    alerts: triggered.filter((t) => t.level !== "next_visit" || f.type === "bp").map((t) => ({ level: t.level, message: t.message })),
  };
}

export async function deleteMeasurement(form: FormData): Promise<void> {
  const v = await requireParticipant();
  const id = String(form.get("id"));
  const supabase = await createClient();
  const { data: m } = await supabase.from("measurements").select("group_id").eq("id", id).maybeSingle();
  if (m?.group_id) await supabase.from("measurements").delete().eq("group_id", m.group_id).eq("participant_id", v.participant.id);
  else await supabase.from("measurements").delete().eq("id", id).eq("participant_id", v.participant.id);
  revalidatePath("/app", "layout");
}

// ─── Weekly check-in ────────────────────────────────────────────────────────

export async function submitCheckin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await requireParticipant();
  const p = v.participant;
  if (!p.pilot_start) return { error: "Tu piloto aún no ha iniciado." };
  const week = pilotWeek(p.pilot_start);
  const num = (k: string) => {
    const r = optionalNumber.safeParse(form.get(k) ?? "");
    return r.success ? r.data : undefined;
  };

  const measurements: Array<{ type: MeasurementType; value: number; group_id?: string }> = [];
  for (const t of ["weight", "waist", "resting_hr", "sleep_hours", "exercise_minutes"] as const) {
    const val = num(t);
    if (val !== undefined) measurements.push({ type: t, value: val });
  }
  const s = num("systolic");
  const d = num("diastolic");
  if ((s === undefined) !== (d === undefined)) return { error: "Para la presión escribe sistólica y diastólica." };
  if (s !== undefined && d !== undefined) {
    if (d >= s) return { error: "La diastólica debe ser menor que la sistólica." };
    const g = randomUUID();
    measurements.push({ type: "bp_systolic", value: s, group_id: g }, { type: "bp_diastolic", value: d, group_id: g });
  }
  for (const m of measurements) {
    const err = checkBounds(m.type, m.value);
    if (err) return { error: err };
  }

  const adherence = (p.priorities ?? []).map((priority, i) => ({ priority, status: String(form.get(`adherence_${i}`) ?? "no") }));
  const symptoms = form.getAll("symptoms").map(String).filter((x): x is (typeof SYMPTOMS)[number] => (SYMPTOMS as readonly string[]).includes(x));
  const freeText = String(form.get("free_text") ?? "").trim().slice(0, 2000) || null;
  const started = Number(form.get("started_at"));
  const duration = Number.isFinite(started) && started > 0 ? Math.round((Date.now() - started) / 1000) : null;

  const supabase = await createClient();
  const { data: checkin, error } = await supabase
    .from("checkins")
    .insert({
      participant_id: p.id,
      week,
      adherence,
      symptoms,
      free_text: freeText,
      answers: { energy: form.get("energy") ?? null },
      duration_seconds: duration,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Ya enviaste el check-in de esta semana." };
    return { error: "No se pudo guardar el check-in." };
  }
  if (measurements.length) {
    const at = new Date().toISOString();
    await supabase.from("measurements").insert(
      measurements.map((m) => ({ participant_id: p.id, type: m.type, value: m.value, unit: MEASUREMENT_UNIT[m.type], measured_at: at, group_id: m.group_id ?? null, source: "checkin" })),
    );
  }

  // Deterministic escalation first; the LLM reply is generated afterwards and cannot affect it.
  const triggered = evaluateEscalation({ sex: p.sex ?? "male", measurements, symptoms, freeText });
  await raiseAlerts(supabase, p.id, triggered, "checkin", checkin.id);

  after(() => runCheckinReply(checkin.id));
  revalidatePath("/app", "layout");
  return {
    ok: true,
    message: "¡Listo! Recibimos tu check-in. Tendrás una respuesta del equipo pronto.",
    alerts: triggered.filter((t) => t.level !== "next_visit").map((t) => ({ level: t.level, message: t.message })),
  };
}

// ─── Lab uploads ────────────────────────────────────────────────────────────

export async function uploadLab(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await requireParticipant();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige un archivo PDF." };
  if (file.type !== "application/pdf") return { error: "Solo se aceptan archivos PDF." };
  if (file.size > 15 * 1024 * 1024) return { error: "El PDF supera 15 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return { error: "El archivo no parece un PDF válido." };

  const labName = String(form.get("lab_name") ?? "").trim().slice(0, 100) || null;
  const sampledOn = String(form.get("sampled_on") ?? "") || null;
  const path = `${v.participant.id}/${randomUUID()}.pdf`;
  const supabase = await createClient();
  const up = await supabase.storage.from("lab-pdfs").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up.error) return { error: "No se pudo subir el archivo." };
  const { data: doc, error } = await supabase
    .from("lab_documents")
    .insert({ participant_id: v.participant.id, storage_path: path, original_filename: file.name.slice(0, 200), lab_name: labName, sampled_on: sampledOn, uploaded_by: v.userId })
    .select("id")
    .single();
  if (error) return { error: "No se pudo registrar el examen." };

  after(() => runExtraction(doc.id));
  revalidatePath("/app/examenes");
  return { ok: true, message: "Examen recibido. Lo transcribimos y el equipo lo revisa antes de que aparezca en tu línea de tiempo." };
}

// ─── Goals ──────────────────────────────────────────────────────────────────

const GoalForm = z.object({
  metric: z.string().refine((m) => m in MEASUREMENT_UNIT || BIOMARKER_BY_CODE.has(m), "métrica desconocida"),
  baseline: z.coerce.number().finite(),
  target: z.coerce.number().finite(),
  horizon_months: z.coerce.number().pipe(z.union([z.literal(3), z.literal(6), z.literal(12)])),
  notes: z.string().max(300).optional(),
});

export async function createGoal(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await requireParticipant();
  const parsed = GoalForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa la meta: métrica, línea base, meta y horizonte." };
  if (parsed.data.baseline === parsed.data.target) return { error: "La meta debe ser distinta de la línea base." };
  const start = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    participant_id: v.participant.id,
    metric: parsed.data.metric,
    baseline: parsed.data.baseline,
    target: parsed.data.target,
    horizon_months: parsed.data.horizon_months,
    start_date: start,
    deadline: deadlineFor(start, parsed.data.horizon_months as 3 | 6 | 12),
    notes: parsed.data.notes || null,
    created_by: v.userId,
  });
  if (error) return { error: "No se pudo crear la meta." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Meta creada." };
}

export async function archiveGoal(form: FormData): Promise<void> {
  const v = await requireParticipant();
  const supabase = await createClient();
  await supabase.from("goals").update({ active: false }).eq("id", String(form.get("id"))).eq("participant_id", v.participant.id);
  revalidatePath("/app", "layout");
}

// ─── Profile, feedback, data rights ─────────────────────────────────────────

export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireParticipant();
  const height = Number(form.get("height_cm"));
  const goal = String(form.get("personal_goal") ?? "").trim();
  if (!(height >= 100 && height <= 250)) return { error: "Estatura inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_profile", { p_height_cm: height, p_personal_goal: goal.slice(0, 1000) });
  if (error) return { error: "No se pudo actualizar." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Datos actualizados." };
}

export async function submitFeedback(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await requireParticipant();
  const wtp = Number(String(form.get("willingness_to_pay_cop") ?? "").replace(/\D/g, ""));
  const cont = String(form.get("would_continue") ?? "");
  if (!["yes", "maybe", "no"].includes(cont)) return { error: "Elige una opción." };
  const supabase = await createClient();
  const { error } = await supabase.from("pilot_feedback").insert({
    participant_id: v.participant.id,
    week: v.participant.pilot_start ? pilotWeek(v.participant.pilot_start) : null,
    willingness_to_pay_cop: Number.isFinite(wtp) && wtp > 0 ? wtp : null,
    would_continue: cont,
    comments: String(form.get("comments") ?? "").trim().slice(0, 2000) || null,
    recorded_by: v.userId,
  });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Gracias. Tu respuesta nos ayuda a decidir cómo seguir." };
}

/** Deletes the participant's account and ALL their data (Ley 1581 — supresión). */
export async function deleteMyAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await requireParticipant();
  if (String(form.get("confirm")).trim().toUpperCase() !== "ELIMINAR") return { error: "Escribe ELIMINAR para confirmar." };
  await deleteParticipantCompletely(v.participant.id, v.participant.auth_user_id);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
