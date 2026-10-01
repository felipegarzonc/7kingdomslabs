import { logHabit, levelUpHabit, shrinkHabit } from "@/app/app/habitos/actions";
import { addDays, PILLAR_LABEL, progression, streak, weekProgress, weekStart } from "@/domain/habits";
import type { HabitWithLogs } from "@/lib/data/habits";
import { SubmitButton } from "./submit-button";
import { Badge } from "./ui";

const DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

/** One active habit on the "Hoy" screen: one tap to log, streak, this week, and the weekly adjustment. */
export function HabitCard({ habit, today }: { habit: HabitWithLogs; today: string }) {
  const started = habit.started_on ?? today;
  const stats = { target_per_week: habit.target_per_week, started_on: started };
  const doneToday = habit.logDays.includes(today);
  const tinyToday = habit.tinyDays.includes(today);
  const week = weekProgress(stats, habit.logDays, today);
  const s = streak(stats, habit.logDays, today);
  const step = progression(stats, habit.logDays, today);
  const ws = weekStart(today);

  return (
    <li className={`rounded-2xl border p-4 ${doneToday ? "border-accent bg-accent-soft/30" : "border-border bg-surface"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">{PILLAR_LABEL[habit.pillar]}{habit.anchor ? ` · ${habit.anchor}` : ""}</p>
          <p className="mt-0.5 font-semibold">{habit.title}</p>
          {habit.tiny && !doneToday ? <p className="mt-0.5 text-xs text-muted">¿Día difícil? Basta con: {habit.tiny}</p> : null}
        </div>
        {s.value > 0 ? <Badge tone="good">🔥 {s.value} {s.unit}</Badge> : null}
      </div>

      <div className="mt-3 flex items-center gap-1.5" aria-label={`Esta semana: ${week.done} de ${week.target}`}>
        {DAY_INITIALS.map((d, i) => {
          const day = addDays(ws, i);
          const done = habit.logDays.includes(day);
          return (
            <span
              key={day}
              title={day}
              className={`flex size-7 items-center justify-center rounded-full text-[11px] ${done ? "bg-accent font-semibold text-bg" : day === today ? "border border-accent" : "bg-surface-2 text-muted"}`}
            >
              {d}
            </span>
          );
        })}
        <span className="ml-2 text-xs text-muted">
          {week.done}/{week.target} esta semana
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {doneToday ? (
          <form action={logHabit}>
            <input type="hidden" name="habit_id" value={habit.id} />
            <input type="hidden" name="mode" value="undo" />
            <SubmitButton variant="secondary">{tinyToday ? "✓ Versión mínima hecha · deshacer" : "✓ Hecho hoy · deshacer"}</SubmitButton>
          </form>
        ) : (
          <>
            <form action={logHabit}>
              <input type="hidden" name="habit_id" value={habit.id} />
              <input type="hidden" name="mode" value="full" />
              <SubmitButton>Lo hice</SubmitButton>
            </form>
            {habit.tiny ? (
              <form action={logHabit}>
                <input type="hidden" name="habit_id" value={habit.id} />
                <input type="hidden" name="mode" value="tiny" />
                <SubmitButton variant="secondary">Hice la versión mínima</SubmitButton>
              </form>
            ) : null}
          </>
        )}
      </div>

      {step === "level_up" && habit.next_step ? (
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
          <p>Llevas dos semanas cumpliéndolo. ¿Subimos de nivel? Siguiente: <span className="font-medium">{habit.next_step}</span></p>
          <form action={levelUpHabit} className="mt-2">
            <input type="hidden" name="habit_id" value={habit.id} />
            <SubmitButton variant="secondary">Subir de nivel</SubmitButton>
          </form>
        </div>
      ) : step === "shrink" ? (
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
          <p>Te ha costado dos semanas seguidas. No es falta de voluntad: el hábito es muy grande. Hagámoslo más pequeño{habit.tiny ? `: «${habit.tiny}»` : ""}.</p>
          <form action={shrinkHabit} className="mt-2">
            <input type="hidden" name="habit_id" value={habit.id} />
            <SubmitButton variant="secondary">Hacerlo más fácil</SubmitButton>
          </form>
        </div>
      ) : null}

      {habit.why ? (
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer">¿Por qué este hábito?</summary>
          <p className="mt-1">{habit.why}</p>
        </details>
      ) : null}
    </li>
  );
}
