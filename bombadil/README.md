# Bombadil

**Longevidad sin humo.** Asistente de longevidad basado en evidencia para operar un piloto concierge
(10–15 personas, 8–12 semanas). Convierte exámenes de laboratorio de distintos laboratorios y años,
y mediciones caseras, en una línea de tiempo interpretada; acompaña a cada persona con 1–3 prioridades,
metas cortas y un check-in semanal de menos de 2 minutos.

- Requisitos del producto: [`docs/BRIEF.md`](docs/BRIEF.md) (brief "Sakura")
- Plan, decisiones y dudas abiertas: [`docs/PLAN.md`](docs/PLAN.md)

## Qué hace

| Participante (web móvil) | Operador (Felipe) |
|---|---|
| Consentimiento informado versionado + onboarding | Invita participantes por correo |
| Sube PDFs de laboratorio: se transcriben, guardan y analizan solos, con un informe nuevo publicado automáticamente | Corrige cualquier extracción al lado del PDF original (y transcribe a mano las que fallan) |
| Registra presión (brazo, día/noche), peso, cintura, FC, sueño, ejercicio, fuerza de agarre, VO2max y tragos de alcohol por semana | Puede generar, editar y publicar informes a mano además de los automáticos |
| Línea de tiempo por marcador con rango de referencia y tendencia | Revisa y envía las respuestas a los check-ins |
| Métricas derivadas: IMC, cintura/estatura, no-HDL, TG/HDL, FIB-4 (hígado), síndrome metabólico (ATP III e IDF), descenso nocturno de PA | Panel del piloto: retención semana a semana, efecto medible, disposición a pagar |
| Metas a 3/6/12 meses con estado (en camino / estancada / retrocediendo) | Alertas deterministas (urgencia / consultar pronto / próxima cita) |
| Check-in semanal con respuesta del equipo | Registro de auditoría de cada acceso a datos |
| Informes publicados; exportar o eliminar todos sus datos | Exportar o eliminar datos de un participante |

**Límites de diseño:** el LLM solo (a) transcribe PDFs a JSON a partir de texto con datos personales
enmascarados y (b) redacta a partir de datos ya calculados. Toda la lógica clínica vive en
`src/domain` (puro, testeado) y las urgencias se deciden con reglas en `config/escalation-rules.json`,
aunque la API del LLM falle. Los exámenes se analizan sin revisión humana previa: solo se guardan
automáticamente los valores del catálogo con unidad reconocida (`src/domain/auto-review.ts`); el resto queda
listado para el operador. Las respuestas a los check-ins siguen saliendo en borrador salvo `CHECKIN_AUTO_SEND=true`.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Supabase (Postgres + Auth + Storage, RLS en todo) ·
Claude API (`@anthropic-ai/sdk`, salidas validadas con Zod) · Tailwind 4 · Recharts · Vitest · Playwright · Vercel.

## Verlo en tu computador (5 minutos, sin cuentas)

Necesitas **Node 20+** y **Docker Desktop** abierto. Todo corre en tu máquina con datos sintéticos.

```bash
git clone https://github.com/felipegarzonc/7kingdomslabs.git
cd 7kingdomslabs && git checkout claude/bombadil-longevity-coach-ef7aiv
cd bombadil
npm install
npx supabase start          # Postgres + Auth + Storage locales; aplica migraciones y catálogo
npx supabase status -o env  # muestra API_URL, ANON_KEY y SERVICE_ROLE_KEY
```

Crea `.env.local` con esos valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ANTHROPIC_API_KEY=            # opcional para mirar; necesaria para extraer PDFs y generar informes
```

```bash
npm run demo:seed -- tu@correo.com   # tú = operador; crea el participante demo@bombadil.local
npm run dev                          # http://localhost:3000
```

Entra en http://localhost:3000/login con `tu@correo.com` (panel del operador) o con
`demo@bombadil.local` (vista del participante, en el celular o con la ventana angosta). Los correos no
salen de tu máquina: el código de 6 dígitos aparece en **http://127.0.0.1:54324**. Supabase Studio
(para ver las tablas) está en http://127.0.0.1:54323. Para apagar todo: `npx supabase stop`.

## Puesta en marcha en producción (≈30 minutos)

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com). Región sugerida: **South America (São Paulo)**.
2. Aplica el esquema. Con la CLI:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push          # aplica supabase/migrations/*
   psql "$DATABASE_URL" -f supabase/seed.sql   # catálogo de biomarcadores
   ```
   Sin CLI (más fácil): abre **SQL Editor → New query**, pega todo [`supabase/setup.sql`](supabase/setup.sql) y pulsa **Run**. Una sola vez, en un proyecto nuevo.
3. **Authentication → URL Configuration**: *Site URL* = tu dominio (p. ej. `https://bombadil.vercel.app`);
   agrega `https://<tu-dominio>/auth/confirm` a *Redirect URLs*.
4. **Authentication → Email Templates → Magic Link**: pega el contenido de
   [`supabase/templates/magic_link.html`](supabase/templates/magic_link.html). Incluye el código de 6 dígitos y
   un enlace con `token_hash`, que funciona aunque el correo se abra en otro dispositivo.
5. **Authentication → Providers → Email**: activo. El acceso igual queda cerrado: la app pide el código con
   `shouldCreateUser: false`, así que solo entran correos invitados por el operador.
6. Para más de unos pocos correos por hora configura SMTP propio (**Project Settings → Auth → SMTP**);
   el SMTP por defecto de Supabase tiene un límite bajo.

### 2. Variables de entorno

