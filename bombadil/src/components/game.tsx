import Link from "next/link";
import type { AttributeKey, GameState, Quest } from "@/domain/game";
import { SHIELD_EVERY } from "@/domain/game";
import { Bolt, Flame, HatAvatar, Icon, type IconName, Shield } from "./icons";
import { cx } from "./ui";

const fmt = (n: number) => n.toLocaleString("es-CO");

/** Light tile + ink per attribute, readable in both themes. */
export const ATTR_STYLE: Record<AttributeKey, { tile: string; bar: string }> = {
  movimiento: { tile: "bg-[#e4ecf8] text-[#1c4585] dark:bg-[#1c2c47] dark:text-[#8fb4ec]", bar: "bg-[#2457a6] dark:bg-[#8fb4ec]" },
  fuerza: { tile: "bg-[#fdecdc] text-[#9a4a0b] dark:bg-[#3a2616] dark:text-[#f3b07a]", bar: "bg-[#b45309] dark:bg-[#f3b07a]" },
  sueno: { tile: "bg-[#ecebf8] text-[#4b4aa3] dark:bg-[#24254a] dark:text-[#b3b4ee]", bar: "bg-[#4b4aa3] dark:bg-[#b3b4ee]" },
  nutricion: { tile: "bg-[#e2f3ea] text-[#1f7a4d] dark:bg-[#173327] dark:text-[#86d3a9]", bar: "bg-[#1f7a4d] dark:bg-[#86d3a9]" },
  estres: { tile: "bg-[#e6f1f6] text-[#1d6a86] dark:bg-[#16303a] dark:text-[#8cc8de]", bar: "bg-[#1d6a86] dark:bg-[#8cc8de]" },
  conexion: { tile: "bg-[#fde8ef] text-[#a3245a] dark:bg-[#3a1a27] dark:text-[#f19bbd]", bar: "bg-[#a3245a] dark:bg-[#f19bbd]" },
  sustancias: { tile: "bg-surface-2 text-[#3d4a63] dark:text-[#b8c2d4]", bar: "bg-[#3d4a63] dark:bg-[#b8c2d4]" },
  sabiduria: { tile: "bg-gold-soft text-[#8a6510] dark:text-gold", bar: "bg-gold" },
};

export function Bar({ value, tone = "gold", label, className }: { value: number; tone?: "gold" | "accent" | string; label: string; className?: string }) {
  const p = Math.max(0, Math.min(1, value));
  const fill = tone === "gold" ? "bg-gold" : tone === "accent" ? "bg-accent" : tone;
  return (
    <div className={cx("h-3 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-label={label} aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all duration-700", fill)} style={{ width: `${Math.max(p * 100, p > 0 ? 4 : 0)}%` }} />
    </div>
  );
}

