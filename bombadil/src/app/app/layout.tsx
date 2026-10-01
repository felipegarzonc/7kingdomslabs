import { AppShell } from "@/components/app-shell";
import { requireParticipant } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/app", label: "Hoy" },
  { href: "/app/plan", label: "Mi plan" },
  { href: "/app/examenes", label: "Exámenes" },
  { href: "/app/linea-de-tiempo", label: "Progreso" },
  { href: "/app/conexiones", label: "Dispositivos" },
  { href: "/app/datos", label: "Mis datos" },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  await requireParticipant();
  return (
    <AppShell links={LINKS} home="/app">
      {children}
    </AppShell>
  );
}
