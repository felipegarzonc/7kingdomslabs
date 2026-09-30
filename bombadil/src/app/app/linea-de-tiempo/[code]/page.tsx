import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkerChart } from "@/components/charts";
import { fmtDate, fmtNum } from "@/components/format";
import { FlagBadge, TrendBadge } from "@/components/marker-bits";
import { Card, PageHeader } from "@/components/ui";
import { BIOMARKER_BY_CODE } from "@/domain/biomarkers";
import { resolveRange } from "@/domain/classify";
import { buildSnapshot } from "@/domain/snapshot";
import { requireParticipant } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";

export default async function MarkerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = BIOMARKER_BY_CODE.get(code);
  if (!b) notFound();
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const data = await loadParticipantData(supabase, p.id);
  const snapshot = buildSnapshot(toSnapshotInput(p, data));
  const m = snapshot.markers.find((x) => x.code === code);
  if (!m) notFound();
  const ref = resolveRange(b.reference, p.sex ?? "male");
  const opt = resolveRange(b.optimal, p.sex ?? "male");
  const rows = data.labs.filter((l) => l.biomarker_code === code).reverse();

  return (
    <>
      <PageHeader
        title={b.name}
        subtitle={
          <Link href="/app/linea-de-tiempo" className="text-accent">
            ← Línea de tiempo
          </Link>
        }
      />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {fmtNum(m.latest.value)} <span className="text-base font-normal text-muted">{b.unit}</span>
            </span>
            <FlagBadge flag={m.flag} optimal={m.optimal} />
            <TrendBadge trend={m.trend} />
          </div>
          <MarkerChart points={m.history} unit={b.unit} name={b.name} low={ref?.low} high={ref?.high} />
          {m.trend.slopePerYear !== null && m.trend.direction !== "stable" ? (
            <p className="mt-3 text-sm text-muted">
              Cambio aproximado: {m.trend.slopePerYear > 0 ? "+" : ""}
              {fmtNum(m.trend.slopePerYear)} {b.unit} por año.
            </p>
          ) : null}
        </Card>
        <Card title="Qué significa">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Rango de referencia</dt>
              <dd className="font-medium">
                {ref?.low ?? "—"} – {ref?.high ?? "—"} {b.unit}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Rango óptimo</dt>
              <dd className="font-medium">{opt ? `${opt.low ?? "—"} – ${opt.high ?? "—"} ${b.unit}` : "No definido"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">Fuente: {b.source}</p>
          {b.notes ? <p className="mt-1 text-xs text-muted">{b.notes}</p> : null}
        </Card>
        <Card title="Resultados">
          <ul className="divide-y divide-border text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <span>{fmtDate(r.sampled_on)}</span>
                <span className="tabular-nums">
                  {fmtNum(r.value_canonical)} {b.unit}
                  {r.unit_original && r.unit_original !== b.unit ? <span className="text-muted"> (informe: {fmtNum(r.value_original)} {r.unit_original})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
