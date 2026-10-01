import type { Metadata } from "next";
import { fmtDate, fmtNum } from "@/components/format";
import { PrintButton } from "@/components/print-button";
import { adherence, PILLAR_LABEL, todayInColombia } from "@/domain/habits";
import { LE8_LABEL } from "@/domain/le8";
import { buildSnapshot, MEASUREMENT_LABEL, MEASUREMENT_UNIT } from "@/domain/snapshot";
import type { MeasurementType } from "@/domain/types";
import { requireParticipant } from "@/lib/auth";
import { loadHabits } from "@/lib/data/habits";
import { participantLe8 } from "@/lib/data/le8";
import { loadImagingForReport, loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resumen para tu médico" };

const FLAG = { high: "Alto", low: "Bajo", normal: "En rango" } as const;
const TREND = { improving: "mejorando", worsening: "empeorando", stable: "estable", unknown: "—" } as const;
const SMOKING = { never: "Nunca ha fumado", former: "Exfumador", current: "Fuma actualmente" } as const;

/** One printable page with everything a doctor needs in a 15-minute visit. */
export default async function DoctorSummaryPage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const [data, imaging, habits, alertsRes] = await Promise.all([
    loadParticipantData(supabase, p.id),
    loadImagingForReport(supabase, p.id),
    loadHabits(supabase, p.id),
    supabase.from("alerts").select("level, message, created_at").eq("participant_id", p.id).eq("status", "open").order("created_at", { ascending: false }).limit(10),
  ]);
  const snapshot = buildSnapshot(toSnapshotInput(p, data));
  const heart = participantLe8(p, data, snapshot);
  const today = todayInColombia();
  const d = snapshot.derived;
  const active = habits.filter((h) => h.status === "active");
  const measurements = (Object.entries(snapshot.measurementsLatest) as Array<[MeasurementType, { at: string; value: number }]>).filter(([t]) => t !== "bp_systolic" && t !== "bp_diastolic");

  return (
    <article className="flex flex-col gap-6 text-sm print:gap-4 print:text-[11px]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-border pb-4">
        <div>
          <p className="text-xs font-black tracking-wider text-muted uppercase">Resumen para consulta · {fmtDate(today)}</p>
          <h1 className="font-serif text-3xl font-bold">{p.display_name ?? "Participante"}</h1>
          <p className="mt-1 text-muted">
            {[
              snapshot.profile.age !== null ? `${snapshot.profile.age} años` : null,
              p.sex === "female" ? "mujer" : p.sex === "male" ? "hombre" : null,
              p.height_cm ? `${fmtNum(Number(p.height_cm), 0)} cm` : null,
              p.smoking_status ? SMOKING[p.smoking_status] : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {p.personal_goal ? <p className="mt-1">Objetivo personal: «{p.personal_goal}»</p> : null}
        </div>
        <PrintButton />
      </header>

      {alertsRes.data?.length ? (
        <Section title="Alertas abiertas">
          <ul className="list-disc pl-5">
            {alertsRes.data.map((a) => (
              <li key={a.created_at + a.message}>
                {fmtDate(a.created_at)}: {a.message}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Exámenes de laboratorio (último valor)">
        {snapshot.markers.length ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-border text-xs text-muted uppercase">
                <th className="py-1.5 pr-2">Marcador</th>
                <th className="py-1.5 pr-2">Valor</th>
                <th className="py-1.5 pr-2">Fecha</th>
                <th className="py-1.5 pr-2">Estado</th>
                <th className="py-1.5 pr-2">Anterior</th>
                <th className="py-1.5">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.markers.map((m) => (
                <tr key={m.code} className="border-b border-border">
                  <td className="py-1.5 pr-2 font-semibold">{m.name}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {fmtNum(m.latest.value)} {m.unit}
                  </td>
                  <td className="py-1.5 pr-2">{fmtDate(m.latest.at)}</td>
                  <td className="py-1.5 pr-2">{m.flag === "normal" && m.optimal === "suboptimal" ? "En rango, no óptimo" : FLAG[m.flag]}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{m.previous ? `${fmtNum(m.previous.value)} (${fmtDate(m.previous.at)})` : "—"}</td>
                  <td className="py-1.5">{m.trend.direction === "insufficient_data" ? "un solo dato" : TREND[m.trend.meaning]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">Sin exámenes cargados.</p>
        )}
      </Section>

      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
        <Section title="Presión arterial y métricas derivadas">
          <ul className="flex flex-col gap-1">
            <li>
              PA promedio (30 días, diurna):{" "}
              {d.bp ? `${fmtNum(d.bp.recentMeanSystolic, 0)}/${fmtNum(d.bp.recentMeanDiastolic, 0)} mmHg en ${d.bp.readings} lecturas (${d.bp.category})` : "sin lecturas"}
            </li>
            {d.dipping ? <li>Descenso nocturno: {fmtNum(d.dipping.dipPercent)} %</li> : null}
            <li>IMC: {d.bmi ? `${fmtNum(d.bmi.value)} (${d.bmi.category})` : "—"}</li>
            <li>Cintura/estatura: {d.waistToHeight !== null ? fmtNum(d.waistToHeight, 2) : "—"}</li>
            <li>Colesterol no-HDL: {d.nonHdl !== null ? `${fmtNum(d.nonHdl, 0)} mg/dL` : "—"}</li>
            <li>TG/HDL: {d.tgHdl !== null ? fmtNum(d.tgHdl, 1) : "—"}</li>
            <li>FIB-4: {d.fib4 ? `${fmtNum(d.fib4.value)} (${{ low: "bajo", indeterminate: "intermedio", high: "alto" }[d.fib4.category]})` : "—"}</li>
            <li>
              Síndrome metabólico (ATP III):{" "}
              {d.metabolicSyndrome.atp.present === null ? "datos insuficientes" : `${d.metabolicSyndrome.atp.present ? "cumple" : "no cumple"} (${d.metabolicSyndrome.atp.metCount}/5)`}
            </li>
          </ul>
        </Section>

        <Section title="Mediciones recientes">
          {measurements.length ? (
            <ul className="flex flex-col gap-1">
              {measurements.map(([t, v]) => (
                <li key={t}>
                  {MEASUREMENT_LABEL[t]}: {fmtNum(v.value)} {MEASUREMENT_UNIT[t]} <span className="text-muted">({fmtDate(v.at)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Sin mediciones.</p>
          )}
        </Section>
      </div>

      {heart ? (
        <Section title={`Life's Essential 8 (AHA): ${heart.score}/100 con ${heart.components.length} de 8 componentes`}>
          <p>
            {heart.components.map((c) => `${c.label} ${c.score}`).join(" · ")}
            {heart.missing.length ? <span className="text-muted"> · Sin dato: {heart.missing.map((k) => LE8_LABEL[k]).join(", ")}</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted">Alimentación aproximada con dos preguntas de estilo de vida; la PA no descuenta tratamiento.</p>
        </Section>
      ) : null}

      {imaging.length ? (
        <Section title="Imágenes diagnósticas">
          <ul className="flex flex-col gap-2">
            {imaging.map((i) => (
              <li key={i.date + i.study}>
                <span className="font-semibold">
                  {i.study} ({fmtDate(i.date)}):
                </span>{" "}
                {i.impression ?? i.summary}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Hábitos en curso">
        {active.length ? (
          <ul className="flex flex-col gap-1">
            {active.map((h) => {
              const a = h.started_on ? adherence({ target_per_week: h.target_per_week, started_on: h.started_on }, h.logDays, today) : null;
              return (
                <li key={h.id}>
                  <span className="font-semibold">{PILLAR_LABEL[h.pillar]}:</span> {h.title} ({h.target_per_week}×/semana desde {fmtDate(h.started_on)}
                  {a !== null ? `, cumplimiento ${Math.round(a * 100)} %` : ""})
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted">Sin hábitos activos.</p>
        )}
      </Section>

      <footer className="border-t-2 border-border pt-3 text-xs text-muted">
        Generado por Bombadil a partir de los exámenes y registros que subió el participante. Los valores de laboratorio se transcriben automáticamente del PDF original; ante cualquier duda,
        prima el documento del laboratorio. No es un diagnóstico.
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 text-base font-black">{title}</h2>
      {children}
    </section>
  );
}
