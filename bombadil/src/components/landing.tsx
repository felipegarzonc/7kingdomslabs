import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Bolt, Flame, HatAvatar, Icon, type IconName, Shield } from "@/components/icons";
import { buttonClass, cx, LinkButton } from "@/components/ui";
import { OPERATOR } from "@/content/legal";

const JOIN = `mailto:${OPERATOR.email}?subject=${encodeURIComponent("Quiero participar en el piloto de Bombadil")}`;

/** Hover lift for playful tiles; no movement for people who ask for less motion. */
const LIFT = "transition duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

// ─── Content ────────────────────────────────────────────────────────────────

const STEPS: Array<{ n: string; title: string; body: string; icon: IconName; tile: string }> = [
  {
    n: "1",
    title: "Cuéntanos cómo vives",
    body: "Ocho preguntas de un toque sobre movimiento, sueño, comida, alcohol y estrés. Dos minutos.",
    icon: "compass",
    tile: "bg-accent text-white",
  },
  {
    n: "2",
    title: "Trae tus datos",
    body: "Sube tus exámenes y conecta tu reloj. Nada de digitar valores: Bombadil los lee por ti.",
    icon: "flask",
    tile: "bg-gold text-[#1b2433]",
  },
  {
    n: "3",
    title: "Juega tu día",
    body: "Tres hábitos pequeños anclados a tu rutina. Si se vuelven fáciles, suben; si cuestan, se encogen.",
    icon: "swords",
    tile: "bg-[#2f9e6e] text-white",
  },
];

const ATTRS: Array<{ label: string; icon: IconName; blurb: string; tone: string; chip: string }> = [
  { label: "Resistencia", icon: "movimiento", blurb: "Corazón y pulmones en forma", tone: "bg-accent-soft text-accent-strong", chip: "bg-accent text-white" },
  { label: "Fuerza", icon: "fuerza", blurb: "Músculo para tus 80", tone: "bg-[#fde7dc] text-[#9a3b12]", chip: "bg-[#e8693a] text-white" },
  { label: "Descanso", icon: "sueno", blurb: "Siete a ocho horas", tone: "bg-info-soft text-info", chip: "bg-info text-white" },
  { label: "Nutrición", icon: "nutricion", blurb: "Más plantas, menos ultraprocesados", tone: "bg-[#e0f3e8] text-[#1d6b47]", chip: "bg-[#2f9e6e] text-white" },
  { label: "Calma", icon: "estres", blurb: "Estrés bajo control", tone: "bg-[#dcf1f4] text-[#14606b]", chip: "bg-[#1f8a99] text-white" },
  { label: "Vínculos", icon: "conexion", blurb: "Gente que te cuida", tone: "bg-[#fbe3ec] text-[#8f2453]", chip: "bg-[#d0457f] text-white" },
  { label: "Templanza", icon: "sustancias", blurb: "Menos alcohol, cero humo", tone: "bg-gold-soft text-[#7a5a0c]", chip: "bg-gold text-[#1b2433]" },
  { label: "Sabiduría", icon: "sabiduria", blurb: "Conocerte con datos", tone: "bg-surface-2 text-text", chip: "bg-[#1b2433] text-white" },
];

const TITLES = ["Aprendiz del bosque", "Caminante", "Explorador", "Rastreador", "Guardián del sendero", "Custodio del bosque", "Sabio del bosque", "Leyenda de la longevidad"];

const DEVICES = ["Strava", "Apple Salud", "Garmin", "Apple Watch", "Polar", "Coros", "Suunto"];

const LEVERS = ["Capacidad cardiorrespiratoria", "Fuerza muscular", "Sueño de 7 a 8 horas", "Presión arterial", "ApoB y colesterol", "Glucosa e hígado", "No fumar", "Poco alcohol"];

const MYTHS = ["Suplementos milagro", "“Edad biológica” mágica", "Dietas de moda"];

// ─── Small pieces ───────────────────────────────────────────────────────────

