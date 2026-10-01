import type { Metadata } from "next";
import Link from "next/link";
import { ATTR_STYLE } from "@/components/game";
import { Icon } from "@/components/icons";
import { Card, cx, LinkButton } from "@/components/ui";
import { ATTRIBUTES } from "@/domain/game";
import { todayInColombia } from "@/domain/habits";
import { habitPath, type PathNode } from "@/domain/path";
import { defaultReminderTime } from "@/domain/reminders";
import { setReminderTime } from "@/app/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireParticipant } from "@/lib/auth";
import { loadHabits } from "@/lib/data/habits";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "El camino" };

/** Zig-zag offsets, as in a Duolingo path. */
const OFFSETS = [0, -90, -150, -90, 0, 90, 150, 90];

function Node({ node, offset }: { node: PathNode; offset: number }) {
  const label = (
    <>
      <span className={cx("text-sm font-black", node.kind === "boss" ? "text-[#4b4aa3] dark:text-[#b3b4ee]" : "text-text")}>{node.label}</span>
      {node.detail ? <span className="max-w-56 text-center text-xs font-semibold text-muted">{node.detail}</span> : null}
    </>
  );
  let face: React.ReactNode;
  if (node.kind === "done") {
    face = (
      <span className="flex size-18 items-center justify-center rounded-full border-b-[7px] border-[#a87c18] bg-gold text-[#3b2a05]" title="Semana cumplida">
        <Icon name="check" size={34} strokeWidth={3} />
      </span>
    );
  } else if (node.kind === "missed") {
    face = (
      <span className="flex size-16 items-center justify-center rounded-full border-b-[6px] border-border bg-surface-2 text-muted" title="Esa semana no se cumplió: se vale volver">
        <Icon name="path" size={26} />
      </span>
    );
  } else if (node.kind === "current") {
    const p = node.progress ? Math.min(1, node.progress.done / node.progress.target) : 0;
    const c = 2 * Math.PI * 51;
    face = (
      <>
        <span className="rounded-xl border-2 border-border bg-surface px-3 py-1 text-sm font-black text-accent">
          Esta semana · {node.progress?.done}/{node.progress?.target}
        </span>
        <span className="relative flex size-28 items-center justify-center">
          <svg width="112" height="112" viewBox="0 0 112 112" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="56" cy="56" r="51" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
            <circle cx="56" cy="56" r="51" fill="none" stroke={p >= 1 ? "var(--gold)" : "var(--accent)"} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
          </svg>
          <Link href="/app" aria-label="Ir a los hábitos de hoy" className="flex size-21 items-center justify-center rounded-full border-b-[7px] border-black/25 bg-accent text-white dark:text-bg">
            <Icon name="star" size={36} />
          </Link>
        </span>
      </>
    );
  } else if (node.kind === "milestone") {
    face = (
      <span
        className={cx(
          "flex h-17 w-21 items-center justify-center rounded-2xl border-b-[7px]",
          node.reached ? "border-[#a87c18] bg-gold text-[#3b2a05]" : "border-border bg-surface-2 text-muted",
        )}
      >
        <Icon name="trophy" size={34} strokeWidth={2} />
      </span>
    );
  } else if (node.kind === "levelup") {
    const inner = (
      <span className={cx("flex size-18 items-center justify-center rounded-full border-b-[7px]", node.reached ? "border-black/25 bg-accent text-white dark:text-bg" : "border-border bg-surface-2 text-muted")}>
        <Icon name={node.reached ? "arrowUp" : "lock"} size={30} />
      </span>
    );
    face = node.href ? (
      <Link href={node.href} aria-label="Subir de nivel este hábito">
        {inner}
      </Link>
    ) : (
      inner
    );
  } else {
    face = (
      <Link href={node.href ?? "/app"} aria-label={`${node.label}: ${node.detail ?? ""}`} className="flex size-24 items-center justify-center rounded-3xl border-[3px] border-dashed border-[#4b4aa3] bg-[#ecebf8] text-[#4b4aa3] dark:bg-[#24254a] dark:text-[#b3b4ee]">
        <Icon name="heartPulse" size={44} strokeWidth={2} />
      </Link>
    );
  }
  return (
    <li className="flex flex-col items-center gap-1.5" style={{ transform: `translateX(calc(${offset / 150} * min(150px, 20vw)))` }}>
      {face}
      {label}
    </li>
  );
}

