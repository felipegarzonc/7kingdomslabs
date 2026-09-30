import type { Metadata } from "next";
import { fmtDate, fmtNum } from "@/components/format";
import { GoalStatusBadge, ProgressBar } from "@/components/goal-status";
import { SubmitButton } from "@/components/submit-button";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { BIOMARKERS } from "@/domain/biomarkers";
import { buildSnapshot, metricLabel, MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/domain/snapshot";
import type { MeasurementType } from "@/domain/types";
import { requireParticipant } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";
import { archiveGoal } from "../actions";
import { GoalForm } from "./goal-form";

export const metadata: Metadata = { title: "Metas" };

export default async function GoalsPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const snapshot = buildSnapshot(toSnapshotInput(p, await loadParticipantData(supabase, p.id)));
  const measurementTypes = Object.keys(MEASUREMENT_LABEL) as MeasurementType[];
  const metrics = [
    ...measurementTypes.map((t) => ({ value: t, label: MEASUREMENT_LABEL[t], unit: MEASUREMENT_UNIT[t], latest: snapshot.measurementsLatest[t]?.value ?? null })),
    ...BIOMARKERS.map((b) => ({ value: b.code, label: b.name, unit: b.unit, latest: snapshot.markers.find((m) => m.code === b.code)?.latest.value ?? null })),
  ];
  const unitOf = (metric: string) => metrics.find((m) => m.value === metric)?.unit ?? "";

  return (
    <>
      <PageHeader title="Metas" subtitle="Metas cortas contra tu propia línea base. El estado se calcula con el promedio de tus últimos registros." />
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="flex flex-col gap-3">
          {snapshot.goals.length ? (
            snapshot.goals.map((g) => (
              <Card key={g.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{metricLabel(g.metric)}</p>
                    <p className="text-sm text-muted">
                      {fmtNum(g.baseline)} → {fmtNum(g.target)} {unitOf(g.metric)} · {g.horizonMonths} meses · hasta {fmtDate(g.deadline)}
                    </p>
                  </div>
                  <GoalStatusBadge status={g.status} />
                </div>
                <div className="mt-3">
                  <ProgressBar progress={g.progress} expected={g.expected} />
                  <p className="mt-2 text-xs text-muted">
                    Actual: {g.current !== null ? `${fmtNum(g.current)} ${unitOf(g.metric)}` : "sin datos desde el inicio"} · avance {g.progress !== null ? Math.round(g.progress * 100) : 0} % · tiempo transcurrido {Math.round(g.expected * 100)} %
                  </p>
                </div>
                <form action={archiveGoal} className="mt-2 text-right">
                  <input type="hidden" name="id" value={g.id} />
                  <SubmitButton variant="ghost" className="min-h-8 px-2 text-xs" pendingText="…" confirm="¿Archivar esta meta?">
                    Archivar
                  </SubmitButton>
                </form>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin metas activas">Empieza con una sola: la que más te importe hoy.</EmptyState>
          )}
        </div>
        <Card title="Nueva meta" className="self-start">
          <GoalForm metrics={metrics} />
        </Card>
      </div>
    </>
  );
}
