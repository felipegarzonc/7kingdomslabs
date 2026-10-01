"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PILLARS, todayInColombia } from "@/domain/habits";
import { LifestyleSchema } from "@/domain/lifestyle";
import { ownHabitRows, parseOwnHabits } from "@/domain/own-habits";
import { prefsOf, requireParticipant } from "@/lib/auth";
import { createHabitPlan, saveOwnHabits } from "@/lib/habit-plan";
import { createClient } from "@/lib/supabase/server";

export type HabitState = { ok?: boolean; error?: string; message?: string } | null;

// ─── Lifestyle questionnaire → personalised plan ────────────────────────────

export async function saveLifestyleAndPlan(_prev: HabitState, form: FormData): Promise<HabitState> {
  const v = await requireParticipant();
  const parsed = LifestyleSchema.safeParse({
    activity: form.get("activity"),
    strength: form.get("strength"),
    sleep: form.get("sleep"),
    vegetables: form.get("vegetables"),
    processed: form.get("processed"),
    alcohol: form.get("alcohol"),
    stress: form.get("stress"),
    time: form.get("time"),
    focus: form.getAll("focus").map(String).slice(0, 3),
    constraints: String(form.get("constraints") ?? "").trim().slice(0, 500) || undefined,
    own_reviewed: true,
  });
  if (!parsed.success) return { error: "Responde todas las preguntas (es un toque por pregunta)." };
  const own = parseOwnHabits(form);
  if (!own) return { error: "Revisa tus hábitos actuales: días entre 1 y 7, y si escribes uno propio, al menos 3 letras." };
  const goal = String(form.get("personal_goal") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_lifestyle", { p_lifestyle: parsed.data, p_personal_goal: goal });
  if (error) return { error: "No se pudieron guardar tus respuestas." };
  await saveOwnHabits(supabase, v.participant.id, ownHabitRows(own));
  const participant = { ...v.participant, lifestyle: parsed.data, personal_goal: goal || v.participant.personal_goal };
  const plan = await createHabitPlan(supabase, participant);
  revalidatePath("/app", "layout");
  // Their own habits are saved either way; suggestions can be asked for again from Gestionar hábitos.
  if ("error" in plan) redirect("/app?plan=sin-sugerencias");
  redirect("/app?plan=nuevo");
}

export async function regeneratePlan(_prev: HabitState): Promise<HabitState> {
  const v = await requireParticipant();
  const supabase = await createClient();
  const plan = await createHabitPlan(supabase, v.participant);
  if ("error" in plan) return { error: `No se pudo crear el plan: ${plan.error}` };
  revalidatePath("/app", "layout");
  return { ok: true, message: plan.message };
}

// ─── Daily logging ──────────────────────────────────────────────────────────

const LogForm = z.object({
  habit_id: z.uuid(),
  mode: z.enum(["full", "tiny", "undo"]),
  day: z.iso.date().optional(),
});

export async function logHabit(form: FormData): Promise<void> {
  const v = await requireParticipant();
  const f = LogForm.parse(Object.fromEntries(form));
  const today = todayInColombia();
  // Logging is allowed for today and yesterday (forgot to tap before sleeping).
  const day = f.day && f.day <= today && f.day >= new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10) ? f.day : today;
  const supabase = await createClient();
  if (f.mode === "undo") {
    const { data: removed } = await supabase.from("habit_logs").delete().eq("habit_id", f.habit_id).eq("day", day).eq("participant_id", v.participant.id).select("source");
    // A device logged it and the person says no: devices must not log that day again.
    if (removed?.some((r) => r.source && r.source !== "manual")) {
      await supabase.from("habit_log_dismissals").upsert({ habit_id: f.habit_id, participant_id: v.participant.id, day }, { onConflict: "habit_id,day", ignoreDuplicates: true });
    }
  } else {
    await supabase
      .from("habit_logs")
      .upsert({ habit_id: f.habit_id, participant_id: v.participant.id, day, full_version: f.mode === "full" }, { onConflict: "habit_id,day" });
  }
  revalidatePath("/app", "layout");
  // The last habit of the day earns the celebration screen (immediate reward).
  if (f.mode !== "undo" && day === today && !prefsOf(v.participant).sober) {
    const [active, logged] = await Promise.all([
      supabase.from("habits").select("id").eq("participant_id", v.participant.id).eq("status", "active"),
      supabase.from("habit_logs").select("habit_id").eq("participant_id", v.participant.id).eq("day", today),
    ]);
    const ids = new Set((logged.data ?? []).map((l) => l.habit_id));
    if (active.data?.length && active.data.every((h) => ids.has(h.id))) redirect("/app/celebracion");
  }
}

