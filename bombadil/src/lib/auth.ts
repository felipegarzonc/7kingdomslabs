import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SmokingStatus } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export interface ParticipantRow {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string | null;
  birth_date: string | null;
  sex: "male" | "female" | null;
  height_cm: number | null;
  personal_goal: string | null;
  smoking_status: SmokingStatus | null;
  /** Answers to the lifestyle questionnaire (see src/domain/lifestyle.ts). */
  lifestyle: unknown;
  priorities: string[];
  /** {sober, reminders_email}; see prefsOf. */
  preferences: Record<string, unknown> | null;
  /** Token of the read-only buddy page (/compartir/<token>); null = not shared. */
  share_token: string | null;
  pilot_start: string | null;
  status: "invited" | "active" | "withdrawn" | "completed";
  withdrawn_at: string | null;
  created_at: string;
}

export interface Preferences {
  /** Hide XP, levels and celebrations: just habits and streaks. */
  sober: boolean;
  reminders_email: boolean;
}

export function prefsOf(p: Pick<ParticipantRow, "preferences">): Preferences {
  const x = p.preferences ?? {};
  return { sober: x.sober === true, reminders_email: x.reminders_email === true };
}

export interface Viewer {
  userId: string;
  email: string;
  isAdmin: boolean;
  participant: ParticipantRow | null;
}

/** The signed-in user, their role and participant row. Memoised per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: isAdmin }, { data: participant }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("participants").select("*").eq("auth_user_id", user.id).maybeSingle(),
  ]);
  return { userId: user.id, email: user.email ?? "", isAdmin: !!isAdmin, participant: (participant as ParticipantRow) ?? null };
});

export async function requireAdmin(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.isAdmin) redirect("/");
  return v;
}

/** An onboarded participant. Sends invited participants to onboarding. */
export async function requireParticipant(): Promise<Viewer & { participant: ParticipantRow }> {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.participant) redirect(v.isAdmin ? "/admin" : "/sin-acceso");
  if (v.participant.status === "invited") redirect("/onboarding");
  return v as Viewer & { participant: ParticipantRow };
}
