import type { Metadata } from "next";
import Link from "next/link";
import { DOC_STATUS } from "@/components/doc-status";
import { fmtDate, fmtDateTime } from "@/components/format";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Exámenes" };

export default async function DocumentsQueue({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireAdmin();
  const { all } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("lab_documents").select("id, lab_name, original_filename, sampled_on, status, created_at, extraction_error, participants(display_name, email)").order("created_at", { ascending: false }).limit(200);
  if (!all) q = q.neq("status", "reviewed");
  const { data } = await q;
  return (
    <>
      <PageHeader
        title="Exámenes"
        subtitle="Las extracciones se guardan y analizan automáticamente. Aquí aparecen las que fallaron o no se pudieron guardar; puedes corregir cualquiera."
        action={
          <Link href={all ? "/admin/documentos" : "/admin/documentos?all=1"} className="text-sm text-accent">
            {all ? "Solo pendientes" : "Ver todos"}
          </Link>
        }
      />
      <Card>
        {data?.length ? (
          <Table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Documento</th>
                <th>Toma</th>
                <th>Subido</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => {
                const p = d.participants as unknown as { display_name: string | null; email: string } | null;
                return (
                  <tr key={d.id}>
                    <td>{p?.display_name ?? p?.email}</td>
                    <td>
                      <Link href={`/admin/documentos/${d.id}`} className="font-medium text-accent">
                        {d.lab_name ?? d.original_filename ?? "PDF"}
                      </Link>
                      {d.extraction_error ? <p className="text-xs text-warn">{d.extraction_error}</p> : null}
                    </td>
                    <td>{fmtDate(d.sampled_on)}</td>
                    <td>{fmtDateTime(d.created_at)}</td>
                    <td>
                      <Badge tone={DOC_STATUS[d.status]?.tone ?? "neutral"}>{d.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="Nada pendiente" />
        )}
      </Card>
    </>
  );
}
