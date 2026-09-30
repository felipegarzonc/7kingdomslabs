import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime } from "@/components/format";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { LEVEL_LABEL, LEVEL_ORDER } from "@/domain/escalation";
import type { EscalationLevel } from "@/domain/types";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAlert } from "../actions";

export const metadata: Metadata = { title: "Alertas" };
const TONE = { urgency: "danger", consult_soon: "warn", next_visit: "info" } as const;

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireAdmin();
  const { all } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("alerts").select("*, participants(display_name, email)").order("created_at", { ascending: false }).limit(200);
  if (!all) q = q.neq("status", "resolved");
  const { data } = await q;
  const alerts = (data ?? []).sort((a, b) => LEVEL_ORDER[a.level as EscalationLevel] - LEVEL_ORDER[b.level as EscalationLevel]);
  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle="Calculadas con reglas deterministas (config/escalation-rules.json), nunca por el modelo."
        action={
          <Link href={all ? "/admin/alertas" : "/admin/alertas?all=1"} className="text-sm text-accent">
            {all ? "Solo abiertas" : "Ver todas"}
          </Link>
        }
      />
      {alerts.length ? (
        <div className="flex flex-col gap-3">
          {alerts.map((a) => {
            const p = a.participants as { display_name: string | null; email: string };
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone={TONE[a.level as EscalationLevel]}>{LEVEL_LABEL[a.level as EscalationLevel]}</Badge>
                      <Link href={`/admin/participantes/${a.participant_id}`} className="font-semibold text-accent">
                        {p.display_name ?? p.email}
                      </Link>
                      <span className="text-xs text-muted">
                        {a.origin} · {a.rule_id} · {a.evidence} · {fmtDateTime(a.created_at)}
                      </span>
                    </div>
                    <p>{a.message}</p>
                  </div>
                  {a.status !== "resolved" ? (
                    <form action={updateAlert} className="flex gap-2">
                      <input type="hidden" name="alert_id" value={a.id} />
                      {a.status === "open" ? (
                        <SubmitButton variant="secondary" name="status" value="acknowledged" className="min-h-9 text-xs">
                          Enterado
                        </SubmitButton>
                      ) : null}
                      <SubmitButton name="status" value="resolved" className="min-h-9 text-xs">
                        Resolver
                      </SubmitButton>
                    </form>
                  ) : (
                    <Badge>resuelta</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Sin alertas abiertas" />
      )}
    </>
  );
}
