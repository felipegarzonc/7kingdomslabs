import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertNotices } from "@/components/alert-list";
import { DOC_STATUS } from "@/components/doc-status";
import { fmtCop, fmtDate, fmtDateTime, fmtNum } from "@/components/format";
import { GoalStatusBadge } from "@/components/goal-status";
import { FlagBadge, TrendBadge } from "@/components/marker-bits";
import { SubmitButton } from "@/components/submit-button";
import { Badge, buttonClass, Card, PageHeader } from "@/components/ui";
import { BIOMARKERS } from "@/domain/biomarkers";
import { pilotWeek } from "@/domain/pilot";
import { buildSnapshot, metricLabel, MEASUREMENT_LABEL } from "@/domain/snapshot";
import type { MeasurementType } from "@/domain/types";
import { logAdminAccess } from "@/lib/audit";
import { requireAdmin, type ParticipantRow } from "@/lib/auth";
import { loadParticipantData, toSnapshotInput } from "@/lib/data/snapshot-input";
import { createClient } from "@/lib/supabase/server";
import { setParticipantStatus } from "../../actions";
import { AdminGoalForm, AdminUploadForm, DeleteParticipantForm, FeedbackForm, GenerateReportForm, PrioritiesForm } from "./forms";

export const maxDuration = 300;

