import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonClass, LinkButton } from "@/components/ui";
import { OPERATOR } from "@/content/legal";

const JOIN = `mailto:${OPERATOR.email}?subject=${encodeURIComponent("Quiero participar en el piloto de Bombadil")}`;

const STEPS = [
  {
    n: "1",
    title: "Cuéntanos cómo vives",
    body: "Ocho preguntas de un toque sobre movimiento, sueño, comida, alcohol y estrés. Dos minutos.",
  },
  {
    n: "2",
    title: "Trae tus datos",
    body: "Sube exámenes de sangre o informes de imágenes y conecta Strava, Garmin o Apple Salud. Nada de digitar valores.",
  },
  {
    n: "3",
    title: "Hábitos pequeños que suben de nivel",
    body: "Tres hábitos anclados a tu rutina. Cuando se vuelven fáciles, suben; si cuestan, se hacen más pequeños.",
  },
];

const FEATURES = [
  { title: "Exámenes explicados", body: "Laboratorios de cualquier año y resonancias, ecografías o radiografías, en palabras simples y con qué hacer." },
  { title: "Hábitos que se marcan solos", body: "Si tu reloj registra la caminata o las pesas, el hábito queda hecho. Tú solo vives." },
  { title: "Alertas con reglas fijas", body: "Una presión o un valor peligroso dispara una alerta con reglas clínicas, nunca con inteligencia artificial." },
  { title: "Revisión semanal", body: "Dos minutos cada semana y una respuesta con un ajuste concreto para la siguiente." },
];

const LEVERS = ["Capacidad cardiorrespiratoria", "Fuerza muscular", "Sueño de 7 a 8 horas", "Presión arterial", "ApoB y colesterol", "Glucosa e hígado", "No fumar", "Poco alcohol"];

function HabitPreview() {
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-xl shadow-accent/10">
      <p className="text-xs font-medium text-muted">Hoy · 2 de 3 hábitos</p>
      <ul className="mt-3 flex flex-col gap-3">
        {[
          { pillar: "Movimiento · Después de almorzar", title: "Camina 15 minutos", done: [0, 1, 2, 3], auto: "Registrado con Strava" },
          { pillar: "Fuerza · Después de servir el café", title: "10 sentadillas", done: [0, 2, 3], auto: null },
        ].map((h) => (
          <li key={h.title} className="rounded-2xl border border-accent bg-accent-soft/40 p-4">
            <p className="text-xs text-muted">{h.pillar}</p>
            <p className="mt-0.5 font-semibold">{h.title}</p>
            <div className="mt-3 flex items-center gap-1.5">
              {days.map((d, i) => (
                <span key={i} className={`flex size-6 items-center justify-center rounded-full text-[10px] ${h.done.includes(i) ? "bg-accent font-semibold text-bg" : "bg-surface-2 text-muted"}`}>
                  {d}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">✓ Hecho hoy{h.auto ? ` · ${h.auto}` : ""}</p>
          </li>
        ))}
        <li className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted">Sueño · Después de cepillarte en la noche</p>
          <p className="mt-0.5 font-semibold">Celular fuera del cuarto</p>
          <span className={buttonClass("primary", "mt-3 min-h-9 px-3 text-xs")}>Lo hice</span>
        </li>
      </ul>
    </div>
  );
}

/** Public landing page, shown at / to visitors and at /inicio to anyone. */
export function Landing({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Brand />
        <LinkButton href={signedIn ? "/" : "/login"} variant="secondary" className="min-h-10">
          {signedIn ? "Ir a mi cuenta" : "Entrar"}
        </LinkButton>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-6 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-text">
              <span className="size-2 rounded-full bg-gold" aria-hidden /> Piloto por invitación · Colombia
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Longevidad sin humo.
            </h1>
            <p className="mt-4 max-w-prose text-lg text-muted">
              Bombadil junta tus exámenes, tu reloj y tu rutina en un plan diario de hábitos pequeños, basado en evidencia, para que vivas más años y con más energía.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={JOIN} className={buttonClass("primary")}>
                Quiero participar
              </a>
              <a href="#como-funciona" className={buttonClass("secondary")}>
                Cómo funciona
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">
              ¿Ya te invitaron?{" "}
              <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
                Entra con tu correo
              </Link>
            </p>
          </div>
          <HabitPreview />
        </section>

        <section id="como-funciona" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Cómo funciona</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent font-serif text-lg font-semibold text-bg">{s.n}</span>
                  <p className="mt-3 font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Lo que hace por ti</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-surface p-5">
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">Funciona con Strava y Apple Salud, y a través de ellos con Garmin, Apple Watch, Polar, Coros y Suunto.</p>
        </section>

        <section className="bg-accent text-bg">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Solo lo que tiene evidencia</h2>
            <p className="mt-3 max-w-prose opacity-90">
              Nada de suplementos milagro ni “edad biológica” mágica. Trabajamos las palancas que los mejores estudios asocian con más años de vida sana:
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {LEVERS.map((l) => (
                <li key={l} className="rounded-full border border-current/30 px-3 py-1 text-sm">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Tus datos son tuyos</h2>
              <p className="mt-2 text-sm text-muted">
                Tratamos tus datos de salud con tu autorización expresa (Ley 1581 de 2012). Puedes descargarlos o borrarlos por completo cuando quieras, y desconectar tus
                dispositivos en un toque.
              </p>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">No reemplaza a tu médico</h2>
              <p className="mt-2 text-sm text-muted">
                Bombadil es acompañamiento de bienestar y educación: no diagnostica ni receta. Cuando algo merece una consulta, te lo decimos claro.
              </p>
            </div>
          </div>
          <div className="mt-12 rounded-3xl border border-border bg-surface p-8 text-center">
            <p className="font-serif text-2xl font-semibold">Empieza con un hábito de dos minutos.</p>
            <a href={JOIN} className={buttonClass("primary", "mt-5")}>
              Quiero participar
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 pb-10 text-xs text-muted">
        <Link href="/privacidad" className="underline-offset-2 hover:underline">
          Aviso de privacidad
        </Link>
        <Link href="/consentimiento" className="underline-offset-2 hover:underline">
          Consentimiento informado
        </Link>
        <span>Bombadil no reemplaza a tu médico. Emergencias: 123.</span>
      </footer>
    </div>
  );
}
