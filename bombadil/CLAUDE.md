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
