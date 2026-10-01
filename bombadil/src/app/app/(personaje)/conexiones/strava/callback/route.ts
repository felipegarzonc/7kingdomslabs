import { NextResponse, after, type NextRequest } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { env } from "@/lib/env";
import { connectStrava, ensureStravaWebhook, STRAVA_BACKFILL_DAYS, STRAVA_STATE_COOKIE as STATE_COOKIE, stravaEnabled, syncStrava } from "@/lib/strava";
import { createServiceClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { participant } = await requireParticipant();
  const back = (q: string) => {
    const res = NextResponse.redirect(`${env.siteUrl()}/app/conexiones?${q}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/app/conexiones" });
    return res;
  };
  const p = request.nextUrl.searchParams;
  const code = p.get("code");
  if (!stravaEnabled() || !code || p.get("state") !== request.cookies.get(STATE_COOKIE)?.value) return back("error=strava");
  if (!(p.get("scope") ?? "").includes("activity:read")) return back("error=strava_permisos");
  const db = createServiceClient();
  try {
    const id = await connectStrava(db, participant.id, code);
    after(async () => {
      await syncStrava(db, { id, participant_id: participant.id }, STRAVA_BACKFILL_DAYS);
      await ensureStravaWebhook();
    });
  } catch (e) {
    console.error("strava connect failed", e);
    return back("error=strava");
  }
  return back("conectado=strava");
}