```bash
cp .env.example .env.local   # y completa los valores
```

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Igual; **solo servidor**, nunca en el navegador |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la app |
| `ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT` | Opcionales (por defecto `claude-opus-5-5`, `high`) |
| `CHECKIN_AUTO_SEND` | `true` para enviar respuestas sin revisión (por defecto `false`) |
| `ALERT_WEBHOOK_URL` | Opcional: webhook de Slack/Discord para urgencias |

### 3. Local

```bash
npm install
npm run dev                                                    # http://localhost:3000
npx tsx --env-file=.env.local scripts/bootstrap-admin.ts tu@correo.com   # crea el operador
```

Entra en `/login` con ese correo: recibirás un código de 6 dígitos.

### 4. Deploy en Vercel

1. Importa el repo en Vercel con **Root Directory = `bombadil`**.
2. Agrega las mismas variables de entorno (Production).
3. Deploy. Actualiza *Site URL* y *Redirect URLs* en Supabase con el dominio final.

La extracción de PDFs y la generación de informes pueden tardar hasta ~1 minuto; las rutas relevantes declaran
`maxDuration` de 120–300 s (en el plan Hobby de Vercel el máximo es menor: usa Pro o baja `ANTHROPIC_EFFORT`).

## Operar el piloto

1. **Usuario cero:** invítate como participante con tu mismo correo de operador. `/` te lleva al panel;
   tu vista de participante está en `/app` (la primera vez pasa por el consentimiento y el onboarding). Luego sube tus exámenes 2023, 2025 y 2026 y registra el MAPA como mediciones de presión
   marcando *Noche* en las lecturas nocturnas. Revisa las extracciones en **Exámenes** y el informe automático, y compara
   con tu análisis manual (criterio §10 del brief).
2. **Invitar:** Panel → *Invitar participante*. El correo lleva el código; si el participante no lo recibe,
   puede pedir otro en `/login`.
3. **Cada semana:** revisa *Check-ins* (respuestas generadas en borrador), *Alertas* y los *Exámenes* que fallaron o tienen valores sin guardar.
4. **Informes:** cada examen nuevo publica un informe automático y sus prioridades pasan a ser las del
   participante. Para uno a mano: ficha del participante → *Generar borrador de informe* → edita → *Aprobar y publicar*.
5. **Disposición a pagar:** los participantes ven la pregunta desde la semana 6; también puedes registrarla
   tras una conversación desde su ficha.

## Pruebas

```bash
npm test              # dominio puro + redacción de PII + sincronía del seed (Vitest)
npm run test:db       # migraciones + RLS contra un Postgres desechable (necesita binarios de Postgres)
npm run test:e2e      # app real en viewport móvil contra Postgres + PostgREST + servicios falsos
                      # (necesita POSTGREST_BIN=/ruta/a/postgrest; ver scripts/e2e.sh)
npm run lint && npm run typecheck && npm run build
```

- Los tests de escalamiento generan casos en ambos bordes de **cada** umbral de `config/escalation-rules.json`.
- El test de RLS prueba explícitamente que un participante no puede leer, escribir ni borrar datos de otro,
  que los borradores son invisibles para el participante y que la auditoría es de solo-anexar.
- El e2e usa un PDF sintético con PII falsa: el Anthropic falso rechaza la petición si le llega un nombre o
  documento sin enmascarar.
- `SCREENSHOT_DIR=/tmp/shots npm run test:e2e` guarda capturas para revisión visual.

## Estructura

```
config/escalation-rules.json   umbrales de escalamiento (PENDIENTE DE VALIDAR con médico asesor)
prompts/                       prompts versionados (extract-labs, report, checkin-reply)
src/domain/                    lógica clínica pura: catálogo, unidades, clasificación, tendencias,
                               derivadas, metas, escalamiento, piloto, snapshot del informe
src/lib/                       supabase, llm, pdf, redacción de PII, auditoría, alertas, jobs
src/app/app/                   vista del participante
src/app/admin/                 panel del operador
supabase/                      migraciones, seed generado, plantilla de correo
tests/db/                      stub de Supabase + test de RLS
e2e/                           Playwright + servicios falsos
```

## Cambiar reglas y rangos

- **Umbrales de alerta:** edita `config/escalation-rules.json` (cada regla con fuente) y corre `npm test`.
- **Biomarcadores / rangos:** edita `src/domain/biomarkers.ts`, luego `npm run gen:seed` y vuelve a aplicar
  `supabase/seed.sql` (es idempotente).
- **Prompts:** crea una versión nueva (`report.v2.md`) y cambia el número en `src/lib/llm/*.ts`;
  cada salida guarda qué versión y modelo la generaron.
- **Consentimiento:** edita `src/content/legal.ts` y sube `CONSENT_VERSION`.

## Privacidad y seguridad

- Datos sensibles bajo la Ley 1581 de 2012: consentimiento explícito registrado (versión + hash + fecha),
  aviso de privacidad en `/privacidad`, exportación y supresión total desde *Mis datos*.
- RLS en todas las tablas; el *service role* solo se usa en `src/lib/supabase/admin.ts` (invitaciones,
  borrado total, escritura de salidas del LLM en segundo plano).
- PDFs en bucket privado; se sirven con URLs firmadas de 60–120 s.
- Antes de extraer, el texto del PDF pasa por `src/lib/redact.ts` (nombre, documento, teléfono, correo,
  médico, fecha de nacimiento). Los PDFs escaneados sin texto no se envían al modelo: se transcriben a mano.
- **Nunca** subas exámenes reales al repositorio (`private-data/` y `*.real.pdf` están en `.gitignore`).
- Los textos legales y los umbrales clínicos son borradores: ver dudas abiertas en `docs/PLAN.md`.
