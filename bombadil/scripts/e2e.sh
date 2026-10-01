#!/usr/bin/env bash
# End-to-end run of the real app against local Postgres + PostgREST + fake
# Supabase gateway + fake Anthropic (see e2e/support/fake-services.mjs).
# Requires: Postgres binaries and a `postgrest` binary (POSTGREST_BIN).
set -euo pipefail
set -m # background jobs get their own process group, so cleanup can kill whole trees
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
POSTGREST_BIN="${POSTGREST_BIN:-$(command -v postgrest || true)}"
[ -x "$POSTGREST_BIN" ] || { echo "postgrest binary not found (set POSTGREST_BIN)"; exit 1; }
PORT=54329
DIR="$(mktemp -d)"
RUN=()
if [ "$(id -u)" = "0" ]; then chown postgres "$DIR"; RUN=(runuser -u postgres --); fi
PIDS=()
cleanup() {
  for p in "${PIDS[@]}"; do kill -- -"$p" 2>/dev/null || kill "$p" 2>/dev/null || true; done
  "${RUN[@]}" "$PG_BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
trap cleanup EXIT

"${RUN[@]}" "$PG_BIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$PG_BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=127.0.0.1" -l "$DIR/pg.log" start >/dev/null
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f tests/db/supabase-stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f supabase/seed.sql
"${PSQL[@]}" -c "with u as (insert into auth.users (email) values ('admin@bombadil.test') returning id) insert into public.admins select id from u;"

export JWT_SECRET="e2e-secret-e2e-secret-e2e-secret-0123456789"
export PG_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
export STORAGE_DIR="$DIR/storage"
PGRST_DB_URI="postgresql://authenticator@127.0.0.1:$PORT/postgres" PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon \
  PGRST_JWT_SECRET="$JWT_SECRET" PGRST_SERVER_PORT=54323 PGRST_SERVER_HOST=127.0.0.1 PGRST_LOG_LEVEL=warn \
  "$POSTGREST_BIN" >"$DIR/postgrest.log" 2>&1 &
PIDS+=($!)
node e2e/support/fake-services.mjs >"$DIR/fakes.log" 2>&1 &
PIDS+=($!)

export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(node e2e/support/jwt.mjs "$JWT_SECRET" anon)"
export SUPABASE_SERVICE_ROLE_KEY="$(node e2e/support/jwt.mjs "$JWT_SECRET" service_role)"
export ANTHROPIC_BASE_URL="http://127.0.0.1:54322"
export ANTHROPIC_API_KEY="fake"
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3100"
export E2E_PG_URL="$PG_URL"
# Exercise the operator review path for check-in replies (production sends them right away).
export CHECKIN_AUTO_SEND=false

if curl -s -o /dev/null http://127.0.0.1:3100 2>/dev/null; then echo "port 3100 already in use"; exit 1; fi
npx next build >"$DIR/build.log" 2>&1 || { tail -40 "$DIR/build.log"; exit 1; }
npx next start -p 3100 -H 127.0.0.1 >"$DIR/next.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:3100/login && break; sleep 1; done

status=0
npx playwright test "$@" || status=$?
if [ $status -ne 0 ]; then
  echo "── next.log ──"; tail -60 "$DIR/next.log"
  echo "── fakes.log ──"; tail -30 "$DIR/fakes.log"
  echo "── postgrest.log ──"; tail -20 "$DIR/postgrest.log"
fi
exit $status