/** The daily ring: closes in gold when the day's habits are done. */
function Ring({ value, size = 64, children }: { value: number; size?: number; children?: ReactNode }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--gold-soft)" strokeWidth="9" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--gold)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-black tracking-[0.14em] uppercase", className)}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: ReactNode; body?: ReactNode; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow className={light ? "text-gold" : "text-accent"}>{eyebrow}</Eyebrow>
      <h2 className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body ? <p className={cx("mt-3 text-base font-semibold sm:text-lg", light ? "text-white/80" : "text-muted")}>{body}</p> : null}
    </div>
  );
}

/** Hand-drawn gold underline under the hero's key words. */
function Squiggle() {
  return (
    <svg viewBox="0 0 220 18" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-2 left-0 h-3 w-full sm:h-4">
      <path d="M3 12c30-8 55-8 80-2s50 6 75-1 40-7 59-2" fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Hero mock: the game screen in miniature ────────────────────────────────

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Soft shapes behind the card */}
      <div aria-hidden className="absolute -top-6 right-2 size-40 rounded-full bg-gold-soft sm:-right-6 sm:size-52" />
      <div aria-hidden className="absolute bottom-6 -left-2 size-28 rounded-[2rem] bg-accent-soft sm:-left-8 sm:size-36" />

      <div className="relative rotate-0 rounded-[2rem] border-2 border-border border-b-[6px] bg-surface p-4 shadow-2xl shadow-accent/15 sm:rotate-1 sm:p-5">
        {/* Character */}
        <div className="flex items-center gap-4">
          <HatAvatar size={56} level={5} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">Rastreador</p>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-[48%] rounded-full bg-gold" />
            </div>
            <p className="mt-1 text-[11px] font-bold text-muted">240 / 500 XP para el nivel 6</p>
          </div>
        </div>

        {/* Counters */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: <Flame size={20} />, value: "23", label: "días" },
            { icon: <Shield size={20} />, value: "2", label: "escudos" },
            { icon: <Bolt size={20} />, value: "+30", label: "XP hoy" },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-border px-2 py-2">
              {s.icon}
              <span className="text-sm font-black tabular-nums">{s.value}</span>
              <span className="hidden text-[11px] font-bold text-muted min-[400px]:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Habits */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <Ring value={0.67} size={52}>
            <span className="text-xs font-black">2/3</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-sm font-black">Tu día</p>
            <p className="text-xs font-semibold text-muted">Uno más y el anillo se cierra en dorado</p>
          </div>
        </div>

        <ul className="mt-3 flex flex-col gap-2.5">
          <li className="flex items-center gap-3 rounded-2xl border-2 border-accent/30 bg-accent-soft/60 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Icon name="movimiento" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-muted">Después de almorzar</p>
              <p className="truncate text-sm font-black">Camina 15 minutos</p>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold text-[#1b2433]">
              <Icon name="check" size={18} strokeWidth={3} />
            </span>
          </li>
          <li className="rounded-2xl border-2 border-border p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
                <Icon name="sueno" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-muted">Después de cepillarte en la noche</p>
                <p className="truncate text-sm font-black">Celular fuera del cuarto</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={buttonClass("primary", "min-h-10 flex-1")}>Lo hice</span>
              <span className={buttonClass("secondary", "min-h-10 px-3 text-xs")}>Versión mínima</span>
            </div>
          </li>
        </ul>
      </div>

      {/* Floating rewards */}
      <span className="absolute -top-3 left-3 flex animate-bounce items-center gap-1 rounded-full border-2 border-[#8a6510]/30 border-b-4 bg-gold px-3 py-1 text-sm font-black text-[#1b2433] shadow-lg motion-reduce:animate-none sm:-left-6">
        <Icon name="star" size={14} strokeWidth={3} /> +10 XP
      </span>
      <span className="absolute right-3 -bottom-4 flex items-center gap-1.5 rounded-full border-2 border-border border-b-4 bg-surface px-3 py-1.5 text-xs font-black shadow-lg sm:-right-6">
        <Shield size={16} /> Escudo ganado
      </span>
    </div>
  );
}

