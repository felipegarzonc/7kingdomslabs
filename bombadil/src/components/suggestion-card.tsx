import { acceptSuggestion, declineSuggestion } from "@/app/app/habitos/actions";
import { ATTRIBUTES } from "@/domain/game";
import type { HabitWithLogs } from "@/lib/data/habits";
import { ATTR_STYLE } from "./game";
import { Icon } from "./icons";
import { SubmitButton } from "./submit-button";
import { cx } from "./ui";

/** A suggestion the person can try or decline. Nothing starts on its own. */
export function SuggestionCard({ habit, replaces }: { habit: HabitWithLogs; replaces?: HabitWithLogs }) {
  const attribute = ATTRIBUTES.find((a) => a.key === habit.pillar)?.label ?? habit.pillar;
  return (
    <li className="rounded-3xl border-2 border-dashed border-accent/50 bg-surface p-5">
      <div className="flex items-start gap-4">
        <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-2xl", ATTR_STYLE[habit.pillar].tile)}>
          <Icon name={habit.pillar} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-muted">
            {replaces ? `Mejora de «${replaces.title}»` : `Nuevo · ${attribute}`}
            {habit.anchor ? ` · ${habit.anchor}` : ""}
          </p>
          <p className="mt-0.5 text-lg leading-snug font-black">{habit.title}</p>
          <p className="text-sm text-muted">
            {habit.target_per_week} {habit.target_per_week === 1 ? "día" : "días"} por semana{habit.tiny ? ` · en un mal día: ${habit.tiny}` : ""}
          </p>
          {habit.why ? <p className="mt-2 text-sm">{habit.why}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={acceptSuggestion}>
          <input type="hidden" name="habit_id" value={habit.id} />
          <SubmitButton className="min-h-11">{replaces ? "Probar la mejora" : "Probar"}</SubmitButton>
        </form>
        <form action={declineSuggestion}>
          <input type="hidden" name="habit_id" value={habit.id} />
          <SubmitButton variant="secondary" className="min-h-11">
            Ahora no
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}
