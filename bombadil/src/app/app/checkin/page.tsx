import type { Metadata } from "next";
import { fmtDate } from "@/components/format";
import { Card, PageHeader } from "@/components/ui";
import { pilotWeek } from "@/domain/pilot";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = { title: "Check-in semanal" };
export const maxDuration = 120;

export default async function CheckinPage() {
  const { participant: p } = await requireParticipant();
  const week = p.pilot_start ? pilotWeek(p.pilot_start) : 1;
  const supabase = await createClient();
  const [{ data: current }, { data: history }] = await Promise.all([
    supabase.from("checkins").select("id, submitted_at").eq("participant_id", p.id).eq("week", week).maybeSingle(),
    supabase.from("checkins").select("id, week, submitted_at, checkin_replies(final_text, status)").eq("participant_id", p.id).order("week", { ascending: false }).limit(12),
  ]);

  return (
    <>
      <PageHeader title={`Check-in · semana ${week}`} subtitle="Menos de 2 minutos." />
      {current ? (
        <Card>
          <p className="text-sm">Ya enviaste el check-in de esta semana ({fmtDate(current.submitted_at)}). ¡Nos vemos la próxima!</p>
        </Card>
      ) : (
        <Card>
          <CheckinForm priorities={p.priorities} week={week} />
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