// ─── "El camino": Duolingo-like path of weeks ───────────────────────────────

type Node = { kind: "done" | "current" | "locked" | "chest" | "final"; label: string; offset: string };
const PATH: Node[] = [
  { kind: "done", label: "Semana 1", offset: "translate-x-0" },
  { kind: "done", label: "Semana 2", offset: "translate-x-14" },
  { kind: "current", label: "Semana 3", offset: "translate-x-24" },
  { kind: "chest", label: "Hito", offset: "translate-x-14" },
  { kind: "locked", label: "Semana 5", offset: "translate-x-0" },
  { kind: "locked", label: "Semana 6", offset: "-translate-x-14" },
  { kind: "final", label: "Prueba final", offset: "translate-x-0" },
];

function PathNode({ node }: { node: Node }) {
  const style: Record<Node["kind"], string> = {
    done: "bg-gold text-[#1b2433] border-[#a67d18]",
    current: "bg-accent text-white border-accent-strong",
    locked: "bg-surface-2 text-muted border-border",
    chest: "bg-[#e8693a] text-white border-[#b44a20]",
    final: "bg-[#1b2433] text-gold border-black",
  };
  const icon: Record<Node["kind"], IconName> = { done: "check", current: "star", locked: "lock", chest: "chest", final: "trophy" };
  return (
    <li className={cx("relative flex justify-center", node.offset)}>
      {node.kind === "current" ? (
        <span className="absolute top-1/2 right-full mr-3 flex -translate-y-1/2 animate-bounce rounded-xl whitespace-nowrap border-2 border-border bg-surface px-2.5 py-1 text-xs font-black text-accent shadow-md motion-reduce:animate-none">
          Estás aquí
        </span>
      ) : null}
      <span
        className={cx(
          "flex size-16 items-center justify-center rounded-full border-b-[6px]",
          style[node.kind],
          node.kind === "current" && "ring-8 ring-accent/15",
        )}
      >
        <Icon name={icon[node.kind]} size={28} strokeWidth={2.6} />
        <span className="sr-only">{node.label}</span>
      </span>
    </li>
  );
}

