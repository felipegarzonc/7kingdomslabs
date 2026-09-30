# Bombadil — Plan (Fase 0)

> Bombadil es el nombre del proyecto que implementa el brief "Sakura" (`docs/BRIEF.md`).
> Este documento es la salida de la Fase 0: arquitectura, estructura, decisiones y dudas.

## 1. Arquitectura

```
                       ┌──────────────────────────── Vercel ───────────────────────────┐
 Navegador (móvil) ───▶│ Next.js App Router (RSC + Server Actions)                     │
                       │  ├─ app/(participant)  /app/...   vista del participante      │
                       │  ├─ app/(admin)        /admin/... panel del operador          │
                       │  ├─ src/domain/*       lógica clínica PURA (sin LLM, testeada)│
                       │  ├─ src/lib/llm/*      extracción + redacción (Claude API)    │
                       │  └─ src/lib/supabase/* clientes con sesión del usuario (RLS)  │
                       └──────────────┬──────────────────────────────┬─────────────────┘
                                      │                              │
                     Supabase (Postgres + Auth + Storage)     Anthropic API
                     RLS en todas las tablas                  (solo recibe datos
                     bucket privado `lab-pdfs`                 estructurados o texto
                                                               de PDF ya enmascarado)
```

Principios aplicados:

- **Dominio puro** (`src/domain`): conversión de unidades, clasificación contra rangos,
  tendencias, métricas derivadas, síndrome metabólico, patrón dipper, estados de metas,
  reglas de escalamiento, retención. Sin I/O, sin LLM, 100 % con tests (Vitest).
- **El LLM solo hace dos cosas**: (a) PDF → JSON (texto previamente enmascarado),
  (b) redactar texto a partir de un snapshot ya calculado por el dominio.
  Toda salida se valida con Zod y guarda `prompt_version` + `model`.
- **Escalamiento determinista**: se evalúa en código *antes* de cualquier llamada al LLM,
  así funciona aunque la API falle. Umbrales en `config/escalation-rules.json`
  (marcados PENDIENTE DE VALIDAR, con fuente).
- **RLS por defecto**: el participante solo ve lo suyo; el admin ve todo mediante
  `public.is_admin()`. El service role se usa únicamente para: invitar usuarios,
  borrar cuentas completas y firmar URLs de Storage.
- **Humano en el medio**: extracciones, informes y (por defecto) respuestas de check-in
  requieren aprobación del admin antes de llegar al participante.

## 2. Estructura de carpetas

```
bombadil/
├─ config/escalation-rules.json   umbrales configurables (PENDIENTE médico asesor)
├─ prompts/                       prompts versionados (español)
├─ supabase/
│  ├─ migrations/                 esquema + RLS + storage
│  └─ seed.sql                    catálogo de biomarcadores (generado desde src/domain)
├─ src/
│  ├─ domain/                     lógica clínica pura + tests
│  ├─ lib/                        supabase, llm, pdf, redacción, auditoría
│  ├─ components/                 UI compartida
│  └─ app/                        rutas (participante, admin, auth, legal)
├─ tests/db/                      test explícito de RLS contra Postgres
├─ e2e/                           Playwright
└─ scripts/                       seed, test de base de datos
```

## 3. Decisiones tomadas (y cómo revertirlas)

| Decisión | Alternativa | Por qué |
|---|---|---|
| Stack del brief: Next.js 16 + Supabase + Claude + Recharts + Vercel | Postgres propio + Auth.js | Menos piezas para un piloto de 15 personas; RLS nativo; región de datos elegible. |
| Auth por **enlace mágico / código por correo** (Supabase OTP) | Contraseña | Sin contraseñas que gestionar; el admin invita por correo. |
| Participantes creados solo por **invitación del admin** | Registro abierto | Es un piloto concierge; evita cuentas no deseadas. |
| Catálogo de biomarcadores en **TypeScript** (fuente de verdad) + tabla SQL generada | Solo tabla SQL | Las conversiones se testean; un test garantiza que el seed está sincronizado. |
| Extracción: **texto del PDF** (unpdf) → enmascarado de PII → Claude | Enviar el PDF crudo | Cumple §7 (no enviar datos identificativos). PDFs escaneados: el admin transcribe a mano en la misma pantalla de revisión. |
| Modelo: `claude-opus-5-5` con esfuerzo configurable | Modelo más barato | Mejor calidad de extracción; se cambia con `ANTHROPIC_MODEL`. |
| Respuestas de check-in pasan por el admin (`CHECKIN_AUTO_SEND=false`) | Envío automático | Concierge; se activa el auto-envío cuando haya confianza. |
| Notificación al admin: panel + webhook opcional (`ALERT_WEBHOOK_URL`, formato Slack) | Correo transaccional | Sin proveedor extra; Slack/Discord/Make aceptan el mismo JSON. |
| Wearables: interfaz `MeasurementSource` en `measurements.source` | — | Deja preparada la integración (Strava, Apple Health, Garmin) sin construirla. |

## 4. Plan de trabajo

| Fase | Entregable | Estado |
|---|---|---|
| 0 | Este plan, estructura y dudas | ✅ |
| 1 | Esquema, migraciones, RLS, catálogo, dominio + tests | ✅ |
| 2 | Ingesta de PDF → extracción → revisión admin → guardado | ✅ |
| 3 | Línea de tiempo, mediciones, metas | ✅ |
| 4 | Informe con aprobación, check-in semanal, alertas | ✅ |
| 5 | Panel del piloto: retención, alertas, check-ins pendientes, disposición a pagar | ✅ |
| — | Usuario cero (Felipe) con sus exámenes 2023/2025/2026 + MAPA | ⏳ requiere despliegue |

## 5. Dudas abiertas (no bloquean)

1. **Médico asesor**: todos los umbrales de `config/escalation-rules.json` y los rangos
   "óptimos" de `src/domain/biomarkers.ts` están marcados como pendientes de validar.
2. **Hemoglobina/hematocrito en altura** (Bogotá ~2.600 m): la OMS ajusta los puntos de
   corte por altitud. ¿Aplicamos el ajuste según ciudad de residencia? Hoy solo se anota.
3. **Textos legales** (`src/content/legal.ts`): borrador; requieren abogado (Ley 1581/2012).
4. **Región de Supabase**: recomiendo `sa-east-1` (São Paulo) por latencia; confirmar si
   la SIC exige registro de la base de datos (RNBD) según tamaño de la entidad.
5. **Disposición a pagar**: el panel registra respuestas; propongo preguntarla en la
   semana 6 y en la 12, de forma abierta primero (Van Westendorp simplificado) para no
   anclar precio.
6. **Microalbuminuria**: se modela como relación albúmina/creatinina (mg/g). Si un
   laboratorio reporta solo concentración (mg/L), el admin debe convertir o anotar.
7. **Nombre y dominio definitivos** (hoy: Bombadil).
