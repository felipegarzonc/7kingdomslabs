import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDateTime } from "@/components/format";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { BIOMARKERS, matchBiomarker } from "@/domain/biomarkers";
import { logAdminAccess } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import type { Extraction } from "@/lib/llm/extract";
import { createClient } from "@/lib/supabase/server";
import { rerunExtraction } from "../../actions";
import { ReviewForm, type ReviewRowInput } from "./review-form";

export const maxDuration = 300;

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: doc } = await supabase.from("lab_documents").select("*, participants(display_name, email, sex)").eq("id", id).maybeSingle();
  if (!doc) notFound();
  await logAdminAccess(supabase, admin.userId, "view_lab_document", doc.participant_id, { document_id: id });
  const p = doc.participants as { display_name: string | null; email: string; sex: string | null };
  const extraction = doc.extraction as Extraction | null;

  let rows: ReviewRowInput[];
  if (doc.status === "reviewed") {
    const { data: results } = await supabase.from("lab_results").select("*").eq("document_id", id);
    rows = (results ?? []).map((r) => ({
      printed: "",
      code: r.biomarker_code,
      value: Number(r.value_original),
      unit: r.unit_original,
      low: null,
      high: null,
      include: true,
    }));
    // Show the original lab ranges from the extraction when available.
    for (const r of rows) {
      const src = extraction?.results.find((x) => (x.biomarker_code ?? matchBiomarker(x.name_as_printed)) === r.code);
      if (src) Object.assign(r, { printed: src.name_as_printed, low: src.ref_low, high: src.ref_high });
    }
  } else {
    rows = (extraction?.results ?? []).map((r) => {
      const code = r.biomarker_code ?? matchBiomarker(r.name_as_printed);
      return { printed: `${r.section ? r.section + " · " : ""}${r.name_as_printed}`, code, value: r.value, unit: r.unit ?? "", low: r.ref_low, high: r.ref_high, include: !!code, qualifier: r.qualifier };
    });
  }
  if (!rows.length) rows = Array.from({ length: 6 }, () => ({ printed: "", code: null, value: null, unit: "", low: null, high: null, include: true }));

  return (
    <>
      <PageHeader
        title="Revisión de examen"
        subtitle={
          <>
            <Link href={`/admin/participantes/${doc.participant_id}`} className="text-accent">
              {p.display_name ?? p.email}
            </Link>{" "}
            · subido {fmtDateTime(doc.created_at)} · <Badge>{doc.status}</Badge>
            {doc.prompt_version ? (
              <span className="text-xs">
                {" "}
                · {doc.prompt_version} · {doc.model} · {doc.redactions ?? 0} datos enmascarados
              </span>
            ) : null}
          </>
        }
        action={
          <form action={rerunExtraction}>
            <input type="hidden" name="document_id" value={id} />
            <SubmitButton variant="secondary" pendingText="Extrayendo…" confirm={doc.status === "reviewed" ? "Ya está revisado. ¿Volver a extraer? (no cambia los resultados guardados hasta que confirmes la revisión)" : undefined}>
              Volver a extraer
            </SubmitButton>
          </form>
        }
      />
      {doc.status === "failed" ? (
        <div className="mb-4">
          <Notice tone="warn" title="La extracción automática falló">
            {doc.extraction_error} Puedes transcribir los valores a mano en la tabla.
          </Notice>
        </div>
      ) : null}
      {doc.status === "extracting" || doc.status === "uploaded" ? (
        <div className="mb-4">
          <Notice tone="info">La extracción está en curso. Recarga en un momento.</Notice>
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="min-h-[70vh] p-0 sm:p-0">
          <iframe src={`/admin/documentos/${id}/pdf`} title="PDF original" className="h-[70vh] w-full rounded-2xl" />
        </Card>
        <Card title="Resultados extraídos">
          <p className="mb-3 text-xs text-muted">
            Marca solo las filas que correspondan a biomarcadores del catálogo, corrige lo necesario y confirma. Los valores se convierten a la unidad canónica y se clasifican con el rango del laboratorio cuando exista. Sexo: {p.sex ?? "—"}.
          </p>
          <ReviewForm documentId={id} rows={rows} sampledOn={doc.sampled_on} labName={doc.lab_name} biomarkers={BIOMARKERS.map((b) => ({ code: b.code, name: b.name, unit: b.unit }))} />
        </Card>
      </div>
    </>
  );
}
