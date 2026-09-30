#!/usr/bin/env bash
# Spins up a throwaway local Postgres, applies a Supabase stub + all migrations
# + seed, and runs the RLS tests against it.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-54329}"
DIR="$(mktemp -d)"
RUN=()
if [ "$(id -u)" = "0" ]; then
  chown postgres "$DIR"
  RUN=(runuser -u postgres --)
fi
cleanup() { "${RUN[@]}" "$PG_BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

"${RUN[@]}" "$PG_BIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$PG_BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null

PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f tests/db/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f supabase/seed.sql
echo "migrations + seed applied"

RLS_DATABASE_URL="postgresql://postgres@localhost:$PORT/postgres?host=$DIR" npx vitest run tests/db
