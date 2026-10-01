import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime } from "@/components/format";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Mis datos" };

export default async function MyDataPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const { data: consents } = await supabase.from("consents").select("version, accepted_at").eq("participant_id", p.id).order("accepted_at", { ascending: false });
  return (
    <>
      <PageHeader title="Mis datos" subtitle="Tus derechos bajo la Ley 1581 de 2012: conocer, actualizar, descargar y suprimir tus datos." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Perfil">
          <ProfileForm height={p.height_cm} goal={p.personal_goal} smoking={p.smoking_status} />
        </Card>
        <div className="flex flex-col gap-4">
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
