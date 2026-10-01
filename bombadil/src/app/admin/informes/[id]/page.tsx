import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDateTime } from "@/components/format";
import { ReportView } from "@/components/report-view";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import type { Snapshot } from "@/domain/snapshot";
import { logAdminAccess } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import type { ReportContent } from "@/lib/llm/report";
import { createClient } from "@/lib/supabase/server";
import { discardReport } from "../../actions";
import { ReportEditor } from "./report-editor";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: r } = await supabase.from("reports").select("*, participants(display_name, email)").eq("id", id).maybeSingle();
  if (!r) notFound();
  await logAdminAccess(supabase, admin.userId, "view_report", r.participant_id, { report_id: id });
  const p = r.participants as { display_name: string | null; email: string };
  const snapshot = r.input_snapshot as Snapshot;
  const content = r.content as ReportContent;

  return (
    <>
      <PageHeader
        title="Informe"
        subtitle={
          <>
            <Link href={`/admin/participantes/${r.participant_id}`} className="text-accent">
              {p.display_name ?? p.email}
            </Link>{" "}
            · {fmtDateTime(r.created_at)} · {r.prompt_version} · {r.model} · <Badge tone={r.status === "approved" ? "good" : "warn"}>{r.status}</Badge>
          </>
        }
        action={
          r.status === "draft" ? (
            <form action={discardReport}>
              <input type="hidden" name="report_id" value={id} />
              <SubmitButton variant="ghost" confirm="¿Descartar este borrador?">
                Descartar borrador
              </SubmitButton>
            </form>
          ) : null
        }
      />
      {r.status === "approved" ? (
        <div className="mb-4">
          <Notice tone="good">Informe aprobado y publicado el {fmtDateTime(r.approved_at)}. El participante ya lo ve y sus prioridades se actualizaron.</Notice>
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={r.status === "draft" ? "Editar antes de aprobar" : "Contenido publicado"}>{r.status === "draft" ? <ReportEditor reportId={id} content={content} /> : <ReportView content={content} />}</Card>
        <div className="flex flex-col gap-4">
          <Card title="Vista previa del participante">
            <ReportView content={content} />
          </Card>
          <Card title="Datos de entrada (snapshot calculado)">
            <p className="mb-2 text-xs text-muted">Verifica que cada cifra del texto venga de aquí. Escalamientos calculados: {snapshot.escalations?.map((e) => `${e.level}:${e.ruleId}`).join(", ") || "ninguno"}.</p>
            <details>
              <summary className="cursor-pointer text-sm text-accent">Ver JSON</summary>
              <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-surface-2 p-3 text-xs">{JSON.stringify(snapshot, null, 2)}</pre>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}
