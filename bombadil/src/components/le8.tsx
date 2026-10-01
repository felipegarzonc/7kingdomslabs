import Link from "next/link";
import { LE8_LABEL, type Le8Key, type Le8Result } from "@/domain/le8";
import { Bar } from "./game";
import { cx } from "./ui";

const CATEGORY = {
  high: { label: "Salud cardiovascular alta", tone: "text-[#15803d] dark:text-[#4ade80]" },
  moderate: { label: "Salud cardiovascular moderada", tone: "text-[#8a6510] dark:text-gold" },
  low: { label: "Salud cardiovascular baja", tone: "text-[#b91c1c] dark:text-[#f87171]" },
} as const;

/** Where to get the data for a missing component. */
const MISSING_HINT: Record<Le8Key, { text: string; href: string }> = {
  diet: { text: "responde el cuestionario de hábitos", href: "/app/empezar" },
  activity: { text: "conecta tu reloj o responde el cuestionario", href: "/app/conexiones" },
  nicotine: { text: "dinos si fumas en Mis datos", href: "/app/datos" },
  sleep: { text: "conecta tu reloj o responde el cuestionario", href: "/app/conexiones" },
  bmi: { text: "registra tu peso", href: "/app/mediciones" },
  lipids: { text: "sube un perfil lipídico", href: "/app/examenes" },
  glucose: { text: "sube un examen con glucosa o HbA1c", href: "/app/examenes" },
  bp: { text: "registra tu presión", href: "/app/mediciones" },
};

const barTone = (s: number) => (s >= 80 ? "bg-[#22c55e]" : s >= 50 ? "bg-gold" : "bg-[#ef4444]");

export function Le8Ring({ score, size = 96 }: { score: number; size?: number }) {
  const stroke = 9;
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "var(--gold)" : "#ef4444";
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="text-3xl font-black tabular-nums">{score}</span>
    </span>
  );
}

/** Full card: score, the components we have, and how to complete the rest. */
export function Le8Card({ result }: { result: Le8Result }) {
  const cat = CATEGORY[result.category];
  return (
    <section className="rounded-3xl border-2 border-border bg-surface p-5 sm:p-6" aria-labelledby="le8-title">
      <div className="flex flex-wrap items-center gap-5">
        <Le8Ring score={result.score} />
        <div className="min-w-48 flex-1">
          <h2 id="le8-title" className="text-lg font-black">
            Esencial 8 del corazón
          </h2>
          <p className={cx("font-black", cat.tone)}>{cat.label}</p>
          <p className="mt-1 text-sm text-muted">
            El puntaje de la Asociación Americana del Corazón (0 a 100) para las 8 cosas que más protegen tu corazón y tu cerebro. Calculado con {result.components.length} de 8.
          </p>
        </div>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {result.components.map((c) => (
          <li key={c.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-black">{c.label}</span>
              <span className="font-black tabular-nums">{c.score}</span>
            </div>
            <Bar value={c.score / 100} tone={barTone(c.score)} label={`${c.label}: ${c.score} de 100`} className="mt-1 h-2.5" />
            <p className="mt-0.5 text-xs text-muted">{c.basis}</p>
          </li>
        ))}
      </ul>
      {result.missing.length ? (
        <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm">
          <p className="font-black">Para completarlo:</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {result.missing.map((k) => (
              <li key={k}>
                {LE8_LABEL[k]}:{" "}
                <Link href={MISSING_HINT[k].href} className="font-bold text-accent underline">
                  {MISSING_HINT[k].text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Es una guía, no un diagnóstico. La alimentación se aproxima con tus respuestas; la presión no descuenta tratamiento. Fuente: Lloyd-Jones et al., Circulation 2022.
      </p>
    </section>
  );
}
