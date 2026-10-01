import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_ACTIVE_HABITS, PILLAR_LABEL, todayInColombia } from "@/domain/habits";
import { describeLifestyle, LifestyleSchema } from "@/domain/lifestyle";
import { buildSnapshot } from "@/domain/snapshot";
import type { ParticipantRow } from "@/lib/auth";
import { loadImagingForReport, loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { generateHabitPlan, type HabitPlanInput } from "@/lib/llm/habits";
import type { ReportContent } from "@/lib/llm/report";

const SMOKING: Record<string, string> = { never: "no fuma", former: "exfumador", current: "fuma" };

async function buildInput(db: SupabaseClient, p: ParticipantRow): Promise<HabitPlanInput> {
  const [data, imaging, report, habits] = await Promise.all([
    loadParticipantData(db, p.id),
    loadImagingForReport(db, p.id),
    db.from("reports").select("content").eq("participant_id", p.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("habits").select("title").eq("participant_id", p.id).eq("status", "active"),
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
    habitos_actuales: (habits.data ?? []).map((h) => h.title),
  };
}

/**
 * Generates a new habit plan and stores it: replaces earlier plan suggestions,
 * starts the top ones right away (up to MAX_ACTIVE_HABITS active in total) and
 * leaves the rest as suggestions.
 */
export async function createHabitPlan(db: SupabaseClient, participant: ParticipantRow): Promise<{ message: string } | { error: string }> {
  let result;
  try {
    result = await generateHabitPlan(await buildInput(db, participant));
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  await db.from("habits").delete().eq("participant_id", participant.id).eq("status", "suggested").eq("source", "plan");
  const { count } = await db.from("habits").select("id", { count: "exact", head: true }).eq("participant_id", participant.id).eq("status", "active");
  let slots = Math.max(0, MAX_ACTIVE_HABITS - (count ?? 0));
  const today = todayInColombia();
  const rows = result.plan.habits.map((h) => {
    const start = slots-- > 0;
    return {
      participant_id: participant.id,
      pillar: h.pillar,
      title: h.title.slice(0, 140),
      tiny: h.tiny.slice(0, 140),
      anchor: h.anchor.slice(0, 140),
      why: h.why.slice(0, 500),
      next_step: h.next_step.slice(0, 300),
      target_per_week: h.target_per_week,
      status: start ? "active" : "suggested",
      started_on: start ? today : null,
      source: "plan",
      prompt_version: result.promptVersion,
      model: result.model,
    };
  });
  const { error } = await db.from("habits").insert(rows);
  if (error) return { error: error.message };
  return { message: result.plan.message };
}
