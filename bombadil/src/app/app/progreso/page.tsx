import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, fmtNum } from "@/components/format";
import { AchievementGrid, AttributeGrid, Heatmap, HeroCard, QuestList } from "@/components/game";
import { GameCelebration } from "@/components/game-celebration";
import { GoalStatusBadge, ProgressBar } from "@/components/goal-status";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { SHIELD_EVERY, SHIELD_MAX, XP } from "@/domain/game";
import { buildSnapshot, metricLabel } from "@/domain/snapshot";
import { requireParticipant } from "@/lib/auth";
import { loadGame } from "@/lib/data/game";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progreso" };

export default async function ProgressPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const snapshot = buildSnapshot(toSnapshotInput(p, await loadParticipantData(supabase, p.id)));
  const game = await loadGame(supabase, p.id, { goalsAchieved: snapshot.goals.filter((g) => g.status === "achieved").length });
  const unlocked = game.achievements.filter((a) => a.unlocked);

  return (
    <>
      <PageHeader title="Tu progreso" subtitle={p.personal_goal ? `Rumbo a: «${p.personal_goal}»` : "Cada hábito suma experiencia a tu personaje."} />
      <GameCelebration xp={game.xp} level={game.level} title={game.title} achievements={unlocked.map((a) => a.title)} />
      <div className="flex flex-col gap-4">
        <HeroCard game={game} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Misiones de la semana">
            <QuestList quests={game.quests} />
            <p className="mt-3 text-xs text-muted">Se renuevan cada lunes.</p>
          </Card>

          <Card title="Constancia" action={<span className="text-xs text-muted">Últimas 12 semanas</span>}>
            <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["Racha actual", `${game.streak.current} 🔥`],
                ["Mejor racha", `${game.streak.best}`],
                ["Escudos", `${game.streak.shields} 🛡️`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-2 p-2">
                  <dt className="text-[11px] text-muted">{k}</dt>
                  <dd className="text-lg font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Heatmap cells={game.heatmap} />
            <p className="mt-2 text-xs text-muted">
              Más oscuro = más hábitos ese día. Cada {SHIELD_EVERY} días seguidos ganas un escudo (máximo {SHIELD_MAX}) que cubre un día que falles: un mal día no borra tu
              racha.
            </p>
          </Card>
        </div>

        <Card title="Atributos" action={<span className="text-xs text-muted">Suben con tus hábitos de cada pilar</span>}>
          <AttributeGrid attributes={game.attributes} />
        </Card>

        <Card
          title="Misiones épicas: tus metas"
          action={
            <Link href="/app/metas" className="text-sm font-medium text-accent">
              {snapshot.goals.length ? "Administrar" : "Crear una meta"}
            </Link>
          }
        >
          {snapshot.goals.length ? (
            <ul className="flex flex-col gap-4">
              {snapshot.goals.map((g) => (
                <li key={g.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">🎯 {metricLabel(g.metric)}</p>
                    <GoalStatusBadge status={g.status} />
                  </div>
                  <p className="mb-2 text-sm text-muted">
                    De {fmtNum(g.baseline)} a {fmtNum(g.target)} · hasta {fmtDate(g.deadline)}
                    {g.current !== null ? ` · hoy: ${fmtNum(g.current)}` : ""}
                  </p>
                  <ProgressBar progress={g.progress} expected={g.expected} />
                  <p className="mt-1 text-xs text-muted">
                    {g.progress !== null ? `${Math.max(0, Math.round(g.progress * 100))} % del camino` : "Aún sin datos desde el inicio"} · la rayita marca dónde deberías ir según el
                    tiempo
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted">
              <p>Una meta es tu misión épica: un número tuyo (peso, cintura, presión, pasos, un examen) que quieres mover en 3, 6 o 12 meses.</p>
              <LinkButton href="/app/metas" variant="secondary" className="mt-3">
                Crear mi primera misión
              </LinkButton>
            </div>
          )}
        </Card>

        <Card title="Insignias" action={<span className="text-xs text-muted">{unlocked.length} de {game.achievements.length}</span>}>
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
          </div>
        </Card>

        <details className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-semibold">¿Cómo se gana experiencia?</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
            <li>
              Hábito hecho: +{XP.habitFull} XP. Versión mínima: +{XP.habitTiny} XP (aparecer es lo que más cuenta).
            </li>
            <li>Cumplir la meta semanal de un hábito: +{XP.weeklyTargetMet} XP. Cada misión semanal cumplida: +{XP.questComplete} XP.</li>
            <li>
              Subir un examen: +{XP.exam} XP. Revisión semanal: +{XP.checkin} XP. Registrar mediciones: +{XP.measurementDay} XP por día. Conectar tu reloj: +{XP.deviceConnected} XP.
            </li>
            <li>Un pilar suma como máximo {XP.habitDailyCapPerAttribute} XP al día: más no siempre es mejor.</li>
            <li>Premiamos lo que haces, no los resultados de tus exámenes, y no hay tablas para compararte con otros.</li>
          </ul>
        </details>
      </div>
    </>
  );
}
