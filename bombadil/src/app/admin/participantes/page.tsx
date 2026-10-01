import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate } from "@/components/format";
import { Badge, Card, LinkButton, PageHeader, Table } from "@/components/ui";
import { requireAdmin, type ParticipantRow } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Participantes" };

const STATUS = { invited: ["Invitado", "neutral"], active: ["Activo", "good"], withdrawn: ["Retirado", "warn"], completed: ["Terminó", "info"] } as const;

export default async function ParticipantsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
  const ps = (data ?? []) as ParticipantRow[];
  return (
    <>
      <PageHeader title="Participantes" subtitle={`${ps.length} en el piloto`} action={<LinkButton href="/admin/participantes/nuevo">Invitar</LinkButton>} />
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Inicio</th>
            </tr>
          </thead>
          <tbody>
            {ps.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="font-medium text-accent" href={`/admin/participantes/${p.id}`}>
                    {p.display_name ?? "—"}
                  </Link>
                </td>
                <td className="text-muted">{p.email}</td>
                <td>
                  <Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge>
                </td>
                <td>{fmtDate(p.pilot_start)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
