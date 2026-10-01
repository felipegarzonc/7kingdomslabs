import Link from "next/link";
import type { GameState } from "@/domain/game";
import { GameRail } from "./game";
import { GameCelebration } from "./game-celebration";
import { SideNav, type SideLink } from "./side-nav";

/**
 * Participant app frame, after Duolingo on the web: menu on the left, the
 * page in the middle and the player's stats always in view on the right.
 */
export function ParticipantShell({ children, links, game }: { children: React.ReactNode; links: SideLink[]; game: GameState }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_360px]">
      <aside className="sticky top-0 z-20 flex flex-col gap-2 border-b-2 border-border bg-surface px-2 py-2 md:h-dvh md:border-r-2 md:border-b-0 md:px-4 md:py-6">
        <div className="flex items-center justify-between gap-2 md:mb-4 md:px-2">
          <Link href="/app" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bombadil-icon.svg" alt="" width={40} height={40} className="rounded-xl" />
            <span className="font-serif text-2xl font-bold">Bombadil</span>
          </Link>
          <form action="/auth/signout" method="post" className="md:hidden">
            <button className="rounded-lg px-2 py-1 text-sm font-bold text-muted hover:bg-surface-2">Salir</button>
          </form>
        </div>
        <SideNav links={links} />
        <div className="mt-auto hidden flex-col gap-3 md:flex">
          <p className="rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            Bombadil acompaña hábitos; no diagnostica ni reemplaza a tu médico. Emergencias: 123.{" "}
            <Link href="/privacidad" className="underline">
              Privacidad
            </Link>
          </p>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-muted hover:bg-surface-2">Salir</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6 md:px-8 md:py-8">
        <GameCelebration xp={game.xp} level={game.level} title={game.title} achievements={game.achievements.filter((a) => a.unlocked).map((a) => a.title)} />
        {children}
      </main>
      <aside className="px-4 pb-10 md:col-start-2 xl:col-start-auto xl:sticky xl:top-0 xl:h-dvh xl:overflow-y-auto xl:py-8 xl:pr-8 xl:pl-2" aria-label="Tu progreso">
        <GameRail game={game} />
      </aside>
    </div>
  );
}
