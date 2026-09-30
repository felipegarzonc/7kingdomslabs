import type { Metadata } from "next";
import { PublicShell } from "@/components/brand";
import { Card } from "@/components/ui";
import { createServiceClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Estado" };
export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; fix: string };

/**
 * Deployment self-check. Shows only pass/fail, never values, so it is safe to
 * leave public: it helps the operator finish setup on Vercel/Supabase.
 */
async function runChecks(): Promise<Check[]> {
  const has = (k: string) => !!process.env[k];
  const checks: Check[] = [
    { label: "NEXT_PUBLIC_SUPABASE_URL", ok: has("NEXT_PUBLIC_SUPABASE_URL"), fix: "Vercel → Settings → Environment Variables. Copia el Project URL de Supabase (Project Settings → API)." },
    { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"), fix: "La llave anon/public de Supabase (Project Settings → API)." },
    { label: "SUPABASE_SERVICE_ROLE_KEY", ok: has("SUPABASE_SERVICE_ROLE_KEY"), fix: "La llave service_role de Supabase (Project Settings → API). Solo en Vercel, nunca en el navegador." },
    { label: "ANTHROPIC_API_KEY", ok: has("ANTHROPIC_API_KEY"), fix: "Crea una llave en console.anthropic.com. Sin ella la app funciona, pero no lee PDFs ni redacta informes." },
    { label: "NEXT_PUBLIC_SITE_URL", ok: has("NEXT_PUBLIC_SITE_URL"), fix: "La dirección pública de la app, p. ej. https://bombadil.vercel.app (sin / al final)." },
  ];
  let dbOk = false;
  let adminOk = false;
  let bucketOk = false;
  if (has("NEXT_PUBLIC_SUPABASE_URL") && has("SUPABASE_SERVICE_ROLE_KEY")) {
    try {
      const db = createServiceClient();
      const [bio, admins, bucket] = await Promise.all([
        db.from("biomarkers").select("code", { count: "exact", head: true }),
        db.from("admins").select("user_id", { count: "exact", head: true }),
        db.storage.getBucket("lab-pdfs"),
      ]);
      dbOk = !bio.error && (bio.count ?? 0) > 0;
      adminOk = !admins.error && (admins.count ?? 0) > 0;
      bucketOk = !bucket.error;
    } catch {
      // reported as failed checks below
    }
  }
  checks.push(
    { label: "Base de datos creada (setup.sql)", ok: dbOk, fix: "Supabase → SQL Editor → New query: pega supabase/setup.sql y pulsa Run." },
    { label: "Almacenamiento de PDFs", ok: bucketOk, fix: "Se crea con supabase/setup.sql. Si falla, vuelve a correrlo." },
    { label: "Cuenta de operador", ok: adminOk, fix: "Crea tu cuenta de operador (ver README → bootstrap-admin, o pídele ayuda a Claude)." },
  );
  return checks;
}

export default async function StatusPage() {
  const checks = await runChecks();
  const pending = checks.filter((c) => !c.ok).length;
  return (
    <PublicShell>
      <h1 className="font-serif text-3xl font-semibold">Estado de la instalación</h1>
      <p className="mt-2 mb-6 text-sm text-muted">{pending ? `Faltan ${pending} paso(s).` : "Todo listo. Entra en /login."}</p>
      <Card>
        <ul className="divide-y divide-border text-sm">
          {checks.map((c) => (
            <li key={c.label} className="py-3">
              <p className="font-medium">
                <span aria-hidden className={c.ok ? "text-accent" : "text-danger"}>
                  {c.ok ? "✓" : "✗"}
                </span>{" "}
                {c.label}
              </p>
              {!c.ok ? <p className="mt-1 text-muted">{c.fix}</p> : null}
            </li>
          ))}
        </ul>
      </Card>
    </PublicShell>
  );
}
