import { CONSENT_DECLARATION, CONSENT_SECTIONS, CONSENT_VERSION } from "@/content/legal";

export function ConsentText() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p className="text-xs text-muted">Versión {CONSENT_VERSION}</p>
      {CONSENT_SECTIONS.map((s) => (
        <section key={s.title}>
          <h3 className="font-semibold">{s.title}</h3>
          <p className="mt-1 text-text/90">{s.body}</p>
        </section>
      ))}
      <p className="font-medium">{CONSENT_DECLARATION}</p>
    </div>
  );
}
