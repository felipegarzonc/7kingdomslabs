"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form-state";
import { CONSENT_VERSION, consentHash } from "@/content/legal";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  birth_date: z.iso.date(),
  sex: z.enum(["male", "female"]),
  height_cm: z.coerce.number().min(100).max(250).optional(),
  personal_goal: z.string().trim().max(1000).optional(),
  smoking_status: z.enum(["never", "former", "current"]).optional(),
  consent: z.literal("yes"),
});

export async function completeOnboarding(_prev: FormState, form: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v?.participant) return { error: "Tu cuenta no tiene una invitación activa." };
  const parsed = Schema.safeParse(Object.fromEntries([...form.entries()].filter(([, x]) => x !== "")));
  if (!parsed.success) {
    if (form.get("consent") !== "yes") return { error: "Para participar necesitamos tu autorización explícita." };
    return { error: "Revisa tu fecha de nacimiento y tu sexo biológico." };
  }
  const age = (Date.now() - Date.parse(parsed.data.birth_date)) / (365.25 * 24 * 3600 * 1000);
  if (age < 18 || age > 100) return { error: "El piloto es para personas adultas (18 años o más)." };

  const supabase = await createClient();
  const h = await headers();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_birth_date: parsed.data.birth_date,
    p_sex: parsed.data.sex,
    p_height_cm: parsed.data.height_cm ?? null,
    p_personal_goal: parsed.data.personal_goal || null,
    p_smoking_status: parsed.data.smoking_status ?? null,
    p_consent_version: CONSENT_VERSION,
    p_consent_hash: consentHash(),
    p_user_agent: h.get("user-agent") ?? "",
  });
  if (error) return { error: "No pudimos guardar tu información. Intenta de nuevo." };
  redirect("/app/empezar");
}
