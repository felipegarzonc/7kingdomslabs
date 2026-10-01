import { timingSafeEqual } from "node:crypto";
import { addDays, todayInColombia } from "@/domain/habits";
import { dueReminders, type ReminderHabit } from "@/domain/reminders";
import { cronSecret, sendPush, sendReminderEmail } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(cronSecret());
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Called every 15 minutes by Supabase pg_cron (see scripts/deploy-vercel.ts). */
export async function POST(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const db = createServiceClient();
  const today = todayInColombia();
  const now = new Date(Date.now() - 5 * 3600e3);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const [subsRes, peopleRes] = await Promise.all([
    db.from("push_subscriptions").select("participant_id, endpoint, p256dh, auth"),
    db.from("participants").select("id, email, preferences").eq("status", "active"),
  ]);
  const subs = subsRes.data ?? [];
  const people = new Map((peopleRes.data ?? []).map((p) => [p.id, p]));
  const wantsEmail = (id: string) => (people.get(id)?.preferences as { reminders_email?: boolean } | null)?.reminders_email === true && !!env.resend();
  const ids = [...people.keys()].filter((id) => subs.some((s) => s.participant_id === id) || wantsEmail(id));
  if (!ids.length) return Response.json({ sent: 0 });

  const [habitsRes, logsRes, sentRes] = await Promise.all([
    db.from("habits").select("id, participant_id, title, tiny, anchor, target_per_week, started_on, reminder_time").eq("status", "active").in("participant_id", ids),
    db.from("habit_logs").select("habit_id, day").in("participant_id", ids).gte("day", addDays(today, -1)),
    db.from("reminder_log").select("habit_id").eq("day", today).in("participant_id", ids),
  ]);
  const logs = logsRes.data ?? [];
  const due = dueReminders({
    habits: (habitsRes.data ?? []) as ReminderHabit[],
    today,
    nowMinutes,
    doneToday: new Set(logs.filter((l) => l.day === today).map((l) => l.habit_id)),
    doneYesterday: new Set(logs.filter((l) => l.day === addDays(today, -1)).map((l) => l.habit_id)),
    sentToday: new Set((sentRes.data ?? []).map((r) => r.habit_id)),
  });
  if (!due.length) return Response.json({ sent: 0 });

  // Claim first: only reminders this run inserted get sent, so overlapping runs can't double-send.
  const { data: claimed } = await db
    .from("reminder_log")
    .upsert(
      due.map((d) => ({ participant_id: d.participant_id, habit_id: d.habit_id, day: today, kind: d.kind })),
      { onConflict: "habit_id,day,kind", ignoreDuplicates: true },
    )
    .select("habit_id");
  const mine = new Set((claimed ?? []).map((c) => c.habit_id));
  let sent = 0;
  const gone: string[] = [];
  for (const d of due.filter((x) => mine.has(x.habit_id))) {
    for (const s of subs.filter((x) => x.participant_id === d.participant_id)) {
      const r = await sendPush(s, { title: d.title, body: d.body, url: "/app" });
      if (r === "ok") sent++;
      if (r === "gone") gone.push(s.endpoint);
    }
    if (wantsEmail(d.participant_id) && (await sendReminderEmail(people.get(d.participant_id)!.email, d.title, d.body))) sent++;
  }
  if (gone.length) await db.from("push_subscriptions").delete().in("endpoint", gone);
  return Response.json({ sent });
}
