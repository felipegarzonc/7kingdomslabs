import type { Metadata } from "next";
import { fmtDate } from "@/components/format";
import { ReportView } from "@/components/report-view";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireParticipant } from "@/lib/auth";
import type { ReportContent } from "@/lib/llm/report";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Informes" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { participant: p } = await requireParticipant();
  const { id } = await searchParams;
  const supabase = await createClient();
  // RLS only returns approved reports to participants.
  const { data: reports } = await supabase.from("reports").select("id, content, approved_at").eq("participant_id", p.id).eq("status", "approved").order("approved_at", { ascending: false });
  const current = reports?.find((r) => r.id === id) ?? reports?.[0];

  return (
    <>
      <PageHeader title="Informes" subtitle="Interpretación de tus datos, revisada por el equipo. No es un diagnóstico." />
      {current ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
          <Card>
            <p className="mb-4 text-xs text-muted">Aprobado el {fmtDate(current.approved_at)}</p>
            <ReportView content={current.content as ReportContent} />
          </Card>
          {reports && reports.length > 1 ? (
            <Card title="Anteriores" className="self-start">
              <ul className="flex flex-col gap-1 text-sm">
                {reports.map((r) => (
                  <li key={r.id}>
                    <a href={`?id=${r.id}`} className={r.id === current.id ? "font-semibold" : "text-accent"}>
                      {fmtDate(r.approved_at)}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : (
        <EmptyState title="Aún no tienes informes">Cuando el equipo revise tus exámenes, preparará tu primer informe con 1 a 3 prioridades.</EmptyState>
      )}
    </>
  );
}