export default async function AdminParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: row } = await supabase.from("participants").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const p = row as ParticipantRow;
  await logAdminAccess(supabase, admin.userId, "view_participant", p.id);

  const [data, docs, reports, alerts, checkins, feedback, consents] = await Promise.all([
    loadParticipantData(supabase, p.id),
    supabase.from("lab_documents").select("id, lab_name, original_filename, sampled_on, status, created_at").eq("participant_id", p.id).order("created_at", { ascending: false }),
    supabase.from("reports").select("id, status, created_at, approved_at, prompt_version, model").eq("participant_id", p.id).order("created_at", { ascending: false }),
    supabase.from("alerts").select("*").eq("participant_id", p.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("checkins").select("id, week, submitted_at, free_text, symptoms, adherence, duration_seconds, checkin_replies(status)").eq("participant_id", p.id).order("week", { ascending: false }),
    supabase.from("pilot_feedback").select("*").eq("participant_id", p.id).order("recorded_at", { ascending: false }),
    supabase.from("consents").select("version, accepted_at").eq("participant_id", p.id),
  ]);
  const snapshot = p.status === "invited" ? null : buildSnapshot(toSnapshotInput(p, data));
  const week = p.pilot_start ? pilotWeek(p.pilot_start) : null;
  const metrics = [
    ...(Object.keys(MEASUREMENT_LABEL) as MeasurementType[]).map((t) => ({ value: t, label: MEASUREMENT_LABEL[t] })),
    ...BIOMARKERS.map((b) => ({ value: b.code, label: b.name })),
  ];
  const openAlerts = (alerts.data ?? []).filter((a) => a.status === "open");

  return (
    <>
      <PageHeader
        title={p.display_name ?? p.email}
        subtitle={`${p.email} · ${p.status}${week ? ` · semana ${week}` : ""}${snapshot?.profile.age ? ` · ${snapshot.profile.age} años` : ""}${p.sex ? ` · ${p.sex === "male" ? "M" : "F"}` : ""}${p.height_cm ? ` · ${p.height_cm} cm` : ""}`}
        action={
          <div className="flex gap-2">
            <form action={setParticipantStatus}>
              <input type="hidden" name="participant_id" value={p.id} />
              {p.status === "active" ? (
                <SubmitButton variant="secondary" name="status" value="withdrawn" confirm="¿Marcar como retirado del piloto?">
                  Marcar retirado
                </SubmitButton>
              ) : p.status !== "invited" ? (
                <SubmitButton variant="secondary" name="status" value="active">
                  Reactivar
                </SubmitButton>
              ) : null}
            </form>
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {openAlerts.length ? <AlertNotices alerts={openAlerts.map((a) => ({ level: a.level, message: `${a.message} (${a.evidence ?? a.rule_id}, ${fmtDateTime(a.created_at)})` }))} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Objetivo y consentimiento">
            <p className="text-sm">{p.personal_goal ?? <span className="text-muted">Sin onboarding aún.</span>}</p>
            <p className="mt-2 text-xs text-muted">
              {consents.data?.length ? consents.data.map((c) => `Consentimiento ${c.version} · ${fmtDateTime(c.accepted_at)}`).join(" · ") : "Sin consentimiento registrado."}
            </p>
          </Card>
          <Card title="Prioridades (1 a 3)">
            <PrioritiesForm participantId={p.id} priorities={p.priorities} />
          </Card>
        </div>

        <Card title="Informes" action={<GenerateReportForm participantId={p.id} />}>
          {reports.data?.length ? (
            <ul className="divide-y divide-border text-sm">
              {reports.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/informes/${r.id}`} className="font-medium text-accent">
                    {fmtDateTime(r.created_at)}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {r.prompt_version} · {r.model}
                    <Badge tone={r.status === "approved" ? "good" : r.status === "draft" ? "warn" : "neutral"}>{{ draft: "Borrador", approved: "Aprobado", archived: "Archivado" }[r.status as string]}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sin informes. Genera un borrador cuando haya exámenes revisados.</p>
          )}
        </Card>

        {snapshot ? (
          <Card title="Resumen calculado (dominio, sin LLM)">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="mb-1 font-medium">Patrones</p>
                {snapshot.patterns.length ? (
                  <ul className="list-disc pl-5">
                    {snapshot.patterns.map((pt) => (
                      <li key={pt.id}>
                        {pt.label}: <span className="text-muted">{pt.evidence.join("; ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Ninguno detectado.</p>
                )}
                <p className="mt-3 mb-1 font-medium">Escalamiento (valores más recientes)</p>
                {snapshot.escalations.length ? (
                  <ul className="list-disc pl-5">
                    {snapshot.escalations.map((e) => (
                      <li key={e.ruleId}>
                        <Badge tone={e.level === "urgency" ? "danger" : e.level === "consult_soon" ? "warn" : "info"}>{e.level}</Badge> {e.evidence}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Nada.</p>
                )}
              </div>
              <div>
                <p className="mb-1 font-medium">Marcadores</p>
                <ul className="divide-y divide-border">
                  {snapshot.markers.map((m) => (
                    <li key={m.code} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        {m.name}: <span className="font-medium tabular-nums">{fmtNum(m.latest.value)}</span> <span className="text-xs text-muted">{m.unit}</span>
                      </span>
                      <span className="flex gap-1">
                        <FlagBadge flag={m.flag} optimal={m.optimal} />
                        <TrendBadge trend={m.trend} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Exámenes">
            <ul className="mb-4 divide-y divide-border text-sm">
              {docs.data?.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/documentos/${d.id}`} className="truncate font-medium text-accent">
                    {d.lab_name ?? d.original_filename ?? "PDF"} · {fmtDate(d.sampled_on)}
                  </Link>
                  <Badge tone={DOC_STATUS[d.status]?.tone ?? "neutral"}>{d.status}</Badge>
                </li>
              ))}
            </ul>
            <AdminUploadForm participantId={p.id} />
          </Card>
          <Card title="Metas">
            <ul className="mb-4 divide-y divide-border text-sm">
              {snapshot?.goals.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {metricLabel(g.metric)} {fmtNum(g.baseline)}→{fmtNum(g.target)} <span className="text-xs text-muted">({g.horizonMonths} m, actual {fmtNum(g.current)})</span>
                  </span>
                  <GoalStatusBadge status={g.status} />
                </li>
              ))}
            </ul>
            <AdminGoalForm participantId={p.id} metrics={metrics} />
          </Card>
        </div>

        <Card title="Check-ins">
          {checkins.data?.length ? (
            <ul className="divide-y divide-border text-sm">
              {checkins.data.map((c) => {
                const replies = c.checkin_replies as unknown as { status: string } | Array<{ status: string }> | null;
                const status = Array.isArray(replies) ? replies[0]?.status : replies?.status;
                return (
                  <li key={c.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        Semana {c.week} <span className="font-normal text-muted">· {fmtDateTime(c.submitted_at)} · {c.duration_seconds ?? "—"} s</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {(c.symptoms as string[]).length ? <Badge tone="danger">síntomas</Badge> : null}
                        <Link href={`/admin/checkins?id=${c.id}`} className="text-xs text-accent">
                          Respuesta: {status ?? "—"}
                        </Link>
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {(c.adherence as Array<{ priority: string; status: string }>).map((a) => `${a.priority}: ${a.status}`).join(" · ")}
                    </p>
                    {c.free_text ? <p className="mt-1">“{c.free_text}”</p> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sin check-ins.</p>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Disposición a pagar">
            <ul className="mb-3 text-sm">
              {feedback.data?.map((f) => (
                <li key={f.id}>
                  {fmtDate(f.recorded_at)} · {fmtCop(f.willingness_to_pay_cop)} · {({ yes: "seguiría", maybe: "tal vez", no: "no seguiría" } as Record<string, string>)[f.would_continue] ?? "—"} {f.comments ? `· “${f.comments}”` : ""}
                </li>
              ))}
            </ul>
            <FeedbackForm participantId={p.id} week={week} />
          </Card>
          <Card title="Datos del participante" className="border-danger/40">
            <p className="mb-3 text-sm text-muted">Exportar o suprimir a solicitud del titular (Ley 1581).</p>
            <a href={`/admin/participantes/${p.id}/exportar`} download className={buttonClass("secondary", "mb-4")}>
              Exportar JSON
            </a>
            <DeleteParticipantForm participantId={p.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
