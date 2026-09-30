import type { Metadata } from "next";
import Link from "next/link";
import { fmtCop, fmtDate } from "@/components/format";
import { Badge, Card, LinkButton, PageHeader, Stat, Table } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { loadPilotOverview } from "@/lib/data/pilot";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Piloto" };

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createClient();
  const o = await loadPilotOverview(supabase);
  const week6 = o.retention.find((r) => r.week === 6);
  const effectCount = o.rows.filter((r) => r.effect).length;
  const activeRows = o.rows.filter((r) => r.participant.status !== "invited");

  return (
    <>
      <PageHeader title="Panel del piloto" subtitle="Retención, efecto y disposición a pagar." action={<LinkButton href="/admin/participantes/nuevo">Invitar participante</LinkButton>} />

      {o.counts.urgentAlerts ? (
        <Link href="/admin/alertas" className="mb-4 block rounded-xl border-l-4 border-danger bg-danger-soft p-4 text-sm font-semibold text-danger">
          ⚠️ {o.counts.urgentAlerts} alerta(s) de urgencia abierta(s). Revisar ahora →
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Participantes activos" value={o.counts.active} hint={`${o.counts.invited} invitados sin onboarding`} />
        <Stat label="Retención semana 6" value={week6?.rate !== null && week6?.rate !== undefined ? `${Math.round(week6.rate * 100)} %` : "—"} hint={week6 ? `${week6.reported}/${week6.eligible} reportaron` : "Aún nadie llega a la semana 6"} />
        <Stat label="Con efecto medible" value={`${effectCount}/${activeRows.length}`} hint="Meta en camino/lograda o marcador mejorando" />
        <Stat label="Disposición a pagar" value={o.wtp.median ? fmtCop(o.wtp.median) : "—"} hint={`Mediana mensual · ${o.wtp.values.length} respuestas`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <QueueLink href="/admin/documentos" label="Exámenes por revisar" n={o.counts.pendingDocs} extra={o.counts.processingDocs ? `${o.counts.processingDocs} procesando` : undefined} />
        <QueueLink href="/admin/checkins" label="Respuestas por enviar" n={o.counts.pendingReplies} />
        <QueueLink href="/admin/alertas" label="Alertas abiertas" n={o.counts.openAlerts} />
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Duración mediana check-in</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{o.medianCheckinSeconds ? `${Math.round(o.medianCheckinSeconds)} s` : "—"}</p>
          <p className="text-xs text-muted">Objetivo: &lt; 120 s</p>
        </div>
      </div>

      <Card title="Retención por semana" className="mt-6">
        <RetentionBars rows={o.retention} />
      </Card>

      <Card title="Participantes" className="mt-6">
        <Table>
          <thead>
            <tr>
              <th>Participante</th>
              <th>Semana</th>
              <th>Check-ins</th>
              <th>Esta semana</th>
              <th>Metas</th>
              <th>Alertas</th>
              <th>Pagaría</th>
            </tr>
          </thead>
          <tbody>
            {o.rows.map((r) => (
              <tr key={r.participant.id}>
                <td>
                  <Link href={`/admin/participantes/${r.participant.id}`} className="font-medium text-accent">
                    {r.participant.display_name ?? r.participant.email}
                  </Link>
                  {r.participant.status !== "active" ? (
                    <span className="ml-2">
                      <Badge>{{ invited: "invitado", withdrawn: "retirado", completed: "terminó", active: "" }[r.participant.status]}</Badge>
                    </span>
                  ) : null}
                </td>
                <td className="tabular-nums">{r.week ?? "—"}</td>
                <td className="tabular-nums">
                  {r.checkins}
                  <span className="text-xs text-muted"> · {fmtDate(r.lastCheckin)}</span>
                </td>
                <td>{r.participant.status === "active" ? r.missingThisWeek ? <Badge tone="warn">Pendiente</Badge> : <Badge tone="good">✓ Hecho</Badge> : "—"}</td>
                <td className="text-xs">
                  {r.goals.length ? r.goals.map((g) => ({ achieved: "✓", on_track: "↗", stalled: "→", regressing: "↘", no_data: "·" })[g.status]).join(" ") : "—"}
                </td>
                <td>{r.openAlerts.length ? <Badge tone={r.openAlerts.some((a) => a.level === "urgency") ? "danger" : "warn"}>{r.openAlerts.length}</Badge> : "—"}</td>
                <td className="tabular-nums">{r.feedback?.willingness_to_pay_cop ? fmtCop(r.feedback.willingness_to_pay_cop) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title="Disposición a pagar" className="mt-6">
        <p className="mb-3 text-sm text-muted">
          ¿Seguiría? Sí {o.wtp.wouldContinue.yes} · Tal vez {o.wtp.wouldContinue.maybe} · No {o.wtp.wouldContinue.no}
          {o.wtp.values.length ? ` · rango ${fmtCop(o.wtp.values[0])} – ${fmtCop(o.wtp.values.at(-1))}` : ""}
        </p>
        {o.wtp.recent.length ? (
          <ul className="divide-y divide-border text-sm">
            {o.wtp.recent.map((f) => (
              <li key={f.id} className="py-2">
                <span className="font-medium tabular-nums">{fmtCop(f.willingness_to_pay_cop)}</span> · {f.would_continue ?? "—"} · semana {f.week ?? "—"}
                {f.comments ? <p className="text-muted">“{f.comments}”</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sin respuestas todavía. Los participantes ven la pregunta desde la semana 6; también puedes registrarla desde la ficha de cada participante.</p>
        )}
      </Card>
    </>
  );
}

function QueueLink({ href, label, n, extra }: { href: string; label: string; n: number; extra?: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-border bg-surface p-4 hover:border-accent">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{n}</p>
      {extra ? <p className="text-xs text-muted">{extra}</p> : null}
    </Link>
  );
}

function RetentionBars({ rows }: { rows: Array<{ week: number; eligible: number; reported: number; rate: number | null }> }) {
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Porcentaje de participantes que reportaron cada semana">
        {rows.map((r) => (
          <div key={r.week} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full max-w-6 self-center rounded-t bg-[var(--series-1)]"
              style={{ height: `${(r.rate ?? 0) * 100}%`, minHeight: r.rate ? 2 : 0 }}
              title={`Semana ${r.week}: ${r.rate !== null ? Math.round(r.rate * 100) + " %" : "sin elegibles"} (${r.reported}/${r.eligible})`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 border-t border-border pt-1 text-center text-xs text-muted">
        {rows.map((r) => (
          <span key={r.week} className={`flex-1 ${r.week === 6 ? "font-semibold text-text" : ""}`}>
            {r.week}
          </span>
        ))}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted">Ver datos en tabla</summary>
        <table className="mt-2 tabular-nums">
          <tbody>
            {rows.map((r) => (
              <tr key={r.week}>
                <td className="pr-3">Semana {r.week}</td>
                <td className="pr-3">{r.rate !== null ? `${Math.round(r.rate * 100)} %` : "—"}</td>
                <td className="text-muted">
                  {r.reported}/{r.eligible}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
