import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime } from "@/components/format";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { SYMPTOM_LABEL, type Symptom } from "@/domain/escalation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { regenerateReply } from "../actions";
import { ReplyForm } from "./reply-form";

export const metadata: Metadata = { title: "Check-ins" };
export const maxDuration = 120;

export default async function CheckinsQueue({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdmin();
  const { id } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("checkins")
    .select("id, week, submitted_at, adherence, symptoms, free_text, duration_seconds, participant_id, participants(display_name, email), checkin_replies(status, draft, final_text, error, prompt_version, model)")
    .order("submitted_at", { ascending: false })
    .limit(60);
  if (id) q = q.eq("id", id);
  const { data } = await q;
  const items = (data ?? []).map((c) => {
    const rep = c.checkin_replies as unknown as { status: string; draft: string | null; final_text: string | null; error: string | null; prompt_version: string | null; model: string | null } | Array<unknown> | null;
    const reply = (Array.isArray(rep) ? rep[0] : rep) as { status: string; draft: string | null; final_text: string | null; error: string | null; prompt_version: string | null; model: string | null } | undefined;
    return { ...c, reply };
  });
  const pending = id ? items : items.filter((c) => c.reply?.status !== "sent");

  return (
    <>
      <PageHeader title="Check-ins" subtitle="Respuestas generadas por el modelo que esperan tu revisión antes de llegar al participante." />
      {pending.length ? (
        <div className="flex flex-col gap-4">
          {pending.map((c) => {
            const p = c.participants as unknown as { display_name: string | null; email: string };
            return (
              <Card key={c.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/participantes/${c.participant_id}`} className="font-semibold text-accent">
                    {p.display_name ?? p.email} · semana {c.week}
                  </Link>
                  <span className="text-xs text-muted">
                    {fmtDateTime(c.submitted_at)} · {c.duration_seconds ?? "—"} s
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-sm">
                    {(c.adherence as Array<{ priority: string; status: string }>).map((a) => (
                      <p key={a.priority}>
                        {a.priority}: <Badge tone={a.status === "done" ? "good" : a.status === "partial" ? "warn" : "danger"}>{{ done: "sí", partial: "a medias", no: "no" }[a.status] ?? a.status}</Badge>
                      </p>
                    ))}
                    {(c.symptoms as Symptom[]).map((s) => (
                      <p key={s} className="mt-1 text-danger">
                        ⚠️ {SYMPTOM_LABEL[s]}
                      </p>
                    ))}
                    {c.free_text ? <p className="mt-2 rounded-lg bg-surface-2 p-2">“{c.free_text}”</p> : null}
                  </div>
                  <div>
                    {c.reply?.status === "sent" ? (
                      <p className="text-sm whitespace-pre-line">{c.reply.final_text}</p>
                    ) : c.reply?.status === "draft" ? (
                      <>
                        <ReplyForm checkinId={c.id} draft={c.reply.draft ?? ""} />
                        <p className="mt-1 text-xs text-muted">
                          {c.reply.prompt_version} · {c.reply.model}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-muted">
                          {c.reply?.status === "failed" ? `La generación falló: ${c.reply.error}` : c.reply?.status === "pending" ? "Generando…" : "Sin respuesta generada."} Puedes escribirla a mano o reintentar.
                        </p>
                        <ReplyForm checkinId={c.id} draft="" />
                      </>
                    )}
                    {c.reply?.status !== "sent" ? (
                      <form action={regenerateReply} className="mt-2">
                        <input type="hidden" name="checkin_id" value={c.id} />
                        <SubmitButton variant="ghost" pendingText="Generando…">
                          Regenerar con IA
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Todo respondido" />
      )}
    </>
  );
}