// ─── Managing habits ────────────────────────────────────────────────────────

async function ownHabit(id: string) {
  const v = await requireParticipant();
  const supabase = await createClient();
  const { data } = await supabase.from("habits").select("*").eq("id", id).eq("participant_id", v.participant.id).maybeSingle();
  if (!data) throw new Error("habit not found");
  return { supabase, habit: data };
}

export async function setHabitStatus(form: FormData): Promise<void> {
  const id = String(form.get("habit_id"));
  const status = z.enum(["active", "paused", "archived"]).parse(form.get("status"));
  const { supabase, habit } = await ownHabit(id);
  await supabase
    .from("habits")
    .update({ status, started_on: status === "active" && !habit.started_on ? todayInColombia() : habit.started_on })
    .eq("id", id);
  revalidatePath("/app", "layout");
}

/** "Probar": starts a suggestion; an improvement replaces the habit it levels up. */
export async function acceptSuggestion(form: FormData): Promise<void> {
  const { supabase, habit } = await ownHabit(String(form.get("habit_id")));
  if (habit.status !== "suggested") return;
  let level = 1;
  if (habit.replaces_habit_id) {
    const { data: old } = await supabase.from("habits").select("id, level").eq("id", habit.replaces_habit_id).maybeSingle();
    if (old) {
      level = Math.min(20, old.level + 1);
      await supabase.from("habits").update({ status: "archived" }).eq("id", old.id);
    }
  }
  await supabase.from("habits").update({ status: "active", started_on: todayInColombia(), level }).eq("id", habit.id);
  revalidatePath("/app", "layout");
}

/** "Ahora no": archived with a date, so the plan does not propose it again soon. */
export async function declineSuggestion(form: FormData): Promise<void> {
  const { supabase, habit } = await ownHabit(String(form.get("habit_id")));
  if (habit.status !== "suggested") return;
  await supabase.from("habits").update({ status: "archived", declined_at: new Date().toISOString() }).eq("id", habit.id);
  revalidatePath("/app", "layout");
}

/** It got easy: the next level becomes the habit. */
export async function levelUpHabit(form: FormData): Promise<void> {
  const { supabase, habit } = await ownHabit(String(form.get("habit_id")));
  if (!habit.next_step) return;
  await supabase
    .from("habits")
    .update({ title: habit.next_step.slice(0, 140), tiny: habit.title.slice(0, 140), next_step: null, level: Math.min(20, habit.level + 1), started_on: todayInColombia() })
    .eq("id", habit.id);
  revalidatePath("/app", "layout");
}

/** It was too big: the tiny version becomes the habit, on fewer days. */
export async function shrinkHabit(form: FormData): Promise<void> {
  const { supabase, habit } = await ownHabit(String(form.get("habit_id")));
  await supabase
    .from("habits")
    .update({
      title: (habit.tiny ?? habit.title).slice(0, 140),
      next_step: habit.title.slice(0, 300),
      target_per_week: Math.max(1, Math.ceil(habit.target_per_week * 0.6)),
      started_on: todayInColombia(),
    })
    .eq("id", habit.id);
  revalidatePath("/app", "layout");
}

const CustomHabit = z.object({
  title: z.string().trim().min(3).max(140),
  pillar: z.enum(PILLARS),
  target_per_week: z.coerce.number().int().min(1).max(7),
  anchor: z.string().trim().max(140).optional(),
  tiny: z.string().trim().max(140).optional(),
});

export async function createCustomHabit(_prev: HabitState, form: FormData): Promise<HabitState> {
  const v = await requireParticipant();
  const parsed = CustomHabit.safeParse(Object.fromEntries([...form.entries()].filter(([, x]) => x !== "")));
  if (!parsed.success) return { error: "Escribe el hábito (mínimo 3 letras) y cuántos días a la semana." };
  const supabase = await createClient();
  const { error } = await supabase.from("habits").insert({ ...parsed.data, participant_id: v.participant.id, status: "active", source: "user", started_on: todayInColombia() });
  if (error) return { error: "No se pudo crear el hábito." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Hábito creado. Empieza hoy." };
}
