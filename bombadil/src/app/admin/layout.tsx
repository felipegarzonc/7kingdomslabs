import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Piloto" },
  { href: "/admin/participantes", label: "Participantes" },
  { href: "/admin/documentos", label: "Exámenes" },
  { href: "/admin/checkins", label: "Check-ins" },
  { href: "/admin/alertas", label: "Alertas" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <AppShell links={LINKS} home="/admin" badge={<Badge tone="info">Operador</Badge>}>
      {children}
    </AppShell>
  );
}
