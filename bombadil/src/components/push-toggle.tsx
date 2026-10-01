"use client";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/app/actions";
import { buttonClass } from "./ui";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "working" | "error";

const fromB64url = (s: string) => {
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** "Activar recordatorios" for this browser (web push). */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(publicKey) }));
      const { ok } = await savePushSubscription(sub.toJSON());
      setState(ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  async function disable() {
    setState("working");
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "loading") return <p className="text-sm text-muted">Revisando este navegador…</p>;
  if (state === "unsupported") return <p className="text-sm text-muted">Este navegador no admite notificaciones. En iPhone, primero agrega Bombadil a tu pantalla de inicio (Compartir → Agregar a inicio).</p>;
  if (state === "denied") return <p className="text-sm text-muted">Bloqueaste las notificaciones de Bombadil. Actívalas en la configuración del sitio de tu navegador (el candado junto a la dirección).</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === "on" ? (
        <>
          <p className="text-sm font-bold text-[#15803d] dark:text-[#4ade80]">Activados en este navegador.</p>
          <button type="button" onClick={disable} className={buttonClass("secondary")}>
            Desactivar
          </button>
        </>
      ) : (
        <button type="button" onClick={enable} disabled={state === "working"} className={buttonClass("primary")}>
          {state === "working" ? "Activando…" : "Activar recordatorios"}
        </button>
      )}
      {state === "error" ? <p className="text-sm text-danger">No se pudo activar. Intenta de nuevo.</p> : null}
    </div>
  );
}
