import type { Metadata } from "next";
import { fmtDateTime } from "@/components/format";
import { SubmitButton } from "@/components/submit-button";
import { Badge, buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { AUTO_MIN_EXERCISE_MINUTES, AUTO_MIN_STEPS } from "@/domain/wearables";
import { requireParticipant } from "@/lib/auth";
import type { DeviceConnection } from "@/lib/devices";
import { env } from "@/lib/env";
import { stravaEnabled } from "@/lib/strava";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createAppleHealthLink, disconnectDevice, syncStravaNow } from "./actions";
import { CopyField } from "./copy-field";

export const metadata: Metadata = { title: "Dispositivos" };

const ERRORS: Record<string, string> = {
  strava: "No pudimos conectar Strava. Inténtalo de nuevo.",
  strava_permisos: "Para usar Strava necesitamos permiso para ver tus actividades. Vuelve a conectar y deja marcada esa casilla.",
};

function Status({ conn }: { conn: DeviceConnection | undefined }) {
  if (!conn) return <Badge>Sin conectar</Badge>;
  if (conn.status === "error") return <Badge tone="warn">Revisar</Badge>;
  return <Badge tone="good">{conn.last_sync_at ? "Conectado" : "Esperando datos"}</Badge>;
}

function LastSync({ conn }: { conn: DeviceConnection }) {
  return (
    <p className="text-xs text-muted">
      {conn.last_sync_at ? `Últimos datos recibidos: ${fmtDateTime(conn.last_sync_at)}` : "Aún no han llegado datos."}
      {conn.status === "error" && conn.last_error ? ` · Último error: ${conn.last_error}` : ""}
    </p>
  );
}

