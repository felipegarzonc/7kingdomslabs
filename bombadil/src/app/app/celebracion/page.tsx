import type { Metadata } from "next";
import { WeekDots } from "@/components/game";
import { Flame } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { todayInColombia } from "@/domain/habits";
import { requireParticipant } from "@/lib/auth";
import { getGame } from "@/lib/data/game";

export const metadata: Metadata = { title: "¡Día completo!" };

/** Shown right after the last habit of the day: immediate, specific reward. */
export default async function CelebrationPage() {
  const { participant: p } = await requireParticipant();
  const game = await getGame(p.id);
  const today = todayInColombia();
  const s = game.streak;
  const toShield = 7 - (s.current % 7);
  const identity =
    s.current >= 7 ? "Ya eres alguien que se cuida todos los días." : s.current >= 3 ? "Estás construyendo a alguien que se cuida todos los días." : "Cada día cuenta: así empiezan los hábitos que duran.";

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#1c4585] px-6 py-12 text-white md:mx-0 md:my-0 md:min-h-[calc(100dvh-4rem)] md:rounded-3xl">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <span className="flex size-48 items-center justify-center rounded-full bg-[#2457a6]">
          <Flame size={130} />
        </span>
        <div>
          <p className="font-serif text-8xl leading-none font-bold text-gold">{s.current}</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">{s.current === 1 ? "día de racha" : "días de racha"}</h1>
          <p className="mt-3 text-lg text-white/85">
            {identity} {s.shields < 2 ? (toShield === 1 ? "Mañana ganas un escudo." : `En ${toShield} días ganas un escudo.`) : "Tienes tus dos escudos listos."}
          </p>
        </div>
        <WeekDots cells={game.heatmap} today={today} onDark />
        <dl className="grid w-full grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gold-soft p-3 text-[#3b2a05]">
            <dt className="text-xs font-black tracking-wider uppercase">XP hoy</dt>
            <dd className="text-3xl font-black">+{game.today.xp}</dd>
          </div>
          <div className="rounded-2xl bg-[#e4ecf8] p-3 text-[#163a72]">
            <dt className="text-xs font-black tracking-wider uppercase">Hábitos</dt>
            <dd className="text-3xl font-black">
              {game.today.done}/{game.today.target}
            </dd>
          </div>
          <div className="rounded-2xl bg-[#ecebf8] p-3 text-[#2f2e74]">
            <dt className="text-xs font-black tracking-wider uppercase">Al nivel {game.level + 1}</dt>
            <dd className="text-3xl font-black">{game.xpForNext - game.xpIntoLevel} XP</dd>
          </div>
        </dl>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/app/progreso" variant="secondary" className="min-h-12 border-white/40! bg-transparent! text-white! hover:bg-white/10!">
            Ver mi personaje
          </LinkButton>
          <LinkButton href="/app" className="min-h-12 bg-gold! px-8 text-base text-[#3b2a05]!">
            Continuar
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
