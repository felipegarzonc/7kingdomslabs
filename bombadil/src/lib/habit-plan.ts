import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, PILLAR_LABEL, todayInColombia, type Pillar } from "@/domain/habits";
import type { OwnHabitRow } from "@/domain/own-habits";
import { describeLifestyle, LifestyleSchema } from "@/domain/lifestyle";
import { buildSnapshot } from "@/domain/snapshot";
import { deviceSummary } from "@/domain/wearables";
import type { ParticipantRow } from "@/lib/auth";
import { loadImagingForReport, loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { generateHabitPlan, type HabitPlanInput } from "@/lib/llm/habits";
import type { ReportContent } from "@/lib/llm/report";

const SMOKING: Record<string, string> = { never: "no fuma", former: "exfumador", current: "fuma" };

interface CurrentHabit {
  id: string;
  title: string;
  pillar: Pillar;
  target_per_week: number;
  anchor: string | null;
  source: string;
}

async function buildInput(db: SupabaseClient, p: ParticipantRow, current: CurrentHabit[]): Promise<HabitPlanInput> {
  const [data, imaging, report, declined] = await Promise.all([
    loadParticipantData(db, p.id),
    loadImagingForReport(db, p.id),
    db.from("reports").select("content").eq("participant_id", p.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("habits").select("title").eq("participant_id", p.id).not("declined_at", "is", null).gte("declined_at", `${addDays(todayInColombia(), -60)}T00:00:00-05:00`),
  ]);
  const snapshot = buildSnapshot(toSnapshotInput(p, data));
  const lifestyle = LifestyleSchema.safeParse(p.lifestyle);
  return {
    meta: p.personal_goal,
    perfil: { edad: snapshot.profile.age, sexo: p.sex === "female" ? "mujer" : "hombre", fuma: p.smoking_status ? SMOKING[p.smoking_status] : null },
    estilo_de_vida: lifestyle.success ? describeLifestyle(lifestyle.data) : {},
    enfoque: lifestyle.success ? lifestyle.data.focus.map((f) => PILLAR_LABEL[f]) : [],
    hallazgos: {
      patrones: snapshot.patterns.map((x) => ({ patron: x.label, evidencia: x.evidence })),
      alertas: snapshot.escalations.map((e) => ({ nivel: e.level, mensaje: e.message })),
      fuera_de_rango: snapshot.markers.filter((m) => m.flag !== "normal").map((m) => `${m.name}: ${m.latest.value} ${m.unit} (${m.flag === "high" ? "alto" : "bajo"})`),
      prioridades_del_informe: ((report.data?.content as ReportContent | undefined)?.priorities ?? []).map((x) => x.title),
      imagenes: imaging,
    },
    habitos_actuales: current.map((h, i) => ({
      ref: i,
      titulo: h.title,
      area: PILLAR_LABEL[h.pillar],
      dias_por_semana: h.target_per_week,
      cuando: h.anchor,
      origen: h.source === "own" ? "propio" : "bombadil",
    })),
    rechazadas_recientemente: (declined.data ?? []).map((h) => h.title),
    datos_de_dispositivos: deviceSummary(
      data.measurements.map((m) => ({ type: m.type, value: m.value, measured_at: m.measured_at, source: m.source })),
      todayInColombia(),
    ),
  };
}

/**
 * Records the habits the person already has, active from today. Re-sending the form updates
 * matching ones instead of duplicating them; unchecked ones are left alone (they can be paused).
 */
export async function saveOwnHabits(db: SupabaseClient, participantId: string, rows: OwnHabitRow[]): Promise<void> {
  if (!rows.length) return;
  const { data: existing } = await db.from("habits").select("id, title").eq("participant_id", participantId).eq("source", "own").neq("status", "archived");
  const today = todayInColombia();
  for (const r of rows) {
    const match = existing?.find((e) => e.title.toLowerCase() === r.title.toLowerCase());
    if (match) await db.from("habits").update({ target_per_week: r.target_per_week, anchor: r.anchor, status: "active" }).eq("id", match.id);
    else await db.from("habits").insert({ ...r, participant_id: participantId, status: "active", source: "own", started_on: today });
  }
}

/**
 * Asks for at most two suggestions on top of what the person already does and stores them
 * as suggestions: nothing starts until the person accepts it. Replaces earlier pending ones.
 */
export async function createHabitPlan(db: SupabaseClient, participant: ParticipantRow): Promise<{ message: string; count: number } | { error: string }> {
  const { data: current } = await db
    .from("habits")
    .select("id, title, pillar, target_per_week, anchor, source")
    .eq("participant_id", participant.id)
    .eq("status", "active")
    .order("created_at");
  const habits = (current ?? []) as CurrentHabit[];
  let result;
  try {
    result = await generateHabitPlan(await buildInput(db, participant, habits));
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  await db.from("habits").delete().eq("participant_id", participant.id).eq("status", "suggested").eq("source", "plan");
  const rows = result.plan.suggestions.map((h) => {
    const replaced = h.kind === "improve" && h.improves !== null ? habits[h.improves] : undefined;
    return {
      participant_id: participant.id,
      pillar: h.pillar,
      title: h.title.slice(0, 140),
      tiny: h.tiny.slice(0, 140),
      anchor: h.anchor.slice(0, 140),
      why: h.why.slice(0, 500),
      next_step: h.next_step.slice(0, 300),
      target_per_week: h.target_per_week,
      status: "suggested",
      started_on: null,
      source: "plan",
      replaces_habit_id: replaced?.id ?? null,
      prompt_version: result.promptVersion,
      model: result.model,
    };
  });
  if (rows.length) {
    const { error } = await db.from("habits").insert(rows);
    if (error) return { error: error.message };
  }
  return { message: result.plan.message, count: rows.length };
}
