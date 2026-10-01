import { logHabit, levelUpHabit, shrinkHabit } from "@/app/app/habitos/actions";
import { SOURCE_LABEL } from "@/domain/wearables";
import { ATTRIBUTES, XP } from "@/domain/game";
import { addDays, progression, streak, weekProgress, weekStart } from "@/domain/habits";
import type { HabitWithLogs } from "@/lib/data/habits";
import { ATTR_STYLE } from "./game";
import { Flame, Icon } from "./icons";
import { SubmitButton } from "./submit-button";
import { cx } from "./ui";

const DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

/** One active habit on the "Hoy" screen: one tap to log, streak, this week, and the weekly adjustment. */
export function HabitCard({ habit, today, sober = false }: { habit: HabitWithLogs; today: string; sober?: boolean }) {
  const started = habit.started_on ?? today;
  const stats = { target_per_week: habit.target_per_week, started_on: started };
  const doneToday = habit.logDays.includes(today);
  const tinyToday = habit.tinyDays.includes(today);
  const week = weekProgress(stats, habit.logDays, today);
  const s = streak(stats, habit.logDays, today);
  const step = progression(stats, habit.logDays, today);
  const ws = weekStart(today);
  const attribute = ATTRIBUTES.find((a) => a.key === habit.pillar)?.label ?? habit.pillar;

  return (
    <li className={cx("rounded-3xl border-2 border-b-[5px] bg-surface p-5", doneToday ? "border-gold" : "border-border")}>
      <div className="flex items-start gap-4">
        <span className={cx("flex size-14 shrink-0 items-center justify-center rounded-2xl", ATTR_STYLE[habit.pillar].tile)}>
          <Icon name={habit.pillar} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-muted">
            {attribute}
            {habit.anchor ? ` · ${habit.anchor}` : ""}
            {habit.source === "own" ? <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-black text-accent-strong">Ya lo hacías</span> : null}
          </p>
          <p className="mt-0.5 text-lg leading-snug font-black">{habit.title}</p>
          {habit.tiny && !doneToday ? <p className="mt-0.5 text-sm text-muted">¿Día difícil? Basta con: {habit.tiny}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {sober ? null : <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-black text-[#8a6510] dark:text-gold">+{XP.habitFull} XP</span>}
          {s.value > 0 ? (
            <span className="flex items-center gap-1 text-xs font-black text-[#c2410c] dark:text-[#fb923c]" title="Racha de este hábito">
              <Flame size={16} /> {s.value} {s.unit}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={`Esta semana: ${week.done} de ${week.target}`}>
        {DAY_INITIALS.map((d, i) => {
          const day = addDays(ws, i);
          const done = habit.logDays.includes(day);
          return (
            <span
              key={day}
              title={day}
              className={cx(
                "flex size-8 items-center justify-center rounded-full text-xs font-black",
                done ? "bg-accent text-white dark:text-bg" : day === today ? "border-2 border-accent text-accent" : "bg-surface-2 text-muted",
              )}
            >
              {d}
            </span>
          );
        })}
        <span className="ml-2 text-sm font-bold text-muted">
          {week.done}/{week.target} esta semana
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {doneToday ? (
          <>
            <form action={logHabit}>
              <input type="hidden" name="habit_id" value={habit.id} />
              <input type="hidden" name="mode" value="undo" />
              <SubmitButton variant="secondary" className="min-h-12 border-gold bg-gold-soft text-[#5c4108] dark:text-gold">
                {tinyToday ? "✓ Versión mínima hecha · deshacer" : "✓ Hecho hoy · deshacer"}
              </SubmitButton>
            </form>
            {habit.autoDays[today] ? <p className="self-center text-xs text-muted">Registrado con {SOURCE_LABEL[habit.autoDays[today]] ?? habit.autoDays[today]}</p> : null}
          </>
        ) : (
          <>
            <form action={logHabit}>
              <input type="hidden" name="habit_id" value={habit.id} />
              <input type="hidden" name="mode" value="full" />
              <SubmitButton className="min-h-12 px-6 text-base">Lo hice</SubmitButton>
            </form>
            {habit.tiny ? (
              <form action={logHabit}>
                <input type="hidden" name="habit_id" value={habit.id} />
                <input type="hidden" name="mode" value="tiny" />
                <SubmitButton variant="secondary" className="min-h-12">
                  Hice la versión mínima{sober ? "" : ` (+${XP.habitTiny})`}
                </SubmitButton>
              </form>
            ) : null}
          </>
        )}
      </div>

      {step === "level_up" && habit.next_step ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gold-soft p-4 text-sm">
          <Icon name="arrowUp" size={24} className="text-[#8a6510] dark:text-gold" />
          <p className="min-w-48 flex-1">Llevas dos semanas cumpliéndolo. ¿Subimos de nivel? Siguiente: <span className="font-medium">{habit.next_step}</span></p>
          <form action={levelUpHabit}>
            <input type="hidden" name="habit_id" value={habit.id} />
            <SubmitButton variant="secondary">Subir de nivel</SubmitButton>
          </form>
        </div>
      ) : step === "shrink" ? (
        <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm">
          <p>Te ha costado dos semanas seguidas. No es falta de voluntad: el hábito es muy grande. Hagámoslo más pequeño{habit.tiny ? `: «${habit.tiny}»` : ""}.</p>
          <form action={shrinkHabit} className="mt-2">
            <input type="hidden" name="habit_id" value={habit.id} />
            <SubmitButton variant="secondary">Hacerlo más fácil</SubmitButton>
          </form>
        </div>
      ) : null}

      {habit.why ? (
        <details className="mt-3 text-sm text-muted">
          <summary className="cursor-pointer font-bold">¿Por qué este hábito?</summary>
          <p className="mt-1">{habit.why}</p>
        </details>
      ) : null}
    </li>
  );
}