/** Today's habits as a ring that closes (in gold) when all are done. */
export function DayRing({ done, target, size = 104, onDark = false }: { done: number; target: number; size?: number; onDark?: boolean }) {
  const stroke = size > 80 ? 11 : 8;
  const r = size / 2 - stroke / 2 - 2;
  const c = 2 * Math.PI * r;
  const p = target ? Math.min(1, done / target) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Hoy: ${done} de ${target} hábitos`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={onDark ? "rgba(0,0,0,.22)" : "var(--surface-2)"} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={p >= 1 ? "var(--gold)" : onDark ? "#9cc0f2" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-2xl font-black tabular-nums">
          {done}/{target}
        </span>
        <span className={cx("mt-1 text-xs", onDark ? "text-white/80" : "text-muted")}>hoy</span>
      </span>
    </div>
  );
}

/** Streak · shields · XP, always visible in the right column. */
export function StatCounters({ game, sober = false }: { game: GameState; sober?: boolean }) {
  const s = game.streak;
  return (
    <div className="flex items-center justify-between gap-3 px-2 text-base font-black">
      <span className="flex items-center gap-1.5 text-[#c2410c] dark:text-[#fb923c]" title="Días seguidos con al menos un hábito">
        <Flame size={26} />
        <span>
          {s.current} <span className="sr-only">{s.current === 1 ? "día de racha" : "días de racha"}</span>
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-accent" title={`Escudos: cubren un día que falles. Ganas uno cada ${SHIELD_EVERY} días seguidos.`}>
        <Shield size={24} />
        {s.shields} <span className="sr-only">escudos</span>
      </span>
      {sober ? null : (
        <span className="flex items-center gap-1.5 text-[#8a6510] dark:text-gold" title="Experiencia total">
          <Bolt size={24} />
          {fmt(game.xp)} <span className="sr-only">XP</span>
        </span>
      )}
    </div>
  );
}

export function LevelCard({ game }: { game: GameState }) {
  return (
    <section className="rounded-3xl border-2 border-border bg-surface p-5" aria-label="Tu nivel">
      <div className="flex items-center gap-4">
        <HatAvatar size={60} level={game.level} />
        <div className="min-w-0">
          <p className="text-xs font-black tracking-wider text-muted uppercase">Nivel {game.level}</p>
          <p className="truncate font-serif text-xl font-semibold">{game.title}</p>
        </div>
      </div>
      <Bar value={game.levelProgress} label="Experiencia hacia el siguiente nivel" className="mt-4 h-3.5" />
      <p className="mt-1.5 text-sm font-bold text-muted tabular-nums">
        {fmt(game.xpIntoLevel)} / {fmt(game.xpForNext)} XP para el nivel {game.level + 1}
        {game.today.xp ? <span className="text-accent"> · +{game.today.xp} hoy</span> : null}
      </p>
    </section>
  );
}

export function QuestList({ quests, compact = false, sober = false }: { quests: Quest[]; compact?: boolean; sober?: boolean }) {
  return (
    <ul className={cx("flex flex-col", compact ? "gap-3.5" : "gap-5")}>
      {quests.map((q) => (
        <li key={q.key} className="flex items-center gap-3">
          {!compact ? (
            <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-2xl", q.done ? "bg-gold text-[#3b2a05]" : "bg-accent-soft text-accent")}>
              <Icon name={q.done ? "check" : "swords"} size={24} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className={cx("font-bold", compact ? "text-sm" : "text-base")}>{q.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Bar value={q.current / q.target} tone={q.done ? "gold" : "accent"} label={q.title} />
              <span className="shrink-0 text-xs font-black text-muted tabular-nums">
                {q.current}/{q.target}
              </span>
            </div>
          </div>
          <span
            hidden={sober}
            className={cx("flex h-10 w-11 shrink-0 items-center justify-center rounded-xl", q.done ? "bg-gold text-[#3b2a05]" : "bg-surface-2 text-muted")}
            title={q.done ? `Ganaste ${q.xp} XP` : `Recompensa: ${q.xp} XP`}
          >
            <Icon name="chest" size={22} strokeWidth={2} />
            <span className="sr-only">{q.done ? `Ganaste ${q.xp} XP` : `Recompensa: ${q.xp} XP`}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Right column: counters, level and this week's quests. */
export function GameRail({ game, sober = false }: { game: GameState; sober?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <StatCounters game={game} sober={sober} />
      {sober ? null : <LevelCard game={game} />}
      <section className="rounded-3xl border-2 border-border bg-surface p-5" aria-label="Misiones de la semana">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-black">Misiones de la semana</h2>
          <Link href="/app/misiones" className="text-xs font-black tracking-wider text-accent uppercase">
            Ver todas
          </Link>
        </div>
        <QuestList quests={game.quests} compact sober={sober} />
      </section>
    </div>
  );
}

export function AttributeList({ attributes }: { attributes: GameState["attributes"] }) {
  return (
    <ul className="flex flex-col gap-3">
      {attributes.map((a) => (
        <li key={a.key} className="flex items-center gap-3" title={a.blurb}>
          <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-xl", ATTR_STYLE[a.key].tile)}>
            <Icon name={a.key as IconName} size={22} />
          </span>
          <span className="w-28 shrink-0 font-bold">{a.label}</span>
          <Bar value={a.progress} tone={ATTR_STYLE[a.key].bar} label={`${a.label}: progreso al siguiente nivel`} />
          <span className="w-12 shrink-0 text-right text-sm font-black text-muted">Nv. {a.level}</span>
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
      <div className="flex flex-col gap-1 pr-1 text-[10px] leading-4 font-bold text-muted">
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
              className={cx("size-4 rounded-[4px]", c.protected ? "bg-gold" : shade(c.value))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const ACH_ICON: Record<string, IconName | "flame"> = {
  primer_paso: "steps",
  racha_3: "flame",
  racha_7: "flame",
  racha_30: "flame",
  semana: "calendar",
  tres_de_tres: "trophy",
  nunca_cero: "sprout",
  conocete: "flask",
  revision: "compass",
  conectado: "watch",
  automatico: "bolt",
  nivel_5: "star",
  mision: "target",
};

export function AchievementGrid({ achievements }: { achievements: GameState["achievements"] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
      {achievements.map((a) => {
        const icon = ACH_ICON[a.key] ?? "star";
        return (
          <li key={a.key} className="flex flex-col items-center gap-1.5 text-center" title={a.description}>
            <span
              className={cx(
                "flex size-18 items-center justify-center rounded-2xl border-b-[5px]",
                a.unlocked ? "border-gold bg-gold-soft text-[#8a6510] dark:text-gold" : "border-border bg-surface-2 text-muted",
              )}
            >
              {icon === "flame" ? <span className={a.unlocked ? "" : "opacity-40 grayscale"}><Flame size={34} /></span> : <Icon name={icon} size={32} />}
            </span>
            <span className={cx("text-sm leading-tight font-black", !a.unlocked && "text-muted")}>{a.title}</span>
            <span className="text-xs text-muted">{a.unlocked ? "Desbloqueada" : a.target > 1 ? `${a.current}/${a.target}` : a.description}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** This week, Monday first: gold = active, shield = covered, outlined = today. */
export function WeekDots({ cells, today, onDark = false }: { cells: GameState["heatmap"]; today: string; onDark?: boolean }) {
  const week = cells.slice(-7);
  return (
    <div className="flex gap-2" aria-label="Tu semana">
      {week.map((c, i) => (
        <span
          key={c.day}
          title={c.day}
          className={cx(
            "flex size-10 items-center justify-center rounded-full text-sm font-black",
            c.protected ? "bg-accent-soft text-accent" : c.value > 0 ? "bg-gold text-[#3b2a05]" : onDark ? "bg-white/15 text-white/80" : "bg-surface-2 text-muted",
            c.day === today && "ring-[3px] ring-white",
          )}
        >
          {c.protected ? <Shield size={18} /> : WEEKDAYS[i]}
        </span>
      ))}
    </div>
  );
}
