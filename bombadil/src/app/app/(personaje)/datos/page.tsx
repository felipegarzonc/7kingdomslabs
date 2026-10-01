import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime } from "@/components/format";
import { PushToggle } from "@/components/push-toggle";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { setShare } from "@/app/app/actions";
import { prefsOf, requireParticipant } from "@/lib/auth";
import { env } from "@/lib/env";
import { vapidKeys } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm, PreferencesForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Mis datos" };

export default async function MyDataPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const prefs = prefsOf(p);
  const shareUrl = p.share_token ? `${env.siteUrl()}/compartir/${p.share_token}` : null;
  const { data: consents } = await supabase.from("consents").select("version, accepted_at").eq("participant_id", p.id).order("accepted_at", { ascending: false });
  return (
    <>
      <PageHeader title="Mis datos" subtitle="Tus derechos bajo la Ley 1581 de 2012: conocer, actualizar, descargar y suprimir tus datos." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Perfil">
          <ProfileForm height={p.height_cm} goal={p.personal_goal} smoking={p.smoking_status} />
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Recordatorios">
            <p className="mb-3 text-sm text-muted">Una notificación a la hora de cada hábito, solo si aún no lo marcaste. La hora se ajusta en cada hábito, en El camino.</p>
            <PushToggle publicKey={vapidKeys().publicKey} />
          </Card>
          <Card title="Preferencias">
            <PreferencesForm sober={prefs.sober} remindersEmail={prefs.reminders_email} emailAvailable={!!env.resend()} />
          </Card>
        </div>
        <Card title="Acompañante" className="md:col-span-2">
          <p className="text-sm text-muted">
            Comparte un enlace con alguien que te anime: verá tu racha, tus días de esta semana y tu nivel. Nunca tus exámenes, mediciones ni datos de salud. Puedes apagarlo cuando quieras.
          </p>
          {shareUrl ? (
            <div className="mt-3 flex flex-col gap-3">
              <input readOnly value={shareUrl} aria-label="Enlace para tu acompañante" className="w-full rounded-xl border-2 border-border bg-surface-2 px-3 py-2 font-mono text-sm" />
              <div className="flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(`Acompáñame en mis hábitos de salud: ${shareUrl}`)}`} target="_blank" rel="noreferrer" className={buttonClass("primary")}>
                  Enviar por WhatsApp
                </a>
                <form action={setShare}>
                  <input type="hidden" name="enabled" value="false" />
                  <SubmitButton variant="secondary">Dejar de compartir</SubmitButton>
                </form>
              </div>
            </div>
          ) : (
            <form action={setShare} className="mt-3">
              <input type="hidden" name="enabled" value="true" />
              <SubmitButton variant="secondary">Crear enlace para mi acompañante</SubmitButton>
            </form>
          )}
        </Card>
        <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <Card title="Descargar mis datos">
            <p className="mb-3 text-sm text-muted">Un archivo JSON con todo lo que tenemos sobre ti: perfil, consentimientos, exámenes transcritos, mediciones, metas, check-ins, informes y alertas.</p>
            {/* Plain anchor: a route handler download must not go through client-side navigation. */}
            <a href="/app/datos/exportar" download className={buttonClass("secondary")}>
              Descargar (JSON)
            </a>
          </Card>
          <Card title="Consentimiento">
            <ul className="text-sm">
              {consents?.map((c) => (
                <li key={c.accepted_at}>
                  Versión {c.version} · aceptado {fmtDateTime(c.accepted_at)}
                </li>
              ))}
            </ul>
            <Link href="/consentimiento" className="mt-2 inline-block text-sm text-accent underline">
              Leer el texto
            </Link>
          </Card>
        </div>
        <Card title="Eliminar mi cuenta" className="border-danger/40 md:col-span-2">
          <p className="mb-3 text-sm text-muted">Borra de forma permanente tu cuenta, tus PDFs y todos tus registros. Esto revoca tu participación en el piloto y no se puede deshacer.</p>
          <DeleteAccountForm />
        </Card>
      </div>
    </>
  );
}
