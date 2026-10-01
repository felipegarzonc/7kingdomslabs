import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { fmtDate, fmtNum } from "@/components/format";
import { ImagingView, imagingTitle } from "@/components/imaging-view";
import { ReportView } from "@/components/report-view";
import { Badge, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { BIOMARKER_BY_CODE } from "@/domain/biomarkers";
import { requireParticipant } from "@/lib/auth";
import type { StoredImaging } from "@/lib/llm/imaging";
import type { ReportContent } from "@/lib/llm/report";
import { NO_LAB_RESULTS } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resultado del examen" };

const FLAG: Record<string, { label: string; tone: "good" | "warn" | "danger" }> = {
  normal: { label: "En rango", tone: "good" },
  high: { label: "Alto", tone: "warn" },
  low: { label: "Bajo", tone: "warn" },
};

/** Within the five minutes after an analysis, the plan is still being regenerated. */
function isRecent(iso: string) {
  return Date.now() - Date.parse(iso) < 5 * 60_000;
}

export default async function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("lab_documents")
    .select("id, kind, status, imaging, sampled_on, lab_name, original_filename, extraction_error, reviewed_at")
    .eq("id", id)
    .eq("participant_id", p.id)
    .maybeSingle();
  if (!doc) notFound();

  const working = doc.status === "uploaded" || doc.status === "extracting";
  const [results, report] = await Promise.all([
    doc.kind === "lab" && doc.status === "reviewed"
      ? supabase.from("lab_results").select("biomarker_code, value_canonical, lab_ref_low, lab_ref_high, flag").eq("document_id", id)
      : Promise.resolve({ data: [] as Array<{ biomarker_code: string; value_canonical: number; lab_ref_low: number | null; lab_ref_high: number | null; flag: string | null }> }),
    supabase.from("reports").select("content, approved_at").eq("participant_id", p.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  // The plan is regenerated right after each analysis; show it once it is newer than this exam.
  const freshReport = report.data && doc.reviewed_at && report.data.approved_at >= doc.reviewed_at ? (report.data.content as ReportContent) : null;
  const planPending = doc.status === "reviewed" && !freshReport && !!doc.reviewed_at && isRecent(doc.reviewed_at);
  const title = doc.kind === "imaging" && doc.imaging ? imagingTitle(doc.imaging as StoredImaging) : (doc.lab_name ?? doc.original_filename ?? "Examen de laboratorio");

  return (
    <>
      {working || planPending ? <AutoRefresh /> : null}
      <PageHeader
        title={title}
        subtitle={
          <>
            <Link href="/app/examenes" className="text-accent">
              ← Exámenes
            </Link>
            {doc.sampled_on ? ` · ${fmtDate(doc.sampled_on)}` : ""} ·{" "}
            <a href={`/app/examenes/${doc.id}/pdf`} target="_blank" rel="noopener" className="text-accent">
              Ver PDF
            </a>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {working ? (
          <Notice tone="info" title="Analizando tu examen…">
            Ocultamos tus datos personales, leemos el informe y preparamos qué significa y qué hacer. Suele tardar uno o dos minutos; esta página se actualiza sola.
          </Notice>
        ) : null}
        {doc.status === "failed" ? (
          <Notice tone="warn" title="No pudimos leer este PDF">
            {doc.extraction_error === NO_LAB_RESULTS ? NO_LAB_RESULTS : "Puede ser un PDF escaneado o una foto. El equipo transcribirá los valores; también puedes subir el PDF original del laboratorio."}
          </Notice>
        ) : null}
        {doc.status === "extracted" ? (
          <Notice tone="warn">Ningún valor coincidió con los exámenes que interpretamos. El equipo lo revisará.</Notice>
        ) : null}

        {doc.kind === "imaging" && doc.imaging ? <ImagingView imaging={doc.imaging as StoredImaging} /> : null}

        {results.data?.length ? (
          <Card title="Tus resultados">
            <ul className="divide-y divide-border">
              {results.data.map((r) => {
                const b = BIOMARKER_BY_CODE.get(r.biomarker_code);
                const f = FLAG[r.flag ?? "normal"] ?? FLAG.normal;
                const range = r.lab_ref_low !== null || r.lab_ref_high !== null ? `${r.lab_ref_low ?? "—"} – ${r.lab_ref_high ?? "—"}` : null;
                return (
                  <li key={r.biomarker_code} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <Link href={`/app/linea-de-tiempo/${r.biomarker_code}`} className="min-w-0 text-accent underline">
                      {b?.name ?? r.biomarker_code}
                    </Link>
                    <span className="flex items-center gap-2 tabular-nums">
                      {fmtNum(Number(r.value_canonical))} {b?.unit}
                      {range ? <span className="text-xs text-muted">(ref. {range})</span> : null}
                      <Badge tone={f.tone}>{f.label}</Badge>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        {doc.status === "reviewed" ? (
          freshReport ? (
            <Card title="Qué significa y qué hacer">
              <ReportView content={freshReport} />
            </Card>
          ) : planPending ? (
            <Notice tone="info" title="Preparando tu plan…">
              Estamos conectando este examen con el resto de tus datos para decirte qué hacer. Esta página se actualiza sola.
            </Notice>
          ) : report.data ? (
            <Card title="Tu plan de salud más reciente">
              <ReportView content={report.data.content as ReportContent} />
            </Card>
          ) : null
        ) : null}

        {doc.status === "reviewed" ? (
          <Card>
            <p className="text-sm">Lo que de verdad cambia tu salud son los hábitos de todos los días.</p>
            <LinkButton href="/app/plan" className="mt-3">
              Convertir esto en hábitos
            </LinkButton>
          </Card>
        ) : null}
      </div>
    </>
  );
}
