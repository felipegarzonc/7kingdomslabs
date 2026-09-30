import { AppShell } from "@/components/app-shell";
import { requireParticipant } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/app", label: "Inicio" },
  { href: "/app/checkin", label: "Check-in" },
  { href: "/app/mediciones", label: "Mediciones" },
  { href: "/app/linea-de-tiempo", label: "Línea de tiempo" },
  { href: "/app/examenes", label: "Exámenes" },
  { href: "/app/metas", label: "Metas" },
  { href: "/app/informes", label: "Informes" },
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
