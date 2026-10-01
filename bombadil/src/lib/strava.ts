import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayInColombia } from "@/domain/habits";
import { stravaDays, type StravaActivity } from "@/domain/wearables";
import { markSynced, storeImport, type DeviceConnection } from "@/lib/devices";
import { env } from "@/lib/env";

const OAUTH = "https://www.strava.com/oauth";
const API = "https://www.strava.com/api/v3";
/** How far back the first sync looks. */
export const STRAVA_BACKFILL_DAYS = 60;
export const STRAVA_STATE_COOKIE = "bombadil_strava_state";

export const stravaEnabled = () => env.strava() !== null;

export function stravaRedirectUri(): string {
  return `${env.siteUrl()}/app/conexiones/strava/callback`;
}

export function stravaAuthorizeUrl(state: string): string {
  const cfg = env.strava()!;
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: stravaRedirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${OAUTH}/authorize?${q}`;
}

/** Shared with Strava when creating the webhook subscription (see scripts/deploy-vercel.ts). */
export function stravaVerifyToken(): string {
  return createHash("sha256").update(`bombadil-strava-webhook:${env.strava()!.clientSecret}`).digest("hex").slice(0, 32);
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const cfg = env.strava()!;
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...body }),
  });
  if (!res.ok) throw new Error(`Strava token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as TokenResponse;
}

/** Exchanges the OAuth code and stores the connection. Returns the connection id. */
export async function connectStrava(db: SupabaseClient, participantId: string, code: string): Promise<string> {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  const athleteId = t.athlete ? String(t.athlete.id) : null;
  // One Bombadil participant per Strava athlete.
  if (athleteId) await db.from("device_connections").delete().eq("provider", "strava").eq("external_user_id", athleteId).neq("participant_id", participantId);
  const { data: conn, error } = await db
    .from("device_connections")
    .upsert(
      { participant_id: participantId, provider: "strava", status: "active", external_user_id: athleteId, display_name: t.athlete?.firstname ?? "Strava", last_error: null },
      { onConflict: "participant_id,provider" },
    )
    .select("id")
    .single();
  if (error || !conn) throw new Error(error?.message ?? "no connection");
  const { error: e2 } = await db
    .from("device_secrets")
    .upsert({ connection_id: conn.id, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() });
  if (e2) throw new Error(e2.message);
  return conn.id;
}

async function accessToken(db: SupabaseClient, connectionId: string): Promise<string> {
  const { data: s } = await db.from("device_secrets").select("access_token, refresh_token, expires_at").eq("connection_id", connectionId).single();
  if (!s?.refresh_token) throw new Error("Strava no está conectado.");
  if (s.access_token && s.expires_at && Date.parse(s.expires_at) > Date.now() + 120_000) return s.access_token;
  const t = await tokenRequest({ refresh_token: s.refresh_token, grant_type: "refresh_token" });
  await db
    .from("device_secrets")
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() })
    .eq("connection_id", connectionId);
  return t.access_token;
}

async function fetchActivities(token: string, afterEpoch: number): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${API}/athlete/activities?after=${afterEpoch}&per_page=100&page=${page}`, { headers: { authorization: `Bearer ${token}` } });
    if (res.status === 401) throw new Error("Strava rechazó el acceso. Vuelve a conectar.");
    if (!res.ok) throw new Error(`Strava ${res.status}`);
    const batch = (await res.json()) as StravaActivity[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Pulls activities since `days` ago, rewrites those days' exercise totals and
 * logs habits. Whole days are re-read so totals stay right after edits or deletions.
 */
export async function syncStrava(db: SupabaseClient, conn: Pick<DeviceConnection, "id" | "participant_id">, days = 3) {
  try {
    const { data: p } = await db.from("participants").select("id, sex").eq("id", conn.participant_id).single();
    if (!p) return;
    const token = await accessToken(db, conn.id);
    // Whole local days: the first day re-read is `days - 1` days before today (Colombia time).
    const sinceDay = addDays(todayInColombia(), -(days - 1));
    const dayStart = new Date(`${sinceDay}T00:00:00-05:00`);
    // Strava filters by UTC start; widen by 14 h for activities logged in other time zones, then cut by local day.
    const activities = (await fetchActivities(token, Math.floor(dayStart.getTime() / 1000) - 14 * 3600)).filter((a) => a.start_date_local.slice(0, 10) >= sinceDay);
    const result = stravaDays(activities);
    // A day whose only activity was deleted must drop to zero.
    await db.from("measurements").delete().eq("participant_id", p.id).eq("source", "strava").gte("measured_at", dayStart.toISOString());
    await storeImport(db, p, "strava", result);
    await markSynced(db, conn.id);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("strava sync failed", msg);
    await markSynced(db, conn.id, msg);
  }
}

/**
 * Registers Strava's push subscription (new/edited/deleted activities) if it is not
 * there yet. Idempotent; runs after a connection so no manual setup is needed.
 */
export async function ensureStravaWebhook(): Promise<void> {
  const cfg = env.strava();
  if (!cfg) return;
  const callbackUrl = `${env.siteUrl()}/api/strava/webhook`;
  const base = `${API}/push_subscriptions`;
  const auth = new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret });
  try {
    const existing = (await (await fetch(`${base}?${auth}`)).json()) as Array<{ id: number; callback_url: string }>;
    const subs = Array.isArray(existing) ? existing : [];
    if (subs.some((s) => s.callback_url === callbackUrl)) return;
    // Strava allows one subscription per app: replace one pointing elsewhere.
    for (const s of subs) await fetch(`${base}/${s.id}?${auth}`, { method: "DELETE" });
    const res = await fetch(base, {
      method: "POST",
      body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, callback_url: callbackUrl, verify_token: stravaVerifyToken() }),
    });
    if (!res.ok) console.error("strava webhook subscription failed", res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error("strava webhook subscription failed", e);
  }
}

export async function disconnectStrava(db: SupabaseClient, connectionId: string) {
  try {
    const token = await accessToken(db, connectionId);
    await fetch(`${OAUTH}/deauthorize`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  } catch {
    // Already revoked on Strava's side.
  }
  await db.from("device_connections").delete().eq("id", connectionId);
}
