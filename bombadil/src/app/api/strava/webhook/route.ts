import { NextResponse, after, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { stravaEnabled, stravaVerifyToken, syncStrava } from "@/lib/strava";

export const maxDuration = 60;

/** Subscription handshake: Strava sends our verify token and expects the challenge back. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (!stravaEnabled() || p.get("hub.verify_token") !== stravaVerifyToken()) return new NextResponse("forbidden", { status: 403 });
  return NextResponse.json({ "hub.challenge": p.get("hub.challenge") });
}

interface StravaEvent {
  object_type: "activity" | "athlete";
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  updates?: Record<string, string>;
}

/** New, edited or deleted activity → re-read that athlete's last days. Must answer within 2 s. */
export async function POST(request: NextRequest) {
  if (!stravaEnabled()) return new NextResponse(null, { status: 200 });
  const ev = (await request.json().catch(() => null)) as StravaEvent | null;
  if (!ev?.owner_id) return new NextResponse(null, { status: 200 });
  const db = createServiceClient();
  const { data: conn } = await db.from("device_connections").select("id, participant_id").eq("provider", "strava").eq("external_user_id", String(ev.owner_id)).maybeSingle();
  if (!conn) return new NextResponse(null, { status: 200 });
  if (ev.object_type === "athlete" && ev.updates?.authorized === "false") {
    await db.from("device_connections").delete().eq("id", conn.id);
  } else if (ev.object_type === "activity") {
    after(() => syncStrava(db, conn, 7));
  }
  return new NextResponse(null, { status: 200 });
}