export default async function PathPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { participant: p } = await requireParticipant();
  const { h } = await searchParams;
  const supabase = await createClient();
  const habits = (await loadHabits(supabase, p.id)).filter((x) => x.status === "active");
  const today = todayInColombia();

  if (!habits.length) {
    return (
      <Card>
        <h1 className="font-serif text-3xl font-bold">El camino</h1>
        <p className="mt-2 text-muted">Cada hábito tiene su camino: semanas cumplidas, hitos, el siguiente nivel y una prueba final. Empieza con tu plan.</p>
        <LinkButton href="/app/empezar" className="mt-4">
          Armar mi plan (2 minutos)
        </LinkButton>
      </Card>
    );
  }

  const habit = habits.find((x) => x.id === h) ?? habits[0];
  // The full history of this habit (not just the last weeks) so milestones count right.
  const { data: allLogs } = await supabase.from("habit_logs").select("day").eq("habit_id", habit.id);
  const nodes = habitPath(
    { pillar: habit.pillar, target_per_week: habit.target_per_week, started_on: habit.started_on ?? today, next_step: habit.next_step },
    (allLogs ?? []).map((l) => l.day),
    today,
  );
  const attribute = ATTRIBUTES.find((a) => a.key === habit.pillar)?.label ?? habit.pillar;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Hábitos" className="flex flex-wrap gap-2">
        {habits.map((x) => (
          <Link
            key={x.id}
            href={`/app/camino?h=${x.id}`}
            aria-current={x.id === habit.id ? "true" : undefined}
            className={cx(
              "flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black",
              x.id === habit.id ? "border-accent bg-accent text-white dark:text-bg" : "border-border bg-surface text-text hover:bg-surface-2",
            )}
          >
            <Icon name={x.pillar} size={18} />
            {ATTRIBUTES.find((a) => a.key === x.pillar)?.label ?? x.pillar}
          </Link>
        ))}
        <Link href="/app/plan" className="flex items-center gap-2 rounded-full border-2 border-dashed border-border px-4 py-2 text-sm font-black text-muted hover:bg-surface-2">
          <Icon name="list" size={18} />
          Gestionar hábitos
        </Link>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-b-[6px] border-black/25 bg-accent p-6 text-white dark:text-bg">
        <div className="flex items-center gap-4">
          <span className={cx("flex size-14 items-center justify-center rounded-2xl", ATTR_STYLE[habit.pillar].tile)}>
            <Icon name={habit.pillar} size={30} />
          </span>
          <div>
            <p className="text-sm font-black tracking-wider uppercase opacity-80">
              Nivel {habit.level} · {attribute}
            </p>
            <h1 className="font-serif text-3xl font-bold">{habit.title}</h1>
            <p className="mt-1 font-semibold opacity-90">
              {habit.target_per_week} días por semana{habit.anchor ? ` · ${habit.anchor}` : ""}
            </p>
          </div>
        </div>
        <Link href="/app/plan" className="rounded-2xl border-b-4 border-black/20 bg-white px-4 py-3 text-sm font-black tracking-wide text-[#1c4585] uppercase">
          Ajustar hábito
        </Link>
      </header>

      <form action={setReminderTime} className="flex flex-wrap items-center gap-3 rounded-3xl border-2 border-border bg-surface p-4 text-sm">
        <input type="hidden" name="habit_id" value={habit.id} />
        <Icon name="bell" size={22} className="text-accent" />
        <label htmlFor="reminder_time" className="font-bold">
          Recordarme a las
        </label>
        <input
          id="reminder_time"
          name="reminder_time"
          type="time"
          defaultValue={(habit.reminder_time ?? defaultReminderTime(habit.anchor)).slice(0, 5)}
          className="rounded-xl border-2 border-border bg-surface px-3 py-1.5 font-bold"
        />
        <SubmitButton variant="secondary">Guardar</SubmitButton>
        <Link href="/app/datos" className="text-xs font-bold text-accent underline">
          Activar recordatorios
        </Link>
      </form>

      <ol className="flex flex-col items-center gap-7 overflow-hidden py-4" aria-label={`Camino de ${habit.title}`}>
        {nodes.map((n, i) => (
          <Node key={`${n.kind}-${i}`} node={n} offset={OFFSETS[i % OFFSETS.length]} />
        ))}
      </ol>
      <p className="text-center text-sm text-muted">Cada semana que cumples abre la siguiente. Cuando el hábito se vuelve fácil, sube de nivel; al final te espera una prueba.</p>
    </div>
  );
}
