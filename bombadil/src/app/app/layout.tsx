import { ParticipantShell } from "@/components/participant-shell";
import { PROFILE_PREFIXES } from "@/components/profile-tabs";
import type { SideLink } from "@/components/side-nav";
import { prefsOf, requireParticipant } from "@/lib/auth";
import { getGame } from "@/lib/data/game";

export const dynamic = "force-dynamic";

// By priority: today's actions, this week's quests, the long path (and adjusting the plan), then everything about you.
const LINKS: SideLink[] = [
  { href: "/app", label: "Hoy", icon: "home" },
  { href: "/app/misiones", label: "Misiones", icon: "swords" },
  { href: "/app/camino", label: "Camino", icon: "path", match: ["/app/plan"] },
  { href: "/app/progreso", label: "Personaje", icon: "user", match: PROFILE_PREFIXES },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const { participant } = await requireParticipant();
  const game = await getGame(participant.id);
  return (
    <ParticipantShell links={LINKS} game={game} sober={prefsOf(participant).sober}>
      {children}
    </ParticipantShell>
  );
}
