import type { Metadata } from "next";
import { fmtDate } from "@/components/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOC_STATUS } from "@/components/doc-status";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Exámenes" };
export const maxDuration = 300;



export default async function LabsPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("lab_documents")
    .select("id, original_filename, lab_name, sampled_on, status, created_at")
    .eq("participant_id", p.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Exámenes" subtitle="Sube tus exámenes de cualquier laboratorio y año. Entre más historia, mejor la lectura de tendencias." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card title="Subir un examen" className="self-start">
          <UploadForm />
        </Card>
        <Card title="Tus exámenes">
          {docs?.length ? (
            <ul className="divide-y divide-border">
              {docs.map((d) => {
                const s = DOC_STATUS[d.status] ?? DOC_STATUS.uploaded;
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.lab_name ?? d.original_filename ?? "Examen"}</p>
                      <p className="text-xs text-muted">
                        Toma: {fmtDate(d.sampled_on)} · subido {fmtDate(d.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={s.tone}>{s.label}</Badge>
                      <a href={`/app/examenes/${d.id}/pdf`} target="_blank" rel="noopener" className="text-xs font-medium text-accent">
                        Ver PDF
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Aún no has subido exámenes" />
          )}
          <p className="mt-4 text-xs text-muted">
            Antes de transcribir, ocultamos tu nombre, documento y datos de contacto. La transcripción y el análisis son automáticos; solo se guardan los valores que el sistema reconoce con certeza, y el equipo puede corregirlos después.
          </p>
        </Card>
      </div>
    </>
  );
}
