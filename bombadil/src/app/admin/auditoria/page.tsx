import type { Metadata } from "next";
import { fmtDateTime } from "@/components/format";
import { Card, PageHeader, Table } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Auditoría" };

export default async function AuditPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: log }, { data: ps }] = await Promise.all([
    supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(300),
    supabase.from("participants").select("id, display_name, email"),
  ]);
  const name = new Map((ps ?? []).map((p) => [p.id, p.display_name ?? p.email]));
  return (
    <>
      <PageHeader title="Auditoría" subtitle="Registro inmutable de accesos del operador a datos de participantes (últimos 300)." />
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Participante</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(log ?? []).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{fmtDateTime(l.at)}</td>
                <td>{l.action}</td>
                <td>{l.participant_id ? name.get(l.participant_id) ?? l.participant_id.slice(0, 8) : "—"}</td>
                <td className="font-mono text-xs text-muted">{Object.keys(l.detail ?? {}).length ? JSON.stringify(l.detail) : ""}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
