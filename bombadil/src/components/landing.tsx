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
// Who this is for (see docs/CLIENTE.md): people 35–55 in Colombia who got a lab result with something
// "alto" and a short appointment, want to stay strong for decades, and often already wear a watch.
// The copy leads with that problem and its outcome; the game is how the habits stick, not the promise.

const PAINS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "flask",
    title: "El examen dice «alto» y nadie te lo explica",
    body: "Un PDF con 30 valores, tres en rojo y una consulta de 15 minutos que termina en «baje de peso y haga ejercicio».",
  },
  {
    icon: "calendar",
    title: "Cada año empiezas de cero",
    body: "Tus resultados quedan en correos y laboratorios distintos. Nadie mira si tu colesterol viene subiendo desde hace tres años.",
  },
  {
    icon: "target",
    title: "El plan dura dos semanas",
    body: "Dieta estricta, gimnasio cinco días… y en marzo todo vuelve a ser igual. No es falta de voluntad: el plan era demasiado grande.",
  },
];

const STEPS: Array<{ n: string; title: string; body: string; icon: IconName; tile: string }> = [
  {
    n: "1",
    title: "Sube tus exámenes",
    body: "El PDF de cualquier laboratorio y de cualquier año. En un par de minutos ves qué significa cada valor y cuáles importan.",
    icon: "flask",
    tile: "bg-accent text-white",
  },
  {
    n: "2",
    title: "Cuéntanos qué ya haces",
    body: "Lo que ya haces por tu salud cuenta desde el primer día. Solo te sugerimos uno o dos pasos más, donde tus exámenes lo piden, y tú decides.",
    icon: "compass",
    tile: "bg-gold text-[#1b2433]",
  },
  {
    n: "3",
    title: "Mide si funcionó",
    body: "Tu reloj y tus registros muestran el avance semana a semana, y tu próximo examen lo confirma con números.",
    icon: "trophy",
    tile: "bg-[#2f9e6e] text-white",
  },
];

const AUDIENCES: Array<{ icon: IconName; title: string; body: string; tags: string[] }> = [
  {
    icon: "heartPulse",
    title: "Te salió algo alterado",
    body: "Quieres entender qué significa y bajarlo con hábitos que puedas sostener, de la mano de tu médico.",
    tags: ["Colesterol LDL", "Triglicéridos", "Glucosa", "Hígado graso", "Presión arterial"],
  },
  {
    icon: "sprout",
    title: "Quieres llegar a los 80 con energía",
    body: "Nada te duele, pero quieres prevenir: fuerza, corazón y sueño que te den décadas de buena vida.",
    tags: ["Prevención", "Longevidad", "Fuerza", "Sueño"],
  },
  {
    icon: "watch",
    title: "Ya mides todo",
    body: "Tienes reloj, Strava y exámenes anuales. Te falta que esos datos se conviertan en decisiones de cada semana.",
    tags: ["VO2máx", "Strava", "Apple Salud", "Garmin"],
  },
];

const ATTRS: Array<{ label: string; icon: IconName; blurb: string; tone: string; chip: string }> = [
  { label: "Resistencia", icon: "movimiento", blurb: "Capacidad cardiorrespiratoria (VO2máx)", tone: "bg-accent-soft text-accent-strong", chip: "bg-accent text-white" },
  { label: "Fuerza", icon: "fuerza", blurb: "Músculo y fuerza de agarre", tone: "bg-[#fde7dc] text-[#9a3b12]", chip: "bg-[#e8693a] text-white" },
  { label: "Descanso", icon: "sueno", blurb: "Siete a ocho horas de sueño", tone: "bg-info-soft text-info", chip: "bg-info text-white" },
  { label: "Nutrición", icon: "nutricion", blurb: "Fibra, proteína, menos ultraprocesados", tone: "bg-[#e0f3e8] text-[#1d6b47]", chip: "bg-[#2f9e6e] text-white" },
  { label: "Calma", icon: "estres", blurb: "Estrés y presión arterial", tone: "bg-[#dcf1f4] text-[#14606b]", chip: "bg-[#1f8a99] text-white" },
  { label: "Vínculos", icon: "conexion", blurb: "Relaciones que te sostienen", tone: "bg-[#fbe3ec] text-[#8f2453]", chip: "bg-[#d0457f] text-white" },
  { label: "Templanza", icon: "sustancias", blurb: "Poco alcohol, nada de tabaco", tone: "bg-gold-soft text-[#7a5a0c]", chip: "bg-gold text-[#1b2433]" },
  { label: "Sabiduría", icon: "sabiduria", blurb: "Conocer tus números", tone: "bg-surface-2 text-text", chip: "bg-[#1b2433] text-white" },
];

