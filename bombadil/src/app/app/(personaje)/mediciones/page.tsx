import type { Metadata } from "next";
import { BloodPressureChart, MarkerChart } from "@/components/charts";
import { fmtDateTime, fmtNum } from "@/components/format";
import { SubmitButton } from "@/components/submit-button";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { MEASUREMENT_LABEL, MEASUREMENT_UNIT, pairBloodPressure } from "@/domain/snapshot";
import { SOURCE_LABEL } from "@/domain/wearables";
import { requireParticipant } from "@/lib/auth";
import { loadParticipantData } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";
import { deleteMeasurement } from "@/app/app/actions";
import { MeasurementForm } from "./measurement-form";

export const metadata: Metadata = { title: "Mediciones" };

export default async function MeasurementsPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const { measurements } = await loadParticipantData(supabase, p.id);
  const bp = pairBloodPressure(measurements.map((m) => ({ type: m.type, value: m.value, at: m.measured_at, groupId: m.group_id, context: m.context })));
  const series = (["steps", "weight", "waist", "resting_hr", "hrv_ms", "sleep_hours", "sleep_deep_hours", "sleep_rem_hours", "exercise_minutes", "protein_g", "grip_strength", "vo2max", "alcohol_drinks"] as const)
    .map((t) => ({ t, points: measurements.filter((m) => m.type === t).map((m) => ({ at: m.measured_at, value: m.value })) }))
    .filter((s) => s.points.length);
  const recent = [...measurements].reverse().filter((m) => m.type !== "bp_diastolic").slice(0, 20);
  const diaByGroup = new Map(measurements.filter((m) => m.type === "bp_diastolic").map((m) => [m.group_id, m.value]));

  return (
    <>
      <PageHeader title="Mediciones" subtitle="Presión, peso, cintura, frecuencia cardiaca, sueño, ejercicio, fuerza y capacidad física."
        action={
          <LinkButton href="/app/conexiones" variant="secondary">
            Traerlas de mi reloj
          </LinkButton>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card title="Nueva medición" className="self-start">
          <MeasurementForm />
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          {bp.length ? (
            <Card title="Presión arterial">
              <BloodPressureChart readings={bp} />
            </Card>
          ) : null}
          {series.map((s) => (
            <Card key={s.t} title={`${MEASUREMENT_LABEL[s.t]} (${MEASUREMENT_UNIT[s.t]})`}>
              <MarkerChart points={s.points} unit={MEASUREMENT_UNIT[s.t]} name={MEASUREMENT_LABEL[s.t]} height={200} />
            </Card>
          ))}
          {!measurements.length ? <EmptyState title="Aún no hay mediciones">Registra la primera con el formulario.</EmptyState> : null}
        </div>
      </div>

      {recent.length ? (
        <Card title="Registros recientes" className="mt-6">
          <ul className="divide-y divide-border">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{m.type === "bp_systolic" ? "Presión" : MEASUREMENT_LABEL[m.type]}</span>{" "}
                  <span className="tabular-nums">
                    {m.type === "bp_systolic" ? `${fmtNum(m.value, 0)}/${fmtNum(diaByGroup.get(m.group_id) ?? null, 0)}` : fmtNum(m.value)} {MEASUREMENT_UNIT[m.type]}
                  </span>
                  <span className="text-muted">
                    {" "}
                    · {fmtDateTime(m.measured_at)}
                    {m.context?.period === "night" ? " · noche" : ""}
                    {m.source !== "manual" ? ` · ${SOURCE_LABEL[m.source] ?? m.source}` : ""}
                  </span>
                </span>
                <form action={deleteMeasurement}>
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton variant="ghost" className="min-h-8 px-2 text-xs" pendingText="…" confirm="¿Eliminar esta medición?">
                    Eliminar
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
