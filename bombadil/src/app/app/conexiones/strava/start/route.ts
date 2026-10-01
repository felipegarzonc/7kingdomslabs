import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { env } from "@/lib/env";
import { STRAVA_STATE_COOKIE as STATE_COOKIE, stravaAuthorizeUrl, stravaEnabled } from "@/lib/strava";

export async function GET() {
  await requireParticipant();
  if (!stravaEnabled()) return NextResponse.redirect(`${env.siteUrl()}/app/conexiones`);
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(stravaAuthorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/app/conexiones", maxAge: 600 });
  return res;
}
