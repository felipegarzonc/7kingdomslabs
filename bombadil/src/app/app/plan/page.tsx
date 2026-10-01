import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { adherence, MAX_ACTIVE_HABITS, PILLAR_LABEL, todayInColombia } from "@/domain/habits";
import { requireParticipant } from "@/lib/auth";
import { loadHabits, type HabitWithLogs } from "@/lib/data/habits";
import { createClient } from "@/lib/supabase/server";
import { setHabitStatus } from "../habitos/actions";
import { CustomHabitForm, RegeneratePlanForm } from "./forms";

export const metadata: Metadata = { title: "Gestionar hábitos" };
// Regenerating suggestions calls the LLM from this page's server action.
export const maxDuration = 120;

function StatusButton({ habit, status, label, variant = "secondary" }: { habit: HabitWithLogs; status: string; label: string; variant?: "primary" | "secondary" }) {
  return (
    <form action={setHabitStatus}>
      <input type="hidden" name="habit_id" value={habit.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}

function HabitSummary({ habit, children }: { habit: HabitWithLogs; children?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 py-3">
      <div>
        <p className="text-xs text-muted">
          {PILLAR_LABEL[habit.pillar]} · {habit.target_per_week} {habit.target_per_week === 1 ? "día" : "días"} por semana{habit.level > 1 ? ` · nivel ${habit.level}` : ""}
        </p>
        <p className="font-medium">{habit.title}</p>
        {habit.anchor ? <p className="text-sm text-muted">Cuándo: {habit.anchor}</p> : null}
        {habit.tiny ? <p className="text-sm text-muted">Versión mínima: {habit.tiny}</p> : null}
        {habit.why ? <p className="mt-1 text-sm">{habit.why}</p> : null}
        {habit.next_step ? <p className="mt-1 text-xs text-muted">Siguiente nivel: {habit.next_step}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

export default async function PlanPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const habits = await loadHabits(supabase, p.id);
  const today = todayInColombia();
  const active = habits.filter((h) => h.status === "active");
  const suggested = habits.filter((h) => h.status === "suggested");
  const paused = habits.filter((h) => h.status === "paused");

  return (
    <>
      <Link href="/app/camino" className="mb-2 inline-block text-sm font-black tracking-wide text-accent uppercase">
        ← El camino
      </Link>
      <PageHeader
        title="Gestionar hábitos"
        subtitle={p.personal_goal ? `Tu meta: «${p.personal_goal}»` : "Hábitos pequeños, anclados a tu rutina, que suben de nivel cuando se vuelven fáciles."}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <Card title={`Activos (${active.length})`}>
            {active.length ? (
              <ul className="divide-y divide-border">
                {active.map((h) => {
                  const a = h.started_on ? adherence({ target_per_week: h.target_per_week, started_on: h.started_on }, h.logDays, today) : null;
                  return (
                    <HabitSummary key={h.id} habit={h}>
                      {a !== null ? <Badge tone={a >= 0.8 ? "good" : a >= 0.5 ? "info" : "warn"}>Cumplimiento: {Math.round(a * 100)} %</Badge> : null}
                      <StatusButton habit={h} status="paused" label="Pausar" />
                      <StatusButton habit={h} status="archived" label="Quitar" />
                    </HabitSummary>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Aún no tienes hábitos activos.{" "}
                <Link href="/app/empezar" className="text-accent underline">
                  Arma tu plan en 2 minutos
                </Link>
                .
              </p>
            )}
            {active.length > MAX_ACTIVE_HABITS ? (
              <p className="mt-3 text-xs text-warn">Tienes más de {MAX_ACTIVE_HABITS} hábitos activos. Es más fácil sostener pocos a la vez: pausa los que menos te importen hoy.</p>
            ) : null}
          </Card>

          {suggested.length ? (
            <Card title="Sugeridos para después">
              <p className="mb-1 text-sm text-muted">Agrégalos cuando tus hábitos activos se sientan automáticos.</p>
              <ul className="divide-y divide-border">
                {suggested.map((h) => (
                  <HabitSummary key={h.id} habit={h}>
                    <StatusButton habit={h} status="active" label="Empezar este" variant="primary" />
                    <StatusButton habit={h} status="archived" label="No me interesa" />
                  </HabitSummary>
                ))}
              </ul>
            </Card>
          ) : null}

          {paused.length ? (
            <Card title="En pausa">
              <ul className="divide-y divide-border">
                {paused.map((h) => (
                  <HabitSummary key={h.id} habit={h}>
                    <StatusButton habit={h} status="active" label="Retomar" />
                    <StatusButton habit={h} status="archived" label="Quitar" />
                  </HabitSummary>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Nuevas sugerencias">
            <p className="mb-3 text-sm text-muted">Usa tus respuestas, tus exámenes, tus mediciones y tus hábitos actuales.</p>
            <RegeneratePlanForm />
            <Link href="/app/empezar" className="mt-3 inline-block text-sm text-accent underline">
              Actualizar mis respuestas sobre cómo vivo
            </Link>
          </Card>
          <Card title="Crear mi propio hábito">
            <CustomHabitForm />
          </Card>
        </div>
      </div>
    </>
  );
}
