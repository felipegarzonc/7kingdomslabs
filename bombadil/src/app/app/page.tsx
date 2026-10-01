import type { Metadata } from "next";
import Link from "next/link";
import { AlertNotices } from "@/components/alert-list";
import { fmtDate, fmtNum } from "@/components/format";
import { GoalStatusBadge, ProgressBar } from "@/components/goal-status";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { pilotWeek } from "@/domain/pilot";
import { buildSnapshot, metricLabel, MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/domain/snapshot";
import { requireParticipant } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";
import { FeedbackCard } from "./feedback-card";

export const metadata: Metadata = { title: "Inicio" };

/** Alarm notices on the home page are about the last 7 days; older ones live in the operator's queue. */
function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 3600e3).toISOString();
}

export default async function ParticipantHome() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const week = p.pilot_start ? pilotWeek(p.pilot_start) : 1;
  const [data, checkinRes, replyRes, alertsRes, feedbackRes, pendingDocs] = await Promise.all([
    loadParticipantData(supabase, p.id),
    supabase.from("checkins").select("id").eq("participant_id", p.id).eq("week", week).maybeSingle(),
    supabase.from("checkin_replies").select("final_text, sent_at, checkins(week)").eq("participant_id", p.id).eq("status", "sent").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("alerts").select("level, message, created_at").eq("participant_id", p.id).eq("status", "open").in("level", ["urgency", "consult_soon"]).gte("created_at", weekAgo()).order("created_at", { ascending: false }).limit(5),
    supabase.from("pilot_feedback").select("id").eq("participant_id", p.id).limit(1),
    supabase.from("lab_documents").select("id", { count: "exact", head: true }).eq("participant_id", p.id).neq("status", "reviewed"),
  ]);
  const snapshot = buildSnapshot(toSnapshotInput(p, data));
  const doneThisWeek = !!checkinRes.data;
  const reply = replyRes.data as { final_text: string; sent_at: string; checkins: { week: number } | null } | null;
  const latest = snapshot.measurementsLatest;

  return (
    <>
      <PageHeader title="Hola 👋" subtitle={`Semana ${week} del piloto`} />
      <div className="flex flex-col gap-4">
        <AlertNotices alerts={(alertsRes.data ?? []).map((a) => ({ level: a.level, message: a.message }))} />

        {!doneThisWeek ? (
          <Card className="border-accent bg-accent-soft/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Tu check-in de la semana {week}</p>
                <p className="text-sm text-muted">Menos de 2 minutos: mediciones, prioridades y cómo te fue.</p>
              </div>
              <LinkButton href="/app/checkin">Hacer check-in</LinkButton>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Tus prioridades">
            {p.priorities.length ? (
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                {p.priorities.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Tus prioridades aparecerán cuando el equipo apruebe tu primer informe. Mientras tanto, sube tus exámenes y registra tus mediciones.</p>
            )}
          </Card>

          <Card title="Mensaje del equipo">
            {reply ? (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-line">{reply.final_text}</p>
                <p className="mt-2 text-xs text-muted">
                  Semana {reply.checkins?.week ?? "—"} · {fmtDate(reply.sent_at)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Después de tu check-in recibirás aquí una respuesta breve.</p>
            )}
          </Card>
        </div>

        <Card title="Metas" action={<Link href="/app/metas" className="text-sm font-medium text-accent">Ver todas</Link>}>
          {snapshot.goals.length ? (
            <ul className="flex flex-col gap-4">
              {snapshot.goals.slice(0, 4).map((g) => (
                <li key={g.id}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {metricLabel(g.metric)}: {fmtNum(g.baseline)} → {fmtNum(g.target)}
                    </span>
                    <GoalStatusBadge status={g.status} />
                  </div>
                  <ProgressBar progress={g.progress} expected={g.expected} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aún no tienes metas">
              <Link href="/app/metas" className="text-accent underline">
                Crea una meta a 3, 6 o 12 meses
              </Link>
            </EmptyState>
          )}
        </Card>

        <Card title="Últimas mediciones" action={<Link href="/app/mediciones" className="text-sm font-medium text-accent">Registrar</Link>}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["weight", "waist", "resting_hr", "sleep_hours", "grip_strength", "vo2max"] as const).map((t) => (
              <div key={t} className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">{MEASUREMENT_LABEL[t]}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {latest[t] ? `${fmtNum(latest[t]!.value)} ${MEASUREMENT_UNIT[t]}` : "—"}
                </dd>
              </div>
            ))}
            <div className="col-span-2 rounded-xl bg-surface-2 p-3 sm:col-span-4">
              <dt className="text-xs text-muted">Presión arterial (media 30 días, diurna)</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {snapshot.derived.bp ? `${fmtNum(snapshot.derived.bp.recentMeanSystolic, 0)}/${fmtNum(snapshot.derived.bp.recentMeanDiastolic, 0)} mmHg · ${snapshot.derived.bp.readings} ${snapshot.derived.bp.readings === 1 ? "lectura" : "lecturas"}` : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {pendingDocs.count ? (
          <p className="text-sm text-muted">
            Tienes {pendingDocs.count} examen(es) en revisión por el equipo. <Link href="/app/examenes" className="text-accent underline">Ver</Link>
          </p>
        ) : null}

        {week >= 6 && !feedbackRes.data?.length ? <FeedbackCard /> : null}
      </div>
    </>
  );
}
