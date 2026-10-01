import { NextResponse, type NextRequest } from "next/server";
import { parseAppleHealth } from "@/domain/wearables";
import { markSynced, storeImport } from "@/lib/devices";
import { createServiceClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

async function connectionFor(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const db = createServiceClient();
  const { data: secret } = await db.from("device_secrets").select("connection_id").eq("ingest_token", token).maybeSingle();
  if (!secret) return null;
  const { data: conn } = await db.from("device_connections").select("id, participant_id, provider").eq("id", secret.connection_id).maybeSingle();
  if (!conn || conn.provider !== "apple_health") return null;
  const { data: participant } = await db.from("participants").select("id, sex, status").eq("id", conn.participant_id).maybeSingle();
  if (!participant || participant.status !== "active") return null;
  return { db, conn, participant };
}

/** Lets people check their link from a browser. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const found = await connectionFor((await params).token);
  return NextResponse.json(found ? { ok: true, message: "Enlace válido. Configúralo en tu app para enviar datos con POST." } : { ok: false }, { status: found ? 200 : 404 });
}

/** Personal upload link: Health Auto Export (REST API) or a Shortcut posts JSON here. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const found = await connectionFor((await params).token);
  if (!found) return NextResponse.json({ ok: false, error: "Enlace no válido. Genera uno nuevo en Bombadil → Dispositivos." }, { status: 404 });
  const body = await request.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ ok: false, error: "El cuerpo debe ser JSON." }, { status: 400 });
  const parsed = parseAppleHealth(body);
  try {
    const result = await storeImport(found.db, found.participant, "apple_health", parsed);
    await markSynced(found.db, found.conn.id);
    return NextResponse.json({ ok: true, stored: result.stored, habits_logged: result.habitsLogged });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markSynced(found.db, found.conn.id, msg);
    return NextResponse.json({ ok: false, error: "No se pudieron guardar los datos." }, { status: 500 });
  }
}
