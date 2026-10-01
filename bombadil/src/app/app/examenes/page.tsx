import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate } from "@/components/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireParticipant } from "@/lib/auth";
import { NO_LAB_RESULTS } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";
import { DOC_STATUS } from "@/components/doc-status";
import { imagingTitle } from "@/components/imaging-view";
import type { StoredImaging } from "@/lib/llm/imaging";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Exámenes" };
export const maxDuration = 300;



export default async function LabsPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("lab_documents")
    .select("id, original_filename, lab_name, sampled_on, status, created_at, extraction_error, kind, imaging")
    .eq("participant_id", p.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Exámenes" subtitle="Sube exámenes de laboratorio e informes de imágenes de cualquier año. Entre más historia, mejor la lectura de tendencias." />
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
                      <Link href={`/app/examenes/${d.id}`} className="block truncate font-medium text-accent underline">
                        {d.kind === "imaging" && d.imaging ? imagingTitle(d.imaging as StoredImaging) : (d.lab_name ?? d.original_filename ?? "Examen")}
                      </Link>
                      <p className="text-xs text-muted">
                        {d.kind === "imaging" ? "Estudio" : "Toma"}: {fmtDate(d.sampled_on)} · subido {fmtDate(d.created_at)}
                      </p>
                      {d.status === "failed" ? (
                        <p className="mt-1 text-xs text-warn">
                          {d.extraction_error === NO_LAB_RESULTS ? NO_LAB_RESULTS : "No pudimos leer este PDF automáticamente (por ejemplo, si es escaneado). El equipo transcribirá los valores."}
                        </p>
                      ) : d.status === "extracted" ? (
                        <p className="mt-1 text-xs text-muted">Ningún valor coincidió con los exámenes que interpretamos; el equipo lo revisará.</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={s.tone}>{d.kind === "imaging" && d.status === "reviewed" ? "Interpretado" : s.label}</Badge>
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
            Antes de leerlo, ocultamos tu nombre, documento y datos de contacto. Los exámenes de laboratorio se transcriben y analizan solos (solo se guardan los valores que el sistema reconoce con certeza). Los informes de imágenes (resonancias, ecografías, radiografías, tomografías) se explican en lenguaje sencillo. El equipo puede corregir todo después.
          </p>
        </Card>
      </div>
    </>
  );
}