export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ conectado?: string; error?: string }> }) {
  const { participant: p } = await requireParticipant();
  const { conectado, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("device_connections").select("*").eq("participant_id", p.id);
  const conns = (data ?? []) as DeviceConnection[];
  const strava = conns.find((c) => c.provider === "strava");
  const apple = conns.find((c) => c.provider === "apple_health");
  let uploadUrl: string | null = null;
  if (apple) {
    const { data: s } = await createServiceClient().from("device_secrets").select("ingest_token").eq("connection_id", apple.id).maybeSingle();
    if (s?.ingest_token) uploadUrl = `${env.siteUrl()}/api/ingest/${s.ingest_token}`;
  }

  return (
    <>
      <PageHeader title="Dispositivos" subtitle="Conecta tu reloj o tus apps y tus datos llegan solos: no tienes que anotar nada." />
      <div className="flex flex-col gap-4">
        {conectado === "strava" ? (
          <Notice tone="good" title="Strava conectado">
            Estamos trayendo tus actividades de los últimos 60 días. Tus hábitos de movimiento se marcarán solos cuando entrenes.
          </Notice>
        ) : null}
        {error && ERRORS[error] ? <Notice tone="warn">{ERRORS[error]}</Notice> : null}

        <Card>
          <p className="text-sm">
            <span className="font-semibold">Qué hacemos con tus datos:</span> pasos, sueño, frecuencia cardiaca en reposo, peso, presión y ejercicio se guardan en tu
            progreso y ajustan tu plan. Si un día caminas {AUTO_MIN_STEPS.toLocaleString("es-CO")} pasos o haces {AUTO_MIN_EXERCISE_MINUTES} minutos de ejercicio, tu hábito de
            movimiento se marca solo; si haces pesas, el de fuerza. Una presión alta genera la misma alerta que si la anotaras a mano.
          </p>
        </Card>

        <Card title="Strava" action={<Status conn={strava} />}>
          <p className="text-sm text-muted">Tus carreras, caminatas, bici, natación y pesas. Funciona en iPhone y Android.</p>
          {strava ? (
            <div className="mt-3 flex flex-col gap-3">
              <LastSync conn={strava} />
              <div className="flex flex-wrap gap-2">
                <form action={syncStravaNow}>
                  <SubmitButton variant="secondary" pendingText="Sincronizando…">
                    Sincronizar ahora
                  </SubmitButton>
                </form>
                <form action={disconnectDevice}>
                  <input type="hidden" name="provider" value="strava" />
                  <SubmitButton variant="ghost" pendingText="…" confirm="¿Desconectar Strava? Los datos ya importados se conservan.">
                    Desconectar
                  </SubmitButton>
                </form>
              </div>
            </div>
          ) : stravaEnabled() ? (
            // A plain link: this route starts the OAuth flow and must not be prefetched.
            <a href="/app/conexiones/strava/start" className={buttonClass("primary", "mt-3")}>
              Conectar con Strava
            </a>
          ) : (
            <p className="mt-3 text-sm text-muted">Disponible muy pronto en este piloto.</p>
          )}
        </Card>

        <Card title="Garmin">
          <p className="text-sm">Garmin no permite conexiones directas sin un convenio, pero sus datos llegan a Bombadil por dos caminos:</p>
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm">
            <li>
              <span className="font-medium">Actividades:</span> en la app Garmin Connect ve a Configuración → Apps conectadas → Strava y actívalo. Luego conecta Strava aquí arriba.
            </li>
            <li>
              <span className="font-medium">Sueño, pasos y pulso en reposo (iPhone):</span> en Garmin Connect → Configuración → Apps conectadas → Apple Salud, y luego configura
              Apple Salud aquí abajo.
            </li>
          </ol>
        </Card>

        <Card title="Apple Salud (iPhone y Apple Watch)" action={<Status conn={apple} />}>
          <p className="text-sm text-muted">
            Apple no deja que una página web lea Salud directamente, así que usamos la app <span className="font-medium text-text">Health Auto Export</span> (App Store), que
            envía tus datos a tu enlace personal cada día.
          </p>
          {uploadUrl && apple ? (
            <div className="mt-3 flex flex-col gap-3">
              <LastSync conn={apple} />
              <CopyField value={uploadUrl} label="Tu enlace personal" />
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                <li>Instala Health Auto Export y dale permiso de leer Salud.</li>
                <li>Abre Automatizaciones → nueva automatización de tipo REST API.</li>
                <li>En URL pega tu enlace (botón Copiar de arriba).</li>
                <li>
                  En Datos elige Métricas de salud: Pasos, Minutos de ejercicio, Frecuencia cardiaca en reposo, Análisis del sueño, Peso, VO2 máx. y Presión arterial. Agrega
                  también Entrenamientos.
                </li>
                <li>Formato JSON, agrupado por día, periodo de los últimos 7 días, y actívala para que se envíe sola.</li>
                <li>Toca “Exportar ahora” una vez: en un minuto verás tus datos en Progreso.</li>
              </ol>
              <p className="text-xs text-muted">El enlace es solo tuyo: no lo compartas. Si crees que alguien más lo tiene, genera uno nuevo y el anterior deja de funcionar.</p>
              <div className="flex flex-wrap gap-2">
                <form action={createAppleHealthLink}>
                  <SubmitButton variant="secondary" pendingText="…" confirm="El enlace actual dejará de funcionar. ¿Generar uno nuevo?">
                    Generar enlace nuevo
                  </SubmitButton>
                </form>
                <form action={disconnectDevice}>
                  <input type="hidden" name="provider" value="apple_health" />
                  <SubmitButton variant="ghost" pendingText="…" confirm="¿Desconectar Apple Salud? Los datos ya importados se conservan.">
                    Desconectar
                  </SubmitButton>
                </form>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-accent">¿Prefieres un Atajo de iOS?</summary>
                <p className="mt-2 text-muted">
                  Un Atajo puede leer Salud y hacer “Obtener contenido de URL” con método POST a tu enlace, enviando JSON con la fecha y los valores del día:
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">
                  {`{"date": "2026-10-01", "steps": 8200, "sleep_hours": 7.1,\n "resting_hr": 58, "exercise_minutes": 35, "weight": 78.4}`}
                </pre>
              </details>
            </div>
          ) : (
            <form action={createAppleHealthLink} className="mt-3">
              <SubmitButton pendingText="Creando…">Crear mi enlace de Apple Salud</SubmitButton>
            </form>
          )}
        </Card>

        <Card title="Android (Samsung, Google, Xiaomi…)">
          <p className="text-sm text-muted">
            Por ahora conecta Strava: la mayoría de relojes y apps de Android (Garmin, Samsung Health, Polar, Coros, Suunto, Wahoo) pueden enviar sus actividades a Strava.
          </p>
        </Card>
      </div>
    </>
  );
}
