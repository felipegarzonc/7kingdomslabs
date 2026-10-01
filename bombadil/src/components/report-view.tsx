import type { ReportContent } from "@/lib/llm/report";
import { Badge } from "./ui";

export function ReportView({ content }: { content: ReportContent }) {
  return (
    <article className="flex flex-col gap-5 text-sm leading-relaxed">
      <p className="font-serif text-xl font-semibold leading-snug">{content.headline}</p>
      <Section title="Tus prioridades">
        <ol className="flex flex-col gap-3">
          {content.priorities.map((p, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {i + 1}. {p.title}
                </span>
                <Badge tone={p.kind === "must" ? "danger" : "info"}>{p.kind === "must" ? "Esto debes hacerlo" : "Esto sería bueno"}</Badge>
              </div>
              <p className="mt-1 text-text/90">{p.why}</p>
              <p className="mt-1">
                <span className="font-medium">Cómo empezar: </span>
                {p.how}
              </p>
              {p.steps?.length ? (
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                  {p.steps.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              ) : null}
              {p.track ? (
                <p className="mt-2 text-xs text-muted">
                  <span className="font-medium">Cómo sabrás que funciona: </span>
                  {p.track}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>
      <List title="Pequeños cambios que suman" items={content.quick_wins ?? []} />
      <List title="Qué empeoró" items={content.worsened} />
      <List title="Qué mejoró" items={content.improved} />
      <List title="Qué está estable" items={content.stable} />
      <Section title="Cómo se conecta todo">
        <p>{content.connections}</p>
      </Section>
      <Section title="Qué conviene hablar con tu médico">
        <p>{content.see_doctor}</p>
      </Section>
      <p className="text-text/90">{content.closing}</p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </Section>
  );
}
