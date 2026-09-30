import type { Metadata } from "next";
import { PublicShell } from "@/components/brand";
import { PRIVACY_NOTICE } from "@/content/legal";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PrivacyPage() {
  return (
    <PublicShell>
      <h1 className="font-serif text-3xl font-semibold">Aviso de privacidad</h1>
      <p className="mt-2 text-sm text-muted">Ley 1581 de 2012 y Decreto 1377 de 2013. Borrador pendiente de revisión legal.</p>
      <div className="mt-6 space-y-5">
        {PRIVACY_NOTICE.map((s) => (
          <section key={s.title}>
            <h2 className="font-semibold">{s.title}</h2>
            <p className="mt-1 leading-relaxed text-text/90">{s.body}</p>
          </section>
        ))}
      </div>
    </PublicShell>
  );
}