const TITLES = ["Aprendiz del bosque", "Caminante", "Explorador", "Rastreador", "Guardián del sendero", "Custodio del bosque", "Sabio del bosque", "Leyenda de la longevidad"];

const DEVICES = ["Strava", "Apple Salud", "Garmin", "Apple Watch", "Polar", "Coros", "Suunto"];

const LEVERS = ["Capacidad cardiorrespiratoria", "Fuerza muscular", "Sueño de 7 a 8 horas", "Presión arterial", "ApoB y colesterol LDL", "Glucosa e hígado", "No fumar", "Poco alcohol"];

const MYTHS = ["Suplementos milagro", "Tests de «edad biológica»", "Dietas de moda"];

/** Real questions people search for; answered here and marked up as FAQPage. */
export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "¿Cómo interpretar mis exámenes de sangre?",
    a: "Cada valor se compara con el rango de referencia de tu laboratorio y, cuando hay evidencia, con un rango óptimo para la salud a largo plazo. Igual de importante es la tendencia: un colesterol LDL que sube año tras año dice más que un solo resultado. Bombadil lee el PDF, te explica cada valor en palabras simples, conecta los que se relacionan (por ejemplo, triglicéridos, glucosa e hígado) y te dice qué conviene hablar con tu médico.",
  },
  {
    q: "¿Qué hago si tengo el colesterol LDL o los triglicéridos altos?",
    a: "Primero, hablarlo con tu médico: si necesitas medicamento depende de tu riesgo total (edad, presión, glucosa, tabaco y antecedentes). En hábitos, lo que más ayuda al LDL es comer menos grasa saturada y ultraprocesados y más fibra soluble (avena, fríjoles, lentejas). Los triglicéridos responden sobre todo a menos alcohol, azúcar y harinas refinadas, y a más actividad física. Bombadil convierte eso en hábitos pequeños y mide si tu próximo examen mejora.",
  },
  {
    q: "¿Una glucosa en ayunas entre 100 y 125 mg/dL es prediabetes?",
    a: "Según la Asociación Americana de Diabetes, una glucosa en ayunas de 100 a 125 mg/dL o una hemoglobina glicosilada (HbA1c) de 5,7 % a 6,4 % corresponden a prediabetes. Desde 126 mg/dL en ayunas o 6,5 % de HbA1c, confirmados en una segunda prueba, se habla de diabetes. La prediabetes se puede revertir: moverte más, dormir mejor y bajar un poco de peso reducen mucho el riesgo.",
  },
  {
    q: "¿Qué es la longevidad y qué la mejora de verdad?",
    a: "Longevidad no es solo vivir más años, sino vivirlos con energía, fuerza y la cabeza clara. Lo que más evidencia tiene: buena capacidad cardiorrespiratoria (VO2máx), fuerza muscular, dormir de 7 a 8 horas, presión arterial, colesterol y glucosa en rango, no fumar y poco alcohol. Bombadil trabaja esas palancas, sin suplementos milagro ni tests de «edad biológica».",
  },
  {
    q: "¿Bombadil reemplaza a mi médico?",
    a: "No. Es acompañamiento y educación en salud: no diagnostica ni receta. Te ayuda a llegar a la consulta entendiendo tus resultados, con un resumen de una página para tu médico, y te avisa con reglas clínicas fijas cuando un valor merece consultar pronto.",
  },
  {
    q: "¿Funciona con mi reloj?",
    a: "Sí. Se conecta con Strava y Apple Salud; Garmin, Polar, Coros y Suunto llegan a través de Strava. Tus pasos, sueño, ejercicio y frecuencia cardiaca se registran solos, y los hábitos de movimiento y fuerza se marcan sin que hagas nada.",
  },
  {
    q: "¿Qué pasa con mis datos de salud?",
    a: "Los tratamos solo con tu autorización expresa, según la Ley 1581 de 2012. Antes de analizar un examen ocultamos tu nombre y documento. Puedes descargar o borrar todos tus datos cuando quieras.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Estamos abriendo cupos de un piloto en Colombia. Escríbenos desde el botón «Quiero participar» y te contamos los pasos.",
  },
];

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
          Progreso semana a semana, con una prueba real al final.
        </h2>
        <p className="mt-3 text-lg font-semibold text-muted">Cada hábito crece cuando se vuelve fácil y se encoge cuando cuesta. Al final, un dato objetivo dice si cambiaste de verdad.</p>
        <ul className="mt-8 flex flex-col gap-3">
          {[
            { icon: "steps" as const, title: "Semana a semana", body: "Caminar 15 minutos hoy, 25 en un mes. Nunca un salto que asuste." },
            { icon: "chest" as const, title: "Hitos con premio", body: "Medallas y escudos para tu racha cuando sostienes el hábito." },
            { icon: "trophy" as const, title: "La prueba final", body: "Tu próximo examen, tu VO2máx o tu presión: números que puedes comparar." },
          ].map((f) => (
            <li key={f.title} className="flex gap-4 rounded-2xl border-2 border-border bg-surface p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name={f.icon} size={22} />
              </span>
              <div>
                <h3 className="font-black">{f.title}</h3>
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

function JsonLd() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bombadil-three.vercel.app";
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Bombadil",
      url: site,
      logo: `${site}/bombadil-icon-192.png`,
      email: OPERATOR.email,
      areaServed: "CO",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Bombadil",
      inLanguage: "es-CO",
      url: site,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: "es-CO",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const NAV = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#examenes", label: "Exámenes" },
  { href: "#para-quien", label: "Para quién es" },
  { href: "#preguntas", label: "Preguntas" },
];

/** Public landing page, shown at / to visitors and at /inicio to anyone. */
export function Landing({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-bg">
      <JsonLd />
      <header className="sticky top-0 z-30 border-b-2 border-border/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <nav aria-label="Secciones" className="flex items-center gap-2">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-muted hover:bg-surface-2 hover:text-text lg:inline-flex">
                {n.label}
              </a>
            ))}
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
              <span className="size-2 rounded-full bg-gold" aria-hidden /> Salud preventiva con evidencia · Colombia
            </p>
            <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
              Entiende tus exámenes y mejora tu salud, <span className="relative inline-block text-accent">un hábito a la vez.<Squiggle /></span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold text-muted sm:text-xl">
              Sube tus exámenes de sangre y entiende en minutos tu colesterol, glucosa, triglicéridos e hígado. Partimos de lo que ya haces, te sugerimos el siguiente paso, y tu próximo examen te dirá si
              funcionó.
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
              { icon: "flask" as const, text: "Exámenes en palabras simples" },
              { icon: "target" as const, text: "Parte de lo que ya haces" },
              { icon: "watch" as const, text: "Tu reloj registra por ti" },
              { icon: "heartPulse" as const, text: "Un resumen para tu médico" },
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

        {/* ── The problem ── */}
        <section aria-labelledby="problema" className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <Eyebrow className="text-accent">¿Te suena?</Eyebrow>
            <h2 id="problema" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              Tienes los exámenes. Te falta saber qué hacer con ellos.
            </h2>
          </div>
          <ul className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PAINS.map((p) => (
              <li key={p.title} className="rounded-[1.75rem] border-2 border-border bg-surface p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                  <Icon name={p.icon} size={24} />
                </span>
                <h3 className="mt-4 text-xl font-black">{p.title}</h3>
                <p className="mt-2 font-semibold text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── How it works ── */}
        <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-20 bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <Eyebrow className="text-accent">Cómo funciona</Eyebrow>
              <h2 id="como-funciona-title" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                De un PDF que no entiendes a números que mejoran.
              </h2>
              <p className="mt-3 text-base font-semibold text-muted sm:text-lg">Sin planes eternos ni metas imposibles. Empiezas pequeño y Bombadil ajusta contigo cada semana.</p>
            </div>
            <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className={cx("relative rounded-[1.75rem] border-2 border-border border-b-[6px] bg-bg p-6", LIFT)}>
                  <span className="absolute top-5 right-6 font-serif text-6xl leading-none font-bold text-surface-2" aria-hidden>
                    {s.n}
                  </span>
                  <span className={cx("relative flex size-14 items-center justify-center rounded-2xl border-b-4 border-black/20", s.tile)}>
                    <Icon name={s.icon} size={28} strokeWidth={2.4} />
                  </span>
                  <h3 className="relative mt-5 text-xl font-black">
                    <span className="sr-only">Paso {s.n}: </span>
                    {s.title}
                  </h3>
                  <p className="relative mt-2 font-semibold text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Exams ── */}
        <section id="examenes" aria-labelledby="examenes-title" className="mx-auto grid max-w-6xl scroll-mt-20 grid-cols-1 items-center gap-14 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="md:order-2">
            <Eyebrow className="text-accent">Exámenes explicados</Eyebrow>
            <h2 id="examenes-title" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              Interpreta tus exámenes de sangre en palabras simples.
            </h2>
            <p className="mt-3 text-base font-semibold text-muted sm:text-lg">Sube el PDF de cualquier laboratorio y de cualquier año. Bombadil te dice qué significa cada valor, cómo ha cambiado y qué hacer.</p>
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: "heartPulse" as const, title: "Perfil lipídico", body: "Colesterol LDL y HDL, triglicéridos, ApoB y Lp(a)." },
                { icon: "flask" as const, title: "Glucosa y HbA1c", body: "Si estás en rango, en prediabetes o necesitas consultar." },
                { icon: "nutricion" as const, title: "Hígado y riñón", body: "ALT, AST, hígado graso (FIB-4), creatinina y más." },
                { icon: "user" as const, title: "Imágenes", body: "Resonancias, ecografías y radiografías, explicadas." },
                { icon: "calendar" as const, title: "Tu historia", body: "Cada valor a lo largo de los años, de todos tus laboratorios." },
                { icon: "lock" as const, title: "Alertas seguras", body: "Valores peligrosos con reglas clínicas fijas, nunca con IA." },
              ].map((f) => (
                <li key={f.title} className="rounded-2xl border-2 border-border bg-surface p-4">
                  <Icon name={f.icon} size={22} className="text-accent" />
                  <h3 className="mt-2 font-black">{f.title}</h3>
                  <p className="text-sm font-semibold text-muted">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:order-1">
            <ExamMock />
          </div>
        </section>

        {/* ── The daily game: bento ── */}
        <section aria-labelledby="habitos" className="bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <Eyebrow className="text-accent">Hábitos que se sostienen</Eyebrow>
              <h2 id="habitos" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                Partimos de lo que ya haces y sumamos poco a poco.
              </h2>
              <p className="mt-3 text-base font-semibold text-muted sm:text-lg">
                Nada de cambiarte la vida de golpe. Lo que ya haces cuenta desde hoy, y cada sugerencia es pequeña, pegada a tu rutina y opcional: la pruebas o dices «ahora no». Premiamos
                la constancia, no los resultados, y un mal día no borra tu progreso.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-6">
              {/* Anchors */}
              <div className={cx("rounded-[1.75rem] bg-accent p-6 text-white md:col-span-4", LIFT)}>
                <h3 className="text-xl font-black">Anclados a tu rutina</h3>
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
                <h3 className="mt-4 text-xl font-black">El anillo del día</h3>
                <p className="mt-1 text-sm font-semibold text-muted">Cierra tus hábitos con un toque. Si tu reloj ya lo registró, se marca solo.</p>
              </div>

              {/* Streak */}
              <div className={cx("rounded-[1.75rem] border-2 border-border bg-bg p-6 md:col-span-2", LIFT)}>
                <div className="flex items-center gap-2">
                  <Flame size={36} />
                  <Shield size={32} />
                  <Shield size={32} />
                </div>
                <h3 className="mt-4 text-xl font-black">Rachas con escudos</h3>
                <p className="mt-1 text-sm font-semibold text-muted">Cada 7 días ganas un escudo que cubre un día perdido. Lo que importa es no fallar dos seguidos.</p>
              </div>

              {/* Reminders */}
              <div className={cx("rounded-[1.75rem] border-2 border-border bg-bg p-6 md:col-span-2", LIFT)}>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Icon name="bell" size={24} />
                </span>
                <h3 className="mt-4 text-xl font-black">Recordatorios a tu hora</h3>
                <p className="mt-1 text-sm font-semibold text-muted">Un aviso solo si aún no lo hiciste. Y, si quieres, alguien de confianza que te acompañe.</p>
              </div>

              {/* Levels */}
              <div className={cx("rounded-[1.75rem] bg-[#1b2433] p-6 text-white md:col-span-2", LIFT)}>
                <div className="flex items-center gap-3">
                  <HatAvatar size={44} level={7} />
                  <h3 className="text-xl font-black">Sube de nivel</h3>
                </div>
                <p className="mt-2 text-sm font-semibold text-white/70">¿Prefieres sin juego? Hay un modo sobrio.</p>
                <ol className="mt-4 flex flex-wrap gap-1.5">
                  {TITLES.slice(0, 6).map((t, i) => (
                    <li
                      key={t}
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-black",
                        i < 3 ? "bg-white/10 text-white/70" : i === 3 ? "bg-gold text-[#1b2433]" : "border border-white/20 text-white/50",
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

        {/* ── For whom ── */}
        <section id="para-quien" aria-labelledby="para-quien-title" className="scroll-mt-20 bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <Eyebrow className="text-accent">Para quién es</Eyebrow>
              <h2 id="para-quien-title" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                Para quien quiere cuidarse en serio, sin volverse experto.
              </h2>
            </div>
            <ul className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {AUDIENCES.map((a) => (
                <li key={a.title} className={cx("flex flex-col rounded-[1.75rem] border-2 border-border border-b-[6px] bg-bg p-6", LIFT)}>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-white">
                    <Icon name={a.icon} size={24} />
                  </span>
                  <h3 className="mt-4 text-xl font-black">{a.title}</h3>
                  <p className="mt-2 flex-1 font-semibold text-muted">{a.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Temas">
                    {a.tags.map((t) => (
                      <li key={t} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-black text-accent-strong">
                        {t}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-semibold text-muted">
              No es para emergencias ni para tratar una enfermedad: eso es con tu médico. Si estás en tratamiento, Bombadil te ayuda con los hábitos que él o ella te recomendó.
            </p>
          </div>
        </section>

        {/* ── The eight areas ── */}
        <section id="atributos" aria-labelledby="atributos-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <Eyebrow className="text-accent">Tu personaje</Eyebrow>
            <h2 id="atributos-title" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              Las ocho áreas que más pesan en cuántos años vives, y cómo.
            </h2>
            <p className="mt-3 text-base font-semibold text-muted sm:text-lg">Cada hábito sube una de ellas. Así ves de un vistazo en qué estás fuerte y qué merece atención.</p>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {ATTRS.map((a) => (
              <li key={a.label} className={cx("rounded-[1.5rem] p-4 sm:p-5", a.tone, LIFT)}>
                <span className={cx("flex size-12 items-center justify-center rounded-2xl border-b-4 border-black/20", a.chip)}>
                  <Icon name={a.icon} size={26} strokeWidth={2.4} />
                </span>
                <h3 className="mt-4 text-lg font-black text-text">{a.label}</h3>
                <p className="mt-0.5 text-sm font-bold">{a.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Devices ── */}
        <section aria-labelledby="dispositivos" className="mx-auto max-w-6xl px-4 pb-20 md:pb-28">
          <div className="rounded-[2rem] border-2 border-border border-b-[6px] bg-surface p-6 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-md">
                <Eyebrow className="text-accent">Dispositivos</Eyebrow>
                <h2 id="dispositivos" className="mt-2 font-serif text-2xl leading-tight font-bold sm:text-3xl">
                  Tu reloj trabaja por ti.
                </h2>
                <p className="mt-2 font-semibold text-muted">Pasos, sueño, ejercicio, frecuencia cardiaca y HRV llegan solos. Si registra la caminata o las pesas, el hábito queda hecho.</p>
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
        <section aria-labelledby="evidencia" className="relative overflow-hidden bg-accent text-white">
          <div aria-hidden className="absolute top-10 -right-16 size-64 rounded-full border-[28px] border-white/5" />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
            <div>
              <Eyebrow className="text-gold">Basado en evidencia</Eyebrow>
              <h2 id="evidencia" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                Lo que la ciencia sí asocia con más años de vida sana.
              </h2>
              <p className="mt-3 text-base font-semibold text-white/80 sm:text-lg">
                Trabajamos las palancas con mejor evidencia y medimos tu salud cardiovascular con el puntaje Life&apos;s Essential 8 de la Asociación Americana del Corazón.
              </p>
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

        {/* ── FAQ ── */}
        <section id="preguntas" aria-labelledby="preguntas-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 md:py-28">
          <Eyebrow className="text-accent">Preguntas frecuentes</Eyebrow>
          <h2 id="preguntas-title" className="mt-2 font-serif text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            Lo que más nos preguntan
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0} className="group rounded-2xl border-2 border-border bg-surface p-5 open:border-accent/40">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-black [&::-webkit-details-marker]:hidden">
                  <h3>{f.q}</h3>
                  <span aria-hidden className="mt-1 text-accent transition group-open:rotate-45">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 font-semibold text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Trust ── */}
        <section aria-label="Confianza" className="mx-auto max-w-6xl px-4 pb-20 md:pb-28">
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
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight">Trabaja junto a tu médico</h2>
              <p className="mt-2 font-semibold text-muted">
                Bombadil acompaña y educa: no diagnostica ni receta. Llegas a la consulta entendiendo tus resultados, con un resumen de una página, y te avisamos claro cuando algo
                merece consultar pronto.
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
              <p className="mt-6 max-w-2xl font-serif text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">Que tu próximo examen salga mejor que el último.</p>
              <p className="mt-3 max-w-lg font-bold text-[#1b2433]/75">Estamos abriendo cupos del piloto en Colombia. Escríbenos y te contamos cómo empezar.</p>
              <a href={JOIN} className={buttonClass("primary", "mt-8 min-h-14 px-8 text-base")}>
                Quiero participar
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand />
            <p className="mt-2 max-w-sm text-xs">Interpretación de exámenes, hábitos y salud preventiva basada en evidencia. Hecho en Colombia.</p>
          </div>
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