function CaminoSection() {
  return (
    <section aria-labelledby="camino" className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
      <div>
        <Eyebrow className="text-accent">El camino</Eyebrow>
        <h2 id="camino" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          Cada hábito es un camino. Tú lo recorres a tu ritmo.
        </h2>
        <p className="mt-3 text-lg font-semibold text-muted">Semanas con hitos, cofres y un siguiente nivel. Al final, una prueba real que mide si cambiaste de verdad.</p>
        <ul className="mt-8 flex flex-col gap-3">
          {[
            { icon: "steps" as const, title: "Semana a semana", body: "Caminar 15 minutos hoy, 25 en un mes. Nunca un salto que asuste." },
            { icon: "chest" as const, title: "Hitos con premio", body: "Cofres de XP y medallas cuando sostienes el hábito." },
            { icon: "trophy" as const, title: "La prueba final", body: "Por ejemplo, medir tu VO2máx y ver cuánto subió." },
          ].map((f) => (
            <li key={f.title} className="flex gap-4 rounded-2xl border-2 border-border bg-surface p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name={f.icon} size={22} />
              </span>
              <div>
                <p className="font-black">{f.title}</p>
                <p className="text-sm font-semibold text-muted">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto w-full max-w-sm rounded-[2rem] bg-accent-soft/60 px-6 pt-6 pb-8">
        <div className="mb-8 flex items-center justify-between gap-3 rounded-2xl border-b-4 border-accent-strong bg-accent p-4 text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-wider text-white/75 uppercase">Movimiento · Nivel 2</p>
            <p className="truncate font-black">Camina tras almorzar</p>
          </div>
          <Icon name="movimiento" size={28} />
        </div>
        <ol className="flex flex-col items-center gap-6 pt-4" aria-label="Ejemplo de camino de un hábito">
          {PATH.map((n) => (
            <PathNode key={n.label} node={n} />
          ))}
        </ol>
        <p className="mt-6 text-center text-xs font-black text-muted">Prueba final: mide tu VO2máx</p>
      </div>
    </section>
  );
}

// ─── Exams ──────────────────────────────────────────────────────────────────

function ExamMock() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="absolute -top-5 -right-2 size-32 rounded-full bg-[#dcf1f4] sm:-right-8" />
      <div className="relative rounded-[2rem] border-2 border-border border-b-[6px] bg-surface p-5 shadow-xl shadow-accent/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Icon name="flask" size={20} />
            </span>
            <p className="truncate text-sm font-black">Perfil lipídico</p>
          </div>
          <span className="shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-black text-warn">Por encima de lo ideal</span>
        </div>

        <p className="mt-5 text-xs font-bold text-muted">ApoB</p>
        <p className="font-serif text-4xl font-bold tabular-nums">
          118 <span className="font-sans text-base font-bold text-muted">mg/dL</span>
        </p>
        <div className="relative mt-3 h-3 rounded-full bg-[linear-gradient(90deg,#2f9e6e_0_45%,var(--gold)_45%_70%,#e8693a_70%_100%)]">
          <span className="absolute top-1/2 left-[62%] size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface bg-[#1b2433] shadow" />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-bold text-muted">
          <span>Ideal</span>
          <span>Alto</span>
        </div>

        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          <p className="text-xs font-black text-accent uppercase">En palabras simples</p>
          <p className="mt-1 text-sm font-semibold">Son las partículas que llevan colesterol a tus arterias. Menos es mejor a largo plazo.</p>
        </div>
        <div className="mt-3 rounded-2xl bg-gold-soft p-4">
          <p className="text-xs font-black text-[#7a5a0c] uppercase">Qué hacer</p>
          <p className="mt-1 text-sm font-semibold">Coméntalo con tu médico en tu próximo control. Mientras tanto, tu camino de Nutrición ya tiene un hábito para esto.</p>
        </div>
      </div>
      <span className="absolute -bottom-4 left-4 flex items-center gap-1.5 rounded-full border-2 border-border border-b-4 bg-surface px-3 py-1.5 text-xs font-black shadow-lg">
        <Icon name="heartPulse" size={16} className="text-danger" /> Alertas con reglas clínicas
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

/** Public landing page, shown at / to visitors and at /inicio to anyone. */
export function Landing({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-bg">
      <header className="sticky top-0 z-30 border-b-2 border-border/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <nav className="flex items-center gap-2">
            <a href="#como-funciona" className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-muted hover:bg-surface-2 hover:text-text md:inline-flex">
              Cómo funciona
            </a>
            <a href="#atributos" className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-muted hover:bg-surface-2 hover:text-text md:inline-flex">
              Atributos
            </a>
            <a href="#examenes" className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-muted hover:bg-surface-2 hover:text-text md:inline-flex">
              Exámenes
            </a>
            <LinkButton href={signedIn ? "/" : "/login"} variant="secondary" className="min-h-10">
              {signedIn ? "Ir a mi cuenta" : "Entrar"}
            </LinkButton>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pt-10 pb-20 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pt-20 md:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-gold/50 bg-gold-soft px-3 py-1 text-xs font-black text-[#7a5a0c]">
              <span className="size-2 rounded-full bg-gold" aria-hidden /> Piloto por invitación · Colombia
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Longevidad <span className="relative inline-block text-accent">sin humo.<Squiggle /></span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold text-muted sm:text-xl">
              Hábitos pequeños, tus exámenes explicados y tu reloj trabajando por ti. Un juego diario, con evidencia, para vivir más años y con más energía.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={JOIN} className={buttonClass("primary", "min-h-13 px-7 text-base")}>
                Quiero participar
              </a>
              <a href="#como-funciona" className={buttonClass("secondary", "min-h-13 px-7 text-base")}>
                Cómo funciona
              </a>
            </div>
            <p className="mt-5 text-sm font-semibold text-muted">
              ¿Ya te invitaron?{" "}
              <Link href="/login" className="font-black text-accent underline-offset-2 hover:underline">
                Entra con tu correo
              </Link>
            </p>
          </div>
          <HeroMock />
        </section>

        {/* ── Promise strip ── */}
        <section aria-label="Lo esencial" className="border-y-2 border-accent-strong bg-accent text-white">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-5 text-sm font-black sm:text-base md:grid-cols-4">
            {[
              { icon: "target" as const, text: "3 hábitos al día" },
              { icon: "check" as const, text: "Un toque: Lo hice" },
              { icon: "watch" as const, text: "Tu reloj marca por ti" },
              { icon: "flask" as const, text: "Solo evidencia" },
            ].map((p) => (
              <li key={p.text} className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-gold">
                  <Icon name={p.icon} size={16} strokeWidth={2.8} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </section>

        {/* ── How it works ── */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:py-28">
          <SectionTitle eyebrow="Cómo funciona" title="Tres pasos y estás jugando." body="Sin planes eternos ni metas imposibles. Empiezas pequeño y Bombadil ajusta contigo." />
          <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className={cx("relative rounded-[1.75rem] border-2 border-border border-b-[6px] bg-surface p-6", LIFT)}>
                <span className="absolute top-5 right-6 font-serif text-6xl leading-none font-bold text-surface-2" aria-hidden>
                  {s.n}
                </span>
                <span className={cx("relative flex size-14 items-center justify-center rounded-2xl border-b-4 border-black/20", s.tile)}>
                  <Icon name={s.icon} size={28} strokeWidth={2.4} />
                </span>
                <p className="relative mt-5 text-xl font-black">
                  <span className="sr-only">Paso {s.n}: </span>
                  {s.title}
                </p>
                <p className="relative mt-2 font-semibold text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── The daily game: bento ── */}
        <section className="bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle eyebrow="Tu día" title="Constancia que se siente como un juego." body="Recompensamos que aparezcas, no los resultados de tus exámenes. Y un mal día no borra tu progreso." />
            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-6">
              {/* Anchors */}
              <div className={cx("rounded-[1.75rem] bg-accent p-6 text-white md:col-span-4", LIFT)}>
                <p className="text-xl font-black">Anclados a tu rutina</p>
                <p className="mt-1 font-semibold text-white/80">Cada hábito vive pegado a algo que ya haces. Y si el día se complica, existe la versión mínima.</p>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 text-text">
                    <p className="text-xs font-black text-accent uppercase">Versión completa</p>
                    <p className="mt-1 font-black">Después de almorzar: camina 15 minutos</p>
                  </div>
                  <div className="rounded-2xl border-2 border-dashed border-white/40 p-4">
                    <p className="text-xs font-black text-gold uppercase">Día difícil</p>
                    <p className="mt-1 font-black">Camina hasta la esquina y vuelve</p>
                  </div>
                </div>
              </div>

              {/* Ring */}
              <div className={cx("flex flex-col items-center justify-center rounded-[1.75rem] bg-gold-soft p-6 text-center md:col-span-2", LIFT)}>
                <Ring value={1} size={112}>
                  <span className="flex size-12 items-center justify-center rounded-full bg-gold text-[#1b2433]">
                    <Icon name="check" size={26} strokeWidth={3.2} />
                  </span>
                </Ring>
                <p className="mt-4 text-xl font-black">El anillo dorado</p>
                <p className="mt-1 text-sm font-semibold text-muted">Cierra tus tres hábitos y celebra el día.</p>
              </div>

              {/* Streak */}
              <div className={cx("rounded-[1.75rem] border-2 border-border bg-bg p-6 md:col-span-2", LIFT)}>
                <div className="flex items-center gap-2">
                  <Flame size={36} />
                  <Shield size={32} />
                  <Shield size={32} />
                </div>
                <p className="mt-4 text-xl font-black">Rachas con escudos</p>
                <p className="mt-1 text-sm font-semibold text-muted">Cada 7 días ganas un escudo que cubre un día perdido. Ganado, nunca comprado.</p>
              </div>

              {/* Quests */}
              <div className={cx("rounded-[1.75rem] border-2 border-border bg-bg p-6 md:col-span-2", LIFT)}>
                <p className="text-xl font-black">Misiones semanales</p>
                <p className="mt-1 text-sm font-semibold text-muted">Se renuevan cada lunes.</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {[
                    { t: "Cierra el anillo 4 días", p: 75 },
                    { t: "Haz tu revisión semanal", p: 100 },
                  ].map((q) => (
                    <li key={q.t}>
                      <p className="text-sm font-black">{q.t}</p>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
                        <div className={cx("h-full rounded-full", q.p === 100 ? "bg-gold" : "bg-accent")} style={{ width: `${q.p}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Levels */}
              <div className={cx("rounded-[1.75rem] bg-[#1b2433] p-6 text-white md:col-span-2", LIFT)}>
                <div className="flex items-center gap-3">
                  <HatAvatar size={44} level={7} />
                  <p className="text-xl font-black">Sube de nivel</p>
                </div>
                <ol className="mt-4 flex flex-wrap gap-1.5">
                  {TITLES.map((t, i) => (
                    <li
                      key={t}
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-black",
                        i < 4 ? "bg-white/10 text-white/70" : i === 4 ? "bg-gold text-[#1b2433]" : "border border-white/20 text-white/50",
                      )}
                    >
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ── El camino ── */}
        <CaminoSection />

        {/* ── Attributes ── */}
        <section id="atributos" className="scroll-mt-20 bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle eyebrow="Tu personaje" title="Ocho atributos. Un personaje que eres tú." body="Cada hábito sube un atributo. Así ves, de un vistazo, en qué estás fuerte y qué merece cariño." />
            <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {ATTRS.map((a) => (
                <li key={a.label} className={cx("rounded-[1.5rem] p-4 sm:p-5", a.tone, LIFT)}>
                  <span className={cx("flex size-12 items-center justify-center rounded-2xl border-b-4 border-black/20", a.chip)}>
                    <Icon name={a.icon} size={26} strokeWidth={2.4} />
                  </span>
                  <p className="mt-4 text-lg font-black text-text">{a.label}</p>
                  <p className="mt-0.5 text-sm font-bold">{a.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Exams ── */}
        <section id="examenes" className="mx-auto grid max-w-6xl grid-cols-1 scroll-mt-20 items-center gap-14 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="md:order-2">
            <SectionTitle
              eyebrow="Exámenes explicados"
              title="Tus exámenes, por fin en palabras simples."
              body="Sube la foto o el PDF y Bombadil te dice qué significa y qué hacer. De cualquier año."
            />
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: "flask" as const, title: "Sangre", body: "ApoB, Lp(a), glucosa, hígado (FIB-4) y más." },
                { icon: "user" as const, title: "Imágenes", body: "Resonancias, ecografías y radiografías." },
                { icon: "heartPulse" as const, title: "Alertas seguras", body: "Valores peligrosos con reglas clínicas fijas, nunca con IA." },
                { icon: "calendar" as const, title: "Tu historia", body: "Ves cómo cambia cada valor con los años." },
              ].map((f) => (
                <li key={f.title} className="rounded-2xl border-2 border-border bg-surface p-4">
                  <Icon name={f.icon} size={22} className="text-accent" />
                  <p className="mt-2 font-black">{f.title}</p>
                  <p className="text-sm font-semibold text-muted">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:order-1">
            <ExamMock />
          </div>
        </section>

        {/* ── Devices ── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 md:pb-28">
          <div className="rounded-[2rem] border-2 border-border border-b-[6px] bg-surface p-6 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-md">
                <Eyebrow className="text-accent">Dispositivos</Eyebrow>
                <p className="mt-2 font-serif text-2xl leading-tight font-bold sm:text-3xl">Hábitos que se marcan solos.</p>
                <p className="mt-2 font-semibold text-muted">Si tu reloj registra la caminata o las pesas, el hábito de movimiento o fuerza queda hecho. Tú solo vives.</p>
              </div>
              <ul className="flex flex-wrap gap-2 md:max-w-lg md:justify-end">
                {DEVICES.map((d, i) => (
                  <li
                    key={d}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-3.5 py-2 text-sm font-black",
                      i < 2 ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border bg-bg text-text",
                    )}
                  >
                    <Icon name={i < 2 ? "bolt" : "watch"} size={16} strokeWidth={2.6} />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-xs font-bold text-muted">Conexión directa con Strava y Apple Salud; Garmin, Polar, Coros y Suunto llegan a través de Strava.</p>
          </div>
        </section>

        {/* ── Evidence ── */}
        <section className="relative overflow-hidden bg-accent text-white">
          <div aria-hidden className="absolute top-10 -right-16 size-64 rounded-full border-[28px] border-white/5" />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
            <div>
              <SectionTitle
                light
                eyebrow="Sin humo"
                title="Solo lo que tiene evidencia."
                body="Trabajamos las palancas que los mejores estudios asocian con más años de vida sana. Nada más."
              />
              <ul className="mt-8 flex flex-wrap gap-2">
                {LEVERS.map((l) => (
                  <li key={l} className="rounded-full border-2 border-b-4 border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-black">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div className="self-center rounded-[1.75rem] border-b-[6px] border-black/25 bg-accent-strong p-6">
              <p className="text-sm font-black tracking-wider text-gold uppercase">Lo que no vas a encontrar</p>
              <ul className="mt-4 flex flex-col gap-3">
                {MYTHS.map((m) => (
                  <li key={m} className="flex items-center gap-3 text-lg font-black">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 14 14">
                        <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="line-through decoration-gold decoration-2">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Trust ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-[1.75rem] border-2 border-border bg-surface p-6 sm:p-8">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon name="lock" size={24} />
              </span>
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight">Tus datos son tuyos</h2>
              <p className="mt-2 font-semibold text-muted">
                Tratamos tus datos de salud con tu autorización expresa (Ley 1581 de 2012). Descárgalos o bórralos por completo cuando quieras, y desconecta tus dispositivos en
                un toque.
              </p>
            </div>
            <div className="rounded-[1.75rem] border-2 border-border bg-surface p-6 sm:p-8">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gold-soft text-[#7a5a0c]">
                <Icon name="heartPulse" size={24} />
              </span>
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight">No reemplaza a tu médico</h2>
              <p className="mt-2 font-semibold text-muted">
                Bombadil es acompañamiento de bienestar y educación: no diagnostica ni receta. Cuando algo merece una consulta, te lo decimos claro.
              </p>
            </div>
          </div>

          {/* ── Final CTA ── */}
          <div className="relative mt-16 overflow-hidden rounded-[2.25rem] border-b-8 border-[#a67d18] bg-gold px-6 py-14 text-center text-[#1b2433] sm:px-12">
            <div aria-hidden className="absolute -top-16 -left-16 size-56 rounded-full bg-white/20" />
            <div aria-hidden className="absolute -right-10 -bottom-20 size-64 rounded-full bg-white/15" />
            <div className="relative flex flex-col items-center">
              <span className="animate-bounce motion-reduce:animate-none [animation-duration:2s]">
                <HatAvatar size={72} />
              </span>
              <p className="mt-6 max-w-2xl font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">Empieza con un hábito de dos minutos.</p>
              <p className="mt-3 max-w-lg font-bold text-[#1b2433]/75">Estamos abriendo cupos del piloto en Colombia. Escríbenos y te contamos.</p>
              <a href={JOIN} className={buttonClass("primary", "mt-8 min-h-14 px-8 text-base")}>
                Quiero participar
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <Link href="/privacidad" className="underline-offset-2 hover:text-text hover:underline">
              Aviso de privacidad
            </Link>
            <Link href="/consentimiento" className="underline-offset-2 hover:text-text hover:underline">
              Consentimiento informado
            </Link>
            <span>Bombadil no reemplaza a tu médico. Emergencias: 123.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
