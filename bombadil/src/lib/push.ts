import "server-only";
import { createECDH, createHash } from "node:crypto";
import webpush from "web-push";
import { env } from "@/lib/env";

/**
 * Secrets derived from the service-role key, so the deployment needs no extra
 * configuration: rotating that key rotates these too (push subscriptions then
 * need to be re-enabled in each browser).
 */
const derive = (label: string) => createHash("sha256").update(`bombadil-${label}:${env.supabaseServiceRoleKey()}`).digest();

const b64url = (b: Buffer) => b.toString("base64url");

/** VAPID key pair (P-256) for web push. */
export function vapidKeys(): { publicKey: string; privateKey: string } {
  const priv = derive("vapid");
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(priv);
  return { publicKey: b64url(ecdh.getPublicKey()), privateKey: b64url(priv) };
}

/** Bearer token the reminder cron (Supabase pg_cron) must present. */
export function cronSecret(): string {
  return derive("cron").toString("hex");
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one notification. Returns "gone" when the browser dropped the subscription. */
export async function sendPush(target: PushTarget, payload: { title: string; body: string; url: string }): Promise<"ok" | "gone" | "error"> {
  const { publicKey, privateKey } = vapidKeys();
  try {
    await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify(payload), {
      vapidDetails: { subject: `${env.siteUrl()}/privacidad`, publicKey, privateKey },
      TTL: 3 * 3600,
    });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("push failed", status);
    return "error";
  }
}

export async function sendReminderEmail(to: string, subject: string, text: string): Promise<boolean> {
  const cfg = env.resend();
  if (!cfg) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to, subject, text: `${text}\n\nMárcalo en ${env.siteUrl()}/app\n\nPara dejar de recibir estos correos, apágalos en Personaje → Mis datos.` }),
  });
  if (!res.ok) console.error("reminder email failed", res.status);
  return res.ok;
}
