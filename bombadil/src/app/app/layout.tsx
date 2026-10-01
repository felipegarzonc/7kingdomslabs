import { ParticipantShell } from "@/components/participant-shell";
import type { SideLink } from "@/components/side-nav";
import { requireParticipant } from "@/lib/auth";
import { getGame } from "@/lib/data/game";

export const dynamic = "force-dynamic";

const LINKS: SideLink[] = [
  { href: "/app", label: "Hoy", icon: "home" },
  { href: "/app/camino", label: "Camino", icon: "path" },
  { href: "/app/misiones", label: "Misiones", icon: "swords" },
  { href: "/app/progreso", label: "Personaje", icon: "user" },
  { href: "/app/plan", label: "Mi plan", icon: "list" },
  { href: "/app/examenes", label: "Exámenes", icon: "flask" },
  { href: "/app/conexiones", label: "Dispositivos", icon: "watch" },
  { href: "/app/datos", label: "Mis datos", icon: "folder" },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const { participant } = await requireParticipant();
  const game = await getGame(participant.id);
  return (
    <ParticipantShell links={LINKS} game={game}>
      {children}
    </ParticipantShell>
  );
}
