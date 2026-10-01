import type { Metadata } from "next";
import Link from "next/link";
import { AchievementGrid, AttributeList, Bar, Heatmap } from "@/components/game";
import { HatAvatar } from "@/components/icons";
import { Card, LinkButton } from "@/components/ui";
import { SHIELD_EVERY, SHIELD_MAX, XP } from "@/domain/game";
import { buildSnapshot } from "@/domain/snapshot";
import { requireParticipant } from "@/lib/auth";
import { getGame } from "@/lib/data/game";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Personaje" };

const fmt = (n: number) => n.toLocaleString("es-CO");

export default async function CharacterPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const snapshot = buildSnapshot(toSnapshotInput(p, await loadParticipantData(supabase, p.id)));
  const game = await getGame(p.id, snapshot.goals.filter((g) => g.status === "achieved").length);
  const unlocked = game.achievements.filter((a) => a.unlocked);
  const activeDays = game.heatmap.filter((c) => c.value > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-5">
        <HatAvatar size={104} level={game.level} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-4xl leading-tight font-bold">{game.title}</h1>
          <p className="mt-1 font-semibold text-muted">
            {p.display_name ? `${p.display_name} · ` : ""}
            {fmt(game.xp)} XP · mejor racha {game.streak.best} {game.streak.best === 1 ? "día" : "días"} · {activeDays} días activos en 12 semanas
          </p>
          {p.personal_goal ? <p className="mt-1 font-bold text-accent">Rumbo a: «{p.personal_goal}»</p> : null}
          <Bar value={game.levelProgress} label="Experiencia hacia el siguiente nivel" className="mt-3 h-3.5 max-w-sm" />
          <p className="mt-1 text-sm font-bold text-muted">
            {fmt(game.xpIntoLevel)} / {fmt(game.xpForNext)} XP para el nivel {game.level + 1}
          </p>
        </div>
      </section>

      <Card title="Atributos" action={<span className="text-sm font-bold text-muted">Suben con los hábitos de cada pilar</span>}>
        <AttributeList attributes={game.attributes} />
      </Card>

      <Card title="Constancia" action={<span className="text-sm font-bold text-muted">Últimas 12 semanas</span>}>
        <dl className="mb-4 grid grid-cols-3 gap-3 text-center">
          {[
            ["Racha actual", game.streak.current],
            ["Mejor racha", game.streak.best],
            ["Escudos", game.streak.shields],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs font-black tracking-wider text-muted uppercase">{k}</dt>
              <dd className="text-2xl font-black tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <Heatmap cells={game.heatmap} />
        <p className="mt-3 text-sm text-muted">
          Más oscuro = más hábitos ese día; dorado = un día que cubrió un escudo. Cada {SHIELD_EVERY} días seguidos ganas un escudo (máximo {SHIELD_MAX}): un mal día no borra tu
          racha.
        </p>
      </Card>

      <Card title="Insignias" action={<span className="text-sm font-bold text-muted">{unlocked.length} de {game.achievements.length}</span>}>
        <AchievementGrid achievements={game.achievements} />
      </Card>

      <Card title="Tu salud en el tiempo">
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/app/linea-de-tiempo" variant="secondary">
            Exámenes en el tiempo
          </LinkButton>
          <LinkButton href="/app/mediciones" variant="secondary">
            Mediciones
          </LinkButton>
          <LinkButton href="/app/informes" variant="secondary">
            Informe
          </LinkButton>
          <LinkButton href="/app/metas" variant="secondary">
            Mis metas
          </LinkButton>
        </div>
      </Card>

      <details className="rounded-3xl border-2 border-border bg-surface p-5 text-sm">
        <summary className="cursor-pointer font-black">¿Cómo se gana experiencia?</summary>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-muted">
          <li>
            Hábito hecho: +{XP.habitFull} XP. Versión mínima: +{XP.habitTiny} XP (aparecer es lo que más cuenta).
          </li>
          <li>Cumplir la meta semanal de un hábito: +{XP.weeklyTargetMet} XP. Cada misión semanal cumplida: +{XP.questComplete} XP.</li>
          <li>
            Subir un examen: +{XP.exam} XP. Revisión semanal: +{XP.checkin} XP. Registrar mediciones: +{XP.measurementDay} XP por día. Conectar tu reloj: +{XP.deviceConnected} XP.
          </li>
          <li>Un pilar suma como máximo {XP.habitDailyCapPerAttribute} XP al día: más no siempre es mejor.</li>
          <li>
            Premiamos lo que haces, no los resultados de tus exámenes, y no hay tablas para compararte con otros.{" "}
            <Link href="/app/misiones" className="font-bold text-accent">
              Ver misiones
            </Link>
          </li>
        </ul>
      </details>
    </div>
  );
}
