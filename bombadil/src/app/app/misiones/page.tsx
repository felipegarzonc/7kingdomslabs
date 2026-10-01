import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, fmtNum } from "@/components/format";
import { QuestList } from "@/components/game";
import { GoalStatusBadge } from "@/components/goal-status";
import { Icon } from "@/components/icons";
import { Card, cx, LinkButton } from "@/components/ui";
import { dayInColombia } from "@/domain/game";
import { addDays, todayInColombia, weekStart } from "@/domain/habits";
import { nextExamDue } from "@/domain/path";
import { buildSnapshot, metricLabel } from "@/domain/snapshot";
import { requireParticipant } from "@/lib/auth";
import { getGame } from "@/lib/data/game";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Misiones" };

export default async function QuestsPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const [data, lastDoc] = await Promise.all([
    loadParticipantData(supabase, p.id),
    supabase.from("lab_documents").select("created_at").eq("participant_id", p.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const snapshot = buildSnapshot(toSnapshotInput(p, data));
  const game = await getGame(p.id, snapshot.goals.filter((g) => g.status === "achieved").length);
  const today = todayInColombia();
  const daysToMonday = Math.round((Date.parse(addDays(weekStart(today), 7)) - Date.parse(today)) / 86_400_000);
  const exam = nextExamDue(lastDoc.data?.created_at ? dayInColombia(lastDoc.data.created_at) : null, today);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-serif text-4xl font-bold">Misiones</h1>
        <span className="text-sm font-bold text-muted">
          Se renuevan el lunes · {daysToMonday === 1 ? "queda 1 día" : `quedan ${daysToMonday} días`}
        </span>
      </div>

      <Card title="Esta semana">
        <QuestList quests={game.quests} />
        <p className="mt-4 text-sm text-muted">Cada misión cumplida abre su cofre: +{game.quests[0]?.xp ?? 50} XP. Cada lunes es un nuevo comienzo.</p>
      </Card>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl font-bold">Misiones épicas: tus metas</h2>
        <Link href="/app/metas" className="text-sm font-black tracking-wide text-accent uppercase">
          {snapshot.goals.length ? "Administrar metas" : "Nueva meta"}
        </Link>
      </div>
      {snapshot.goals.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {snapshot.goals.map((g, i) => {
            const hero = i === 0;
            const pct = Math.max(0, Math.min(1, g.progress ?? 0));
            return (
              <article
                key={g.id}
                className={cx("rounded-3xl border-b-[6px] p-5", hero ? "border-black/25 bg-accent text-white dark:text-bg" : "border-2 border-b-[6px] border-border bg-surface")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cx("text-xs font-black tracking-wider uppercase", hero ? "opacity-80" : "text-muted")}>
                    {g.horizonMonths} meses · hasta {fmtDate(g.deadline)}
                  </span>
                  <GoalStatusBadge status={g.status} />
                </div>
                <p className="mt-2 font-serif text-2xl font-bold">
                  {metricLabel(g.metric)}: de {fmtNum(g.baseline)} a {fmtNum(g.target)}
                </p>
                <div className={cx("relative mt-4 h-4 rounded-full", hero ? "bg-black/20" : "bg-surface-2")}>
                  <div className={cx("h-4 rounded-full", hero ? "bg-gold" : "bg-accent")} style={{ width: `${pct * 100}%` }} />
                  <div
                    className={cx("absolute -top-1 h-6 w-[3px] rounded", hero ? "bg-white" : "bg-text")}
                    style={{ left: `${g.expected * 100}%` }}
                    title="Dónde deberías ir según el tiempo transcurrido"
                  />
                </div>
                <p className={cx("mt-2 text-sm font-bold", hero ? "opacity-90" : "text-muted")}>
                  {g.current !== null ? `Hoy: ${fmtNum(g.current)} · ` : ""}
                  {g.status === "stalled" || g.status === "regressing"
                    ? "Hazlo más pequeño: ajusta un hábito en tu plan."
                    : g.status === "no_data"
                      ? "Registra un dato para empezar."
                      : `${Math.round(pct * 100)} % del camino`}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <Card>
          <p className="text-muted">Una meta es tu misión épica: un número tuyo (peso, cintura, presión, pasos, un examen) que quieres mover en 3, 6 o 12 meses.</p>
          <LinkButton href="/app/metas" variant="secondary" className="mt-4">
            Crear mi primera misión épica
          </LinkButton>
        </Card>
      )}

      <article className="flex flex-wrap items-center gap-4 rounded-3xl border-[3px] border-dashed border-[#4b4aa3] bg-[#ecebf8] p-5 text-[#2f2e74] dark:bg-[#24254a] dark:text-[#d6d6f7]">
        <Icon name="flask" size={44} strokeWidth={2} />
        <div className="min-w-56 flex-1">
          <p className="text-lg font-black">Jefe final: examen de control</p>
          <p className="text-sm font-bold opacity-85">
            {exam
              ? exam.daysLeft > 0
                ? `En ${exam.daysLeft} días · descubre si tus hábitos movieron tus resultados.`
                : "Ya pasaron 3 meses desde tu último examen: es hora de medir tu avance."
              : "Sube tu primer examen y lo usamos como punto de partida."}
          </p>
        </div>
        <LinkButton href="/app/examenes" className="bg-[#4b4aa3]! text-white! dark:bg-[#b3b4ee]! dark:text-[#24254a]!">
          {exam ? "Subir examen" : "Subir mi primer examen"}
        </LinkButton>
      </article>
    </div>
  );
}
