import type { Metadata } from "next";
import Link from "next/link";
import { Sparkline } from "@/components/charts";
import { fmtDate, fmtNum } from "@/components/format";
import { FlagBadge, TrendBadge } from "@/components/marker-bits";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { BIOMARKERS, type BiomarkerCategory } from "@/domain/biomarkers";
import { buildSnapshot } from "@/domain/snapshot";
import { requireParticipant } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Línea de tiempo" };

const CATEGORY_LABEL: Record<BiomarkerCategory, string> = {
  glucose: "Glucosa",
  lipids: "Lípidos",
  liver: "Hígado",
  kidney: "Riñón y metabolismo",
  thyroid: "Tiroides",
  vitamins: "Vitaminas",
  blood_count: "Hemograma",
  inflammation: "Inflamación",
};

export default async function TimelinePage() {
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const snapshot = buildSnapshot(toSnapshotInput(p, await loadParticipantData(supabase, p.id)));
  const byCategory = new Map<BiomarkerCategory, typeof snapshot.markers>();
  for (const m of snapshot.markers) {
    const cat = BIOMARKERS.find((b) => b.code === m.code)!.category;
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), m]);
  }
  const d = snapshot.derived;

  return (
    <>
      <PageHeader
        title="Exámenes en el tiempo"
        subtitle="Tus exámenes de todos los laboratorios y años, y tus mediciones."
      />
      {!snapshot.markers.length ? (
        <EmptyState title="Aún no hay resultados">
          <p className="mb-3">Sube tus exámenes en PDF. Aparecerán aquí en uno o dos minutos.</p>
          <LinkButton href="/app/examenes">Subir exámenes</LinkButton>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card title="Métricas derivadas">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Derived label="IMC" value={d.bmi ? `${fmtNum(d.bmi.value)}` : "—"} hint="OMS: 18,5–24,9" />
              <Derived label="Cintura / estatura" value={d.waistToHeight !== null ? fmtNum(d.waistToHeight, 2) : "—"} hint="Ideal < 0,5" />
              <Derived label="Colesterol no-HDL" value={d.nonHdl !== null ? `${fmtNum(d.nonHdl, 0)} mg/dL` : "—"} hint="< 130 (ATP III)" />
              <Derived label="TG / HDL" value={d.tgHdl !== null ? fmtNum(d.tgHdl, 1) : "—"} hint="Más alto = más resistencia a la insulina" />
              <Derived
                label="Síndrome metabólico (ATP III)"
                value={d.metabolicSyndrome.atp.present === null ? "Datos insuficientes" : d.metabolicSyndrome.atp.present ? `Cumple (${d.metabolicSyndrome.atp.metCount}/5)` : `No cumple (${d.metabolicSyndrome.atp.metCount}/5)`}
              />
              <Derived
                label="Síndrome metabólico (IDF)"
                value={d.metabolicSyndrome.idf.present === null ? "Datos insuficientes" : d.metabolicSyndrome.idf.present ? "Cumple" : "No cumple"}
                hint="Cortes de cintura para Latinoamérica"
              />
              <Derived
                label="Descenso nocturno de PA"
                value={d.dipping ? `${fmtNum(d.dipping.dipPercent)} % · ${{ dipper: "normal", non_dipper: "insuficiente", reverse_dipper: "invertido", extreme_dipper: "extremo" }[d.dipping.pattern]}` : "—"}
                hint="Normal: 10–20 %"
              />
              <Derived
                label="FIB-4 (hígado)"
                value={d.fib4 ? `${fmtNum(d.fib4.value)} · ${{ low: "bajo", indeterminate: "intermedio", high: "alto" }[d.fib4.category]}` : "—"}
                hint={`Bajo < ${d.fib4 ? fmtNum(d.fib4.lowCutoff) : "1,3"} · alto > 2,67 (EASL 2024)`}
              />
              <Derived label="Presión de pulso" value={d.dipping ? `${fmtNum(d.dipping.meanPulsePressure, 0)} mmHg` : d.bp ? `${fmtNum(d.bp.recentMeanSystolic - d.bp.recentMeanDiastolic, 0)} mmHg` : "—"} />
            </dl>
          </Card>
          {[...byCategory.entries()].map(([cat, markers]) => (
            <Card key={cat} title={CATEGORY_LABEL[cat]}>
              <ul className="divide-y divide-border">
                {markers.map((m) => (
                  <li key={m.code}>
                    <Link href={`/app/linea-de-tiempo/${m.code}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted">
                          {fmtDate(m.latest.at)} · {m.history.length} {m.history.length === 1 ? "dato" : "datos"}
                        </p>
                      </div>
                      <span className="hidden min-[400px]:inline"><Sparkline values={m.history.map((h) => h.value)} /></span>
                      <div className="flex w-28 flex-col items-end gap-1 text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {fmtNum(m.latest.value)} <span className="text-xs font-normal text-muted">{m.unit}</span>
                        </p>
                        <FlagBadge flag={m.flag} optimal={m.optimal} />
                      </div>
                      <div className="hidden sm:flex">
                        <TrendBadge trend={m.trend} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Derived({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}
