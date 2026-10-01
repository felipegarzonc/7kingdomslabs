import type { Metadata } from "next";
import { AlertNotices } from "@/components/alert-list";
import { fmtDate } from "@/components/format";
import { Card, Notice, PageHeader } from "@/components/ui";
import { addDays, todayInColombia } from "@/domain/habits";
import { pilotWeek } from "@/domain/pilot";
import { deviceSummary } from "@/domain/wearables";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = { title: "Check-in semanal" };
export const maxDuration = 120;

export default async function CheckinPage() {
  const { participant: p } = await requireParticipant();
  const week = p.pilot_start ? pilotWeek(p.pilot_start) : 1;
  const supabase = await createClient();
  const today = todayInColombia();
  const [{ data: current }, { data: history }, { data: deviceRows }] = await Promise.all([
    supabase.from("checkins").select("id, submitted_at").eq("participant_id", p.id).eq("week", week).maybeSingle(),
    supabase.from("checkins").select("id, week, submitted_at, checkin_replies(final_text, status)").eq("participant_id", p.id).order("week", { ascending: false }).limit(12),
    supabase.from("measurements").select("type, value, measured_at, source").eq("participant_id", p.id).in("source", ["strava", "apple_health"]).gte("measured_at", `${addDays(today, -7)}T00:00:00-05:00`),
  ]);
  // What the watch already measured this week is not asked again.
  const dev = deviceSummary((deviceRows ?? []).map((m) => ({ ...m, value: Number(m.value) })), today, 7);
  const fromDevices: Record<string, string> = {};
  if (dev?.sleep_hours != null) fromDevices.sleep_hours = `sueño ${dev.sleep_hours.toLocaleString("es-CO")} h`;
  if (dev?.exercise_minutes_per_week != null) fromDevices.exercise_minutes = `ejercicio ${dev.exercise_minutes_per_week} min`;
  if (dev?.resting_hr != null) fromDevices.resting_hr = `FC en reposo ${dev.resting_hr} lpm`;

  // Escalations from this week's check-in stay visible here (not only in the action response).
  const { data: alerts } = current
    ? await supabase.from("alerts").select("level, message").eq("origin", "checkin").eq("origin_id", current.id).eq("status", "open").neq("level", "next_visit")
    : { data: [] };

  return (
    <>
      <PageHeader title={`Check-in · semana ${week}`} subtitle="Menos de 2 minutos." />
      {current ? (
        <div className="flex flex-col gap-3">
          <AlertNotices alerts={alerts ?? []} />
          <Notice tone="good">
            Recibimos tu check-in de esta semana ({fmtDate(current.submitted_at)}). Tu respuesta aparece abajo y en Hoy en uno o dos minutos. ¡Nos vemos la próxima!
          </Notice>
        </div>
      ) : (
        <Card>
          <CheckinForm priorities={p.priorities} week={week} fromDevices={fromDevices} />
        </Card>
      )}

      {history?.length ? (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Semanas anteriores</h2>
          <ul className="flex flex-col gap-3">
            {history.map((c) => {
              const reply = (c.checkin_replies as unknown as Array<{ final_text: string | null; status: string }> | { final_text: string | null } | null) ?? null;
              const text = Array.isArray(reply) ? reply[0]?.final_text : reply?.final_text;
              return (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <p className="font-medium">
                    Semana {c.week} <span className="font-normal text-muted">· {fmtDate(c.submitted_at)}</span>
                  </p>
                  {text ? <p className="mt-1 whitespace-pre-line text-text/90">{text}</p> : <p className="mt-1 text-muted">Respuesta en preparación.</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
