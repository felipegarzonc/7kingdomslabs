"use server";
import { revalidatePath } from "next/cache";
import { requireParticipant } from "@/lib/auth";
import { rotateAppleHealthToken } from "@/lib/devices";
import { disconnectStrava, syncStrava } from "@/lib/strava";
import { createServiceClient } from "@/lib/supabase/admin";

// Device tokens are only readable with the service role; every action first checks the owner.

export async function createAppleHealthLink(): Promise<void> {
  const { participant } = await requireParticipant();
  await rotateAppleHealthToken(createServiceClient(), participant.id);
  revalidatePath("/app/conexiones");
}

export async function disconnectDevice(form: FormData): Promise<void> {
  const { participant } = await requireParticipant();
  const provider = String(form.get("provider"));
  const db = createServiceClient();
  const { data: conn } = await db.from("device_connections").select("id").eq("participant_id", participant.id).eq("provider", provider).maybeSingle();
  if (!conn) return;
  if (provider === "strava") await disconnectStrava(db, conn.id);
  else await db.from("device_connections").delete().eq("id", conn.id);
  revalidatePath("/app", "layout");
}

export async function syncStravaNow(): Promise<void> {
  const { participant } = await requireParticipant();
  const db = createServiceClient();
  const { data: conn } = await db.from("device_connections").select("id, participant_id").eq("participant_id", participant.id).eq("provider", "strava").maybeSingle();
  if (conn) await syncStrava(db, conn, 14);
  revalidatePath("/app", "layout");
}
