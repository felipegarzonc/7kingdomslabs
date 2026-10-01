# Bombadil — guía para Claude Code

Producto y requisitos: `docs/BRIEF.md` (brief "Sakura"). Plan y decisiones: `docs/PLAN.md`.

## Reglas del repo

- Código, identificadores y comentarios en **inglés**; texto de UI y prompts en **español** (tuteo).
- La lógica clínica vive en `src/domain` — pura, sin I/O ni LLM, siempre con tests.
- El LLM solo extrae (PDF → JSON) o redacta a partir de datos ya calculados. Nunca decide urgencias.
- Prompts versionados en `prompts/`; toda salida del LLM guarda `prompt_version` y `model`.
- Toda tabla con datos de participantes tiene RLS. Solo usar el service role en `src/lib/supabase/admin.ts`.
- Nunca subir exámenes reales al repo. Fixtures sintéticos en `src/domain/__fixtures__`.
- Si cambias `src/domain/biomarkers.ts`, corre `npm run gen:seed` (hay un test que lo verifica).

## Comandos

- `npm test` — tests de dominio (Vitest)
- `npm run test:db` — migraciones + test de RLS contra un Postgres local
- `npm run typecheck`, `npm run lint`, `npm run build`

## Despliegue (estado actual)

- Supabase de producción: proyecto `imwsoftnxhrhazgranay` (us-east-2), ya con `supabase/setup.sql` aplicado y el
  operador `felipegarzonc@gmail.com` creado. No volver a correr setup.sql ahí: los cambios posteriores se aplican
  corriendo solo las migraciones nuevas y luego `supabase/seed.sql` (es idempotente: hace upsert del catálogo).
- Publicar en Vercel: `npx tsx scripts/deploy-vercel.ts` (lee `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`,
  `BOMBADIL_ANTHROPIC_API_KEY` del entorno; nunca pedirlas en el chat). Crea/actualiza el proyecto, variables,
  publica la rama del PR, fija las URLs de acceso en Supabase y revisa `/estado`.
