import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DayRing, WeekDots } from "@/components/game";
import { Flame, HatAvatar, Shield } from "@/components/icons";
import { todayInColombia } from "@/domain/habits";
import { prefsOf } from "@/lib/auth";
import { loadGame } from "@/lib/data/game";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acompáñame", robots: { index: false, follow: false } };

/**
 * Read-only page for an accountability buddy. Reached by an unguessable token the
 * participant can revoke. Shows consistency only: no labs, measurements or habit names.
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const db = createServiceClient();
  const { data: p } = await db.from("participants").select("id, display_name, preferences, status").eq("share_token", token).maybeSingle();
  if (!p || p.status === "withdrawn") notFound();
  const game = await loadGame(db, p.id);
  const sober = prefsOf(p).sober;
  const name = p.display_name?.split(" ")[0] ?? "Tu amigo";
  const today = todayInColombia();
  const activeThisWeek = game.heatmap.slice(-7).filter((c) => c.value > 0).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 py-10">
      <header className="flex items-center gap-4">
        <HatAvatar size={72} level={game.level} />
        <div>
          <p className="text-sm font-black tracking-wider text-muted uppercase">Acompañando a</p>
          <h1 className="font-serif text-4xl font-bold">{name}</h1>
          {sober ? null : (
            <p className="font-bold text-accent">
              Nivel {game.level} · {game.title}
            </p>
          )}
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-5 rounded-3xl border-b-[6px] border-black/25 bg-accent p-6 text-white">
        {game.today.target ? <DayRing done={game.today.done} target={game.today.target} onDark /> : null}
        <div className="min-w-48 flex-1">
          <p className="text-sm font-black tracking-wider uppercase opacity-80">Hoy</p>
          <p className="mt-1 text-xl font-bold">
            {game.today.target === 0
              ? "Está armando su plan."
              : game.today.done >= game.today.target
                ? "Cerró el día. ¡Mándale un aplauso!"
                : `Lleva ${game.today.done} de ${game.today.target} hábitos.`}
          </p>
          <div className="mt-4">
            <WeekDots cells={game.heatmap} today={today} onDark />
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-3xl border-2 border-border bg-surface p-4">
          <dt className="text-xs font-black tracking-wider text-muted uppercase">Racha</dt>
          <dd className="mt-1 flex items-center justify-center gap-1 text-2xl font-black text-[#c2410c]">
            <Flame size={24} /> {game.streak.current}
          </dd>
        </div>
        <div className="rounded-3xl border-2 border-border bg-surface p-4">
          <dt className="text-xs font-black tracking-wider text-muted uppercase">Escudos</dt>
          <dd className="mt-1 flex items-center justify-center gap-1 text-2xl font-black text-accent">
            <Shield size={22} /> {game.streak.shields}
          </dd>
        </div>
        <div className="rounded-3xl border-2 border-border bg-surface p-4">
          <dt className="text-xs font-black tracking-wider text-muted uppercase">Esta semana</dt>
          <dd className="mt-1 text-2xl font-black">{activeThisWeek} de 7</dd>
        </div>
      </dl>

      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        Un mensaje tuyo pesa más que cualquier notificación. Si falló un día, recuérdale que lo importante es no fallar dos seguidos. Aquí solo ves su constancia: sus datos de salud son privados.
      </p>
      <p className="text-center text-sm text-muted">
        <Link href="/inicio" className="font-bold text-accent underline">
          ¿Qué es Bombadil?
        </Link>
      </p>
    </main>
  );
}
