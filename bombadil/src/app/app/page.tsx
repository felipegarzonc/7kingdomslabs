import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { AlertNotices } from "@/components/alert-list";
import { fmtDate } from "@/components/format";
import { DayRing } from "@/components/game";
import { Icon } from "@/components/icons";
import { HabitCard } from "@/components/habit-card";
import { Card, LinkButton, Notice } from "@/components/ui";
import { addDays, todayInColombia } from "@/domain/habits";
import { dayInColombia } from "@/domain/game";
import { nextExamDue } from "@/domain/path";
import { deviceSummary } from "@/domain/wearables";
import { pilotWeek } from "@/domain/pilot";
import { requireParticipant } from "@/lib/auth";
import { getGame } from "@/lib/data/game";
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
    getGame(p.id),
    loadHabits(supabase, p.id),
    supabase.from("checkins").select("id").eq("participant_id", p.id).eq("week", week).maybeSingle(),
    supabase.from("checkin_replies").select("final_text, sent_at").eq("participant_id", p.id).eq("status", "sent").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("alerts").select("level, message, created_at").eq("participant_id", p.id).eq("status", "open").in("level", ["urgency", "consult_soon"]).gte("created_at", weekAgo()).order("created_at", { ascending: false }).limit(5),
    supabase.from("pilot_feedback").select("id").eq("participant_id", p.id).limit(1),
    supabase.from("lab_documents").select("id", { count: "exact", head: true }).eq("participant_id", p.id).in("status", ["uploaded", "extracting"]),
    supabase.from("reports").select("content, approved_at").eq("participant_id", p.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_documents").select("created_at", { count: "exact" }).eq("participant_id", p.id).order("created_at", { ascending: false }).limit(1),
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
  const allDone = active.length > 0 && doneToday === active.length;
  const report = reportRes.data as { content: ReportContent; approved_at: string } | null;
  const reply = replyRes.data as { final_text: string; sent_at: string } | null;
  const lastExam = docsRes.data?.[0]?.created_at ? dayInColombia(docsRes.data[0].created_at) : null;
  const exam = nextExamDue(lastExam, today);
  const firstName = p.display_name?.split(" ")[0];
  const headline = !active.length
    ? "Arma tu plan y empieza a sumar experiencia hoy."
    : allDone
      ? "Cerraste el anillo. Tu racha sigue viva."
      : `Te ${active.length - doneToday === 1 ? "falta 1 hábito" : `faltan ${active.length - doneToday} hábitos`} para cerrar el anillo. La versión mínima también cuenta.`;

  const tiles: Array<{ label: string; value: string; hint: string; href?: string }> = [];
  if (devices) {
    tiles.push({ label: "Pasos hoy", value: stepsToday !== undefined ? Number(stepsToday).toLocaleString("es-CO") : "—", hint: devices.steps_per_day ? `Promedio: ${devices.steps_per_day.toLocaleString("es-CO")}` : "Sin datos de pasos" });
    tiles.push({ label: "Sueño", value: devices.sleep_hours !== null ? `${devices.sleep_hours.toLocaleString("es-CO")} h` : "—", hint: "Promedio de 7 noches" });
    tiles.push({ label: "Ejercicio", value: devices.exercise_minutes_per_week !== null ? `${devices.exercise_minutes_per_week} min` : "—", hint: "Por semana" });
  }
  tiles.push(
    exam
      ? { label: "Próximo jefe", value: exam.daysLeft > 0 ? `En ${exam.daysLeft} días` : "¡Ya toca!", hint: "Examen de control", href: "/app/misiones" }
      : { label: "Próximo jefe", value: "Tu primer examen", hint: "Súbelo y lo explicamos", href: "/app/examenes" },
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-5 rounded-3xl border-b-[6px] border-black/25 bg-accent p-6 text-white sm:p-7 dark:text-bg">
        <div className="min-w-60 flex-1">
          <p className="text-sm font-black tracking-wider uppercase opacity-80">{LONG_DATE.format(new Date())}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{firstName ? `Hola, ${firstName}` : "Hoy"}</h1>
          <p className="mt-2 text-base font-semibold opacity-90">{headline}</p>
        </div>
        {active.length ? <DayRing done={doneToday} target={active.length} onDark /> : null}
      </header>

      {allDone ? (
        <Link
          href="/app/celebracion"
          className="flex items-center gap-3 rounded-2xl border-2 border-b-[5px] border-gold bg-gold-soft px-5 py-4 font-black text-[#3b2a05] dark:text-gold"
        >
          <Icon name="star" size={28} />
          <span className="flex-1">Día completo: tu racha va en {game.streak.current} {game.streak.current === 1 ? "día" : "días"}.</span>
          <span className="text-sm tracking-wider uppercase">Celebrar</span>
        </Link>
      ) : null}

      <AlertNotices alerts={(alertsRes.data ?? []).map((a) => ({ level: a.level, message: a.message }))} />
      {plan === "nuevo" ? <Notice tone="good" title="Tu plan está listo">Empieza hoy con estos hábitos. Son pequeños a propósito: lo importante es no fallar dos días seguidos.</Notice> : null}

      {active.length ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl font-bold">Tus hábitos de hoy</h2>
            <div className="flex gap-4 text-sm font-black tracking-wide uppercase">
              <Link href="/app/camino" className="text-accent">
                Ver el camino
              </Link>
              <Link href="/app/plan" className="text-accent">
                Ajustar mi plan
              </Link>
            </div>
          </div>
          {p.personal_goal ? <p className="-mt-2 text-sm font-semibold text-muted">Rumbo a: «{p.personal_goal}»</p> : null}
          <ul className="flex flex-col gap-4">
            {active.map((h) => (
              <HabitCard key={h.id} habit={h} today={today} />
            ))}
          </ul>
          {suggested.length ? (
            <p className="text-sm text-muted">
              Tienes {suggested.length} hábito(s) sugerido(s) para cuando estos sean fáciles.{" "}
              <Link href="/app/plan" className="font-bold text-accent underline">
                Verlos
              </Link>
            </p>
          ) : null}
        </section>
      ) : (
        <Card className="border-accent/50 bg-accent-soft/40">
          <p className="font-serif text-2xl font-bold">Construyamos tus hábitos de longevidad</p>
          <p className="mt-1 text-muted">
            Responde 8 preguntas de un toque sobre cómo vives hoy y te armamos 3 hábitos pequeños, anclados a tu rutina, que suben de nivel cuando se vuelven fáciles.
          </p>
          <LinkButton href={suggested.length ? "/app/plan" : "/app/empezar"} className="mt-4">
            {suggested.length ? "Elegir mis hábitos" : "Armar mi plan (2 minutos)"}
          </LinkButton>
        </Card>
      )}

      {devices || !conns.length ? (
        <section aria-label={devices ? "Tus datos de la semana" : "Tus datos"}>
          {devices ? <h2 className="mb-3 text-lg font-black">Tus datos de la semana</h2> : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            {tiles.map((t) => {
              const inner = (
                <>
                  <p className="text-xs font-black tracking-wider text-muted uppercase">{t.label}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums">{t.value}</p>
                  <p className="text-sm font-semibold text-muted">{t.hint}</p>
                </>
              );
              return t.href ? (
                <Link key={t.label} href={t.href} className="rounded-3xl border-2 border-b-4 border-border bg-surface p-4 hover:bg-surface-2">
                  {inner}
                </Link>
              ) : (
                <div key={t.label} className="rounded-3xl border-2 border-border bg-surface p-4">
                  {inner}
                </div>
              );
            })}
          </div>
          {!conns.length ? (
            <Link href="/app/conexiones" className="mt-3 flex items-center gap-3 rounded-3xl border-2 border-dashed border-border p-4 font-bold text-muted hover:bg-surface-2">
              <Icon name="watch" size={26} />
              <span className="flex-1">¿Usas Strava, Garmin o Apple Watch? Conéctalos y tus hábitos de movimiento se marcan solos.</span>
              <span className="text-sm font-black tracking-wide text-accent uppercase">Conectar</span>
            </Link>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tu plan de salud" action={report ? <Link href="/app/informes" className="text-sm font-bold text-accent">Ver completo</Link> : null}>
          {report ? (
            <>
              <p className="font-semibold">{report.content.headline}</p>
              <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm">
                {report.content.priorities.map((x) => (
                  <li key={x.title}>{x.title}</li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted">Actualizado el {fmtDate(report.approved_at)} con tus exámenes.</p>
            </>
          ) : (
            <p className="text-sm text-muted">Sube un examen de sangre o un informe de imágenes y en uno o dos minutos te decimos qué significa y qué hacer.</p>
          )}
          <LinkButton href="/app/examenes" variant="secondary" className="mt-4">
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
              <p className="text-sm text-muted">Dos minutos: cómo te fue, tus mediciones y qué fue difícil. Recibes una respuesta con un ajuste para la próxima semana. Vale una misión.</p>
              <LinkButton href="/app/checkin" variant="secondary" className="mt-4">
                Hacer mi revisión
              </LinkButton>
            </>
          )}
        </Card>
      </div>

      {week >= 6 && !feedbackRes.data?.length ? <FeedbackCard /> : null}
    </div>
  );
}
