"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

export interface ChartPoint {
  at: string; // ISO
  value: number;
}

/** Date-only strings (lab sample dates) are anchored at noon UTC so they never shift a day in Bogotá time. */
const toTime = (at: string) => Date.parse(at.length === 10 ? `${at}T12:00:00Z` : at);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit", timeZone: "America/Bogota" });
const fmtNum = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

const AXIS = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;

function domainFor(values: number[], low?: number, high?: number): [number, number] {
  const all = [...values, ...(low !== undefined ? [low] : []), ...(high !== undefined ? [high] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min || Math.abs(max) || 1) * 0.15;
  return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
}

function Tip({ active, payload, unit }: Partial<TooltipContentProps<number, string>> & { unit: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { t: number };
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-muted">{fmtDate(new Date(row.t).toISOString())}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="mt-0.5 flex items-center gap-2 text-text">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.name}: <span className="font-semibold tabular-nums">{fmtNum(Number(p.value))}</span> {unit}
        </p>
      ))}
    </div>
  );
}

/** One marker over time, with the reference range shaded. */
export function MarkerChart({ points, unit, name, low, high, height = 240 }: { points: ChartPoint[]; unit: string; name: string; low?: number; high?: number; height?: number }) {
  const data = [...points].sort((a, b) => toTime(a.at) - toTime(b.at)).map((p) => ({ t: toTime(p.at), value: p.value }));
  if (!data.length) return null;
  const [y0, y1] = domainFor(data.map((d) => d.value), low, high);
  const tMin = data[0].t;
  const tMax = data[data.length - 1].t;
  const span = Math.max(tMax - tMin, 30 * 864e5);
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${name} en el tiempo`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
            {low !== undefined || high !== undefined ? (
              <ReferenceArea y1={low ?? y0} y2={high ?? y1} fill="var(--chart-ref)" fillOpacity={1} stroke="none" ifOverflow="hidden" />
            ) : null}
            <XAxis dataKey="t" type="number" scale="time" domain={[tMin - span * 0.05, tMax + span * 0.05]} tickFormatter={(t) => fmtDate(new Date(t).toISOString())} {...AXIS} minTickGap={32} />
            <YAxis domain={[y0, y1]} width={44} {...AXIS} tickFormatter={fmtNum} />
            <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: "var(--muted)", strokeWidth: 1 }} />
            <Line
              type="linear"
              dataKey="value"
              name={name}
              stroke="var(--series-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {low !== undefined || high !== undefined ? (
        <p className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "var(--chart-ref)" }} aria-hidden />
          Rango de referencia {low !== undefined ? fmtNum(low) : "—"}–{high !== undefined ? fmtNum(high) : "—"} {unit}
        </p>
      ) : null}
      <DataTable rows={data.map((d) => [fmtDate(new Date(d.t).toISOString()), `${fmtNum(d.value)} ${unit}`])} headers={["Fecha", name]} />
    </div>
  );
}

/** Systolic and diastolic readings over time (two series, one axis — same unit). */
export function BloodPressureChart({ readings, height = 260 }: { readings: Array<{ at: string; systolic: number; diastolic: number }>; height?: number }) {
  const data = [...readings].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map((r) => ({ t: Date.parse(r.at), systolic: r.systolic, diastolic: r.diastolic }));
  if (!data.length) return null;
  const [y0, y1] = domainFor([...data.map((d) => d.systolic), ...data.map((d) => d.diastolic)], 80, 130);
  const tMin = data[0].t;
  const tMax = data[data.length - 1].t;
  const span = Math.max(tMax - tMin, 7 * 864e5);
  const last = data[data.length - 1];
  const series = [
    { key: "systolic", name: "Sistólica", color: "var(--series-1)" },
    { key: "diastolic", name: "Diastólica", color: "var(--series-2)" },
  ] as const;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted" aria-hidden>
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.name} · última {fmtNum(last[s.key])} mmHg
          </span>
        ))}
      </div>
      <div style={{ height }} role="img" aria-label="Presión arterial en el tiempo">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
            <XAxis dataKey="t" type="number" scale="time" domain={[tMin - span * 0.05, tMax + span * 0.05]} tickFormatter={(t) => fmtDate(new Date(t).toISOString())} {...AXIS} minTickGap={32} />
            <YAxis domain={[y0, y1]} width={44} {...AXIS} />
            <Tooltip content={<Tip unit="mmHg" />} cursor={{ stroke: "var(--muted)", strokeWidth: 1 }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 4, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        headers={["Fecha", "Sistólica", "Diastólica"]}
        rows={data.map((d) => [fmtDate(new Date(d.t).toISOString()), `${d.systolic}`, `${d.diastolic}`])}
      />
    </div>
  );
}

/** Tiny trend line for lists. Decorative: the value and trend are in text beside it. */
export function Sparkline({ values, width = 88, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="inline-block" style={{ width, height }} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => 4 + (i / (values.length - 1)) * (width - 8);
  const y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted select-none">Ver datos en tabla</summary>
      <table className="mt-2 w-full text-left tabular-nums">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="py-1 pr-3 font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
