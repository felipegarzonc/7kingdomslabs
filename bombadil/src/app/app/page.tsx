import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { AlertNotices } from "@/components/alert-list";
import { fmtDate } from "@/components/format";
import { HeroCard, QuestList } from "@/components/game";
import { GameCelebration } from "@/components/game-celebration";
import { HabitCard } from "@/components/habit-card";
import { Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { addDays, todayInColombia } from "@/domain/habits";
import { deviceSummary } from "@/domain/wearables";
import { pilotWeek } from "@/domain/pilot";
import { requireParticipant } from "@/lib/auth";
import { loadGame } from "@/lib/data/game";
import { loadHabits } from "@/lib/data/habits";
import type { ReportContent } from "@/lib/llm/report";
import { syncStrava } from "@/lib/strava";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FeedbackCard } from "./feedback-card";

export const metadata: Metadata = { title: "Hoy" };

/** Alarm notices on the home page are about the last 7 days; older ones live in the operator's queue. */
function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 3600e3).toISOString();
}

/** Strava webhooks are the main path; this catches anything they missed. */
function staleSync(lastSyncAt: string | null) {
  return !lastSyncAt || Date.parse(lastSyncAt) < Date.now() - 3 * 3600e3;
}

const LONG_DATE = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { participant: p } = await requireParticipant();
  const { plan } = await searchParams;
  const supabase = await createClient();
  const week = p.pilot_start ? pilotWeek(p.pilot_start) : 1;
  const today = todayInColombia();
  const [game, habits, checkinRes, replyRes, alertsRes, feedbackRes, pendingDocs, reportRes, docsRes, connsRes, deviceRes] = await Promise.all([
    loadGame(supabase, p.id),
    loadHabits(supabase, p.id),
    supabase.from("checkins").select("id").eq("participant_id", p.id).eq("week", week).maybeSingle(),
    supabase.from("checkin_replies").select("final_text, sent_at").eq("participant_id", p.id).eq("status", "sent").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("alerts").select("level, message, created_at").eq("participant_id", p.id).eq("status", "open").in("level", ["urgency", "consult_soon"]).gte("created_at", weekAgo()).order("created_at", { ascending: false }).limit(5),
    supabase.from("pilot_feedback").select("id").eq("participant_id", p.id).limit(1),
    supabase.from("lab_documents").select("id", { count: "exact", head: true }).eq("participant_id", p.id).in("status", ["uploaded", "extracting"]),
    supabase.from("reports").select("content, approved_at").eq("participant_id", p.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_documents").select("id", { count: "exact", head: true }).eq("participant_id", p.id),
    supabase.from("device_connections").select("id, participant_id, provider, status, last_sync_at").eq("participant_id", p.id),
    supabase.from("measurements").select("type, value, measured_at, source").eq("participant_id", p.id).in("source", ["strava", "apple_health"]).gte("measured_at", `${addDays(today, -14)}T00:00:00-05:00`),
  ]);
  const conns = connsRes.data ?? [];
  const strava = conns.find((c) => c.provider === "strava");
  if (strava && strava.status !== "revoked" && staleSync(strava.last_sync_at)) after(() => syncStrava(createServiceClient(), strava, 3));
  const devices = deviceSummary((deviceRes.data ?? []).map((m) => ({ ...m, value: Number(m.value) })), today, 7);
  const stepsToday = (deviceRes.data ?? []).find((m) => m.type === "steps" && m.measured_at.slice(0, 10) === today)?.value;
  const active = habits.filter((h) => h.status === "active");
  const suggested = habits.filter((h) => h.status === "suggested");
  const doneToday = active.filter((h) => h.logDays.includes(today)).length;
  const report = reportRes.data as { content: ReportContent; approved_at: string } | null;
  const reply = replyRes.data as { final_text: string; sent_at: string } | null;

  return (
    <>
      <PageHeader title="Hoy" subtitle={<span className="capitalize">{LONG_DATE.format(new Date())}</span>} />
      <div className="flex flex-col gap-4">
        <GameCelebration xp={game.xp} level={game.level} title={game.title} achievements={game.achievements.filter((a) => a.unlocked).map((a) => a.title)} />
        <HeroCard game={game} />
        <AlertNotices alerts={(alertsRes.data ?? []).map((a) => ({ level: a.level, message: a.message }))} />
        {plan === "nuevo" ? <Notice tone="good" title="Tu plan está listo">Empieza hoy con estos hábitos. Son pequeños a propósito: lo importante es no fallar dos días seguidos.</Notice> : null}

        {active.length ? (
          <section>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                Tus hábitos · {doneToday} de {active.length} hoy
              </h2>
              <Link href="/app/plan" className="text-sm font-medium text-accent">
                Ajustar mi plan
              </Link>
            </div>
            {p.personal_goal ? <p className="mb-3 text-sm text-muted">Para: «{p.personal_goal}»</p> : null}
            <ul className="flex flex-col gap-3">
              {active.map((h) => (
                <HabitCard key={h.id} habit={h} today={today} />
              ))}
            </ul>
            {suggested.length ? (
              <p className="mt-3 text-sm text-muted">
                Tienes {suggested.length} hábito(s) sugerido(s) para cuando estos sean fáciles.{" "}
                <Link href="/app/plan" className="text-accent underline">
                  Verlos
                </Link>
              </p>
            ) : null}
          </section>
        ) : (
          <Card className="border-accent bg-accent-soft/40">
            <p className="font-serif text-xl font-semibold">Construyamos tus hábitos de longevidad</p>
            <p className="mt-1 text-sm text-muted">
              Responde 8 preguntas de un toque sobre cómo vives hoy y te armamos 3 hábitos pequeños, anclados a tu rutina, que suben de nivel cuando se vuelven fáciles.
            </p>
            <LinkButton href={suggested.length ? "/app/plan" : "/app/empezar"} className="mt-3">
              {suggested.length ? "Elegir mis hábitos" : "Armar mi plan (2 minutos)"}
            </LinkButton>
          </Card>
        )}


        {active.length ? (
          <Card
            title="Misiones de la semana"
            action={
              <Link href="/app/progreso" className="text-sm font-medium text-accent">
                Ver mi progreso
              </Link>
            }
          >
            <QuestList quests={game.quests} />
            <p className="mt-3 text-xs text-muted">Se renuevan cada lunes: cada semana es un nuevo comienzo.</p>
          </Card>
        ) : null}

        {conns.length ? (
          devices ? (
            <Card title="Tus datos de la semana" action={<Link href="/app/conexiones" className="text-sm font-medium text-accent">Dispositivos</Link>}>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Pasos hoy", stepsToday !== undefined ? Number(stepsToday).toLocaleString("es-CO") : "—"],
                  ["Pasos al día", devices.steps_per_day?.toLocaleString("es-CO") ?? "—"],
                  ["Sueño", devices.sleep_hours !== null ? `${devices.sleep_hours.toLocaleString("es-CO")} h` : "—"],
                  ["Ejercicio", devices.exercise_minutes_per_week !== null ? `${devices.exercise_minutes_per_week} min/sem` : "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted">Promedios de los últimos 7 días. Tus hábitos de movimiento se marcan solos con estos datos.</p>
            </Card>
          ) : null
        ) : (
          <Card>
            <p className="font-semibold">¿Usas Strava, Garmin o Apple Watch?</p>
            <p className="mt-1 text-sm text-muted">Conéctalos y tus pasos, sueño y ejercicio llegan solos; tus hábitos de movimiento se marcan sin que hagas nada.</p>
            <LinkButton href="/app/conexiones" variant="secondary" className="mt-3">
              Conectar mis dispositivos
            </LinkButton>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Tu plan de salud" action={report ? <Link href="/app/informes" className="text-sm font-medium text-accent">Ver completo</Link> : null}>
            {report ? (
              <>
                <p className="text-sm font-medium">{report.content.headline}</p>
                <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm">
                  {report.content.priorities.map((x) => (
                    <li key={x.title}>{x.title}</li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted">Actualizado el {fmtDate(report.approved_at)} con tus exámenes.</p>
              </>
            ) : (
              <p className="text-sm text-muted">
                Sube un examen de sangre o un informe de imágenes y en uno o dos minutos te decimos qué significa y qué hacer.
              </p>
            )}
            <LinkButton href="/app/examenes" variant="secondary" className="mt-3">
              {docsRes.count ? "Subir otro examen" : "Subir mi primer examen"}
            </LinkButton>
            {pendingDocs.count ? <p className="mt-2 text-xs text-muted">Analizando {pendingDocs.count} examen(es)…</p> : null}
          </Card>

          <Card title={`Revisión de la semana ${week}`}>
            {checkinRes.data ? (
              reply ? (
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{reply.final_text}</p>
                  <p className="mt-2 text-xs text-muted">{fmtDate(reply.sent_at)}</p>
                </>
              ) : (
                <p className="text-sm text-muted">Recibimos tu revisión de esta semana. Tu respuesta llega en un momento.</p>
              )
            ) : (
              <>
                <p className="text-sm text-muted">Dos minutos: cómo te fue, tus mediciones y qué fue difícil. Recibes una respuesta con un ajuste para la próxima semana.</p>
                <LinkButton href="/app/checkin" variant="secondary" className="mt-3">
                  Hacer mi revisión
                </LinkButton>
              </>
            )}
          </Card>
        </div>

        {week >= 6 && !feedbackRes.data?.length ? <FeedbackCard /> : null}
      </div>
    </>
  );
}
