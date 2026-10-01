import type { GameState, Quest } from "@/domain/game";
import { SHIELD_EVERY } from "@/domain/game";
import { cx } from "./ui";

const fmt = (n: number) => n.toLocaleString("es-CO");

function Bar({ value, tone = "gold", label }: { value: number; tone?: "gold" | "accent"; label: string }) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all duration-700", tone === "gold" ? "bg-gold" : "bg-accent")} style={{ width: `${Math.max(p * 100, p > 0 ? 4 : 0)}%` }} />
    </div>
  );
}

/** Today's habits as a ring that closes when all are done. */
export function DayRing({ done, target, size = 64 }: { done: number; target: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const p = target ? Math.min(1, done / target) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Hoy: ${done} de ${target} hábitos`} role="img">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={p >= 1 ? "var(--gold)" : "var(--accent)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold tabular-nums">
          {done}/{target}
        </span>
        <span className="text-[10px] text-muted">hoy</span>
      </span>
    </div>
  );
}

/** Character card: avatar, level, title, XP to the next level, streak and today's ring. */
export function HeroCard({ game }: { game: GameState }) {
  const s = game.streak;
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm" aria-label="Tu personaje">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bombadil-icon.svg" alt="" width={56} height={56} className="rounded-2xl" />
          <span className="absolute -right-2 -bottom-2 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-gold text-xs font-bold text-text">{game.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">Nivel {game.level}</p>
          <p className="truncate font-serif text-lg leading-tight font-semibold">{game.title}</p>
          <div className="mt-1.5">
            <Bar value={game.levelProgress} label="Experiencia hacia el siguiente nivel" />
            <p className="mt-1 text-[11px] text-muted tabular-nums">
              {fmt(game.xpIntoLevel)} / {fmt(game.xpForNext)} XP para el nivel {game.level + 1}
              {game.today.xp ? <span className="font-semibold text-accent"> · +{game.today.xp} hoy</span> : null}
            </p>
          </div>
        </div>
        <DayRing done={game.today.done} target={Math.max(1, game.today.target)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold", s.current ? "bg-gold-soft" : "bg-surface-2 text-muted")}>
          <span aria-hidden>🔥</span> {s.current} {s.current === 1 ? "día" : "días"} de racha
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1" title={`Ganas un escudo cada ${SHIELD_EVERY} días seguidos. Te cubre un día que falles.`}>
          <span aria-hidden>🛡️</span> {s.shields} {s.shields === 1 ? "escudo" : "escudos"}
        </span>
        {s.current > 0 && !s.activeToday ? <span className="text-xs text-muted">Registra un hábito hoy para mantenerla.</span> : null}
        {!s.current ? <span className="text-xs text-muted">Un hábito hoy, aunque sea la versión mínima, la enciende.</span> : null}
      </div>
    </section>
  );
}

export function QuestList({ quests }: { quests: Quest[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {quests.map((q) => (
        <li key={q.key} className="flex items-center gap-3">
          <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl text-base", q.done ? "bg-gold text-text" : "bg-surface-2")} aria-hidden>
            {q.done ? "✓" : "⚔️"}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cx("text-sm font-medium", q.done && "text-muted line-through")}>{q.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <Bar value={q.current / q.target} tone="accent" label={q.title} />
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {q.current}/{q.target}
              </span>
            </div>
          </div>
          <span className={cx("shrink-0 text-xs font-semibold", q.done ? "text-accent" : "text-muted")}>+{q.xp} XP</span>
        </li>
      ))}
    </ul>
  );
}

export function AttributeGrid({ attributes }: { attributes: GameState["attributes"] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {attributes.map((a) => (
        <li key={a.key} className="rounded-2xl border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              {a.icon}
            </span>
            <p className="flex-1 font-semibold">{a.label}</p>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">Nv. {a.level}</span>
          </div>
          <div className="mt-2">
            <Bar value={a.progress} tone="accent" label={`${a.label}: progreso al siguiente nivel`} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{a.blurb}</p>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

/** 12 weeks of habit days, one column per week (Monday on top). */
export function Heatmap({ cells }: { cells: GameState["heatmap"] }) {
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const shade = (v: number) => (v < 0 ? "bg-transparent" : v === 0 ? "bg-surface-2" : v < 0.34 ? "bg-accent/30" : v < 0.67 ? "bg-accent/60" : "bg-accent");
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <div className="flex flex-col gap-1 pr-1 text-[10px] leading-4 text-muted">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="h-4">
            {d}
          </span>
        ))}
      </div>
      {weeks.map((w) => (
        <div key={w[0].day} className="flex flex-col gap-1">
          {w.map((c) => (
            <span
              key={c.day}
              title={c.value < 0 ? undefined : `${c.day}: ${c.protected ? "cubierto por un escudo" : `${Math.round(c.value * 100)} % de tus hábitos`}`}
              className={cx("flex size-4 items-center justify-center rounded-[4px] text-[9px]", shade(c.value), c.protected && "bg-gold-soft ring-1 ring-gold")}
            >
              {c.protected ? "🛡" : ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AchievementGrid({ achievements }: { achievements: GameState["achievements"] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {achievements.map((a) => (
        <li key={a.key} className={cx("rounded-2xl border p-3 text-center", a.unlocked ? "border-gold bg-gold-soft" : "border-border bg-surface")}>
          <span className={cx("text-3xl", !a.unlocked && "opacity-40 grayscale")} aria-hidden>
            {a.icon}
          </span>
          <p className="mt-1 text-sm font-semibold">{a.title}</p>
          <p className="text-xs text-muted">{a.description}</p>
          {!a.unlocked && a.target > 1 ? (
            <div className="mt-2">
              <Bar value={a.current / a.target} tone="accent" label={a.title} />
              <p className="mt-1 text-[11px] text-muted tabular-nums">
                {a.current}/{a.target}
              </p>
            </div>
          ) : null}
          <p className="sr-only">{a.unlocked ? "Desbloqueada" : "Bloqueada"}</p>
        </li>
      ))}
    </ul>
  );
}
