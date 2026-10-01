-- Connected devices and apps (Strava, Apple Health via an export app, and Garmin
-- through either). Imported data lands in `measurements` with its own source,
-- deduplicated by (participant, source, external_id), and can log habits on its own.

-- ─── Measurements: daily steps + dedupe key for imported rows ───────────────
alter table public.measurements drop constraint measurements_type_check;
alter table public.measurements add constraint measurements_type_check check (type in (
  'weight', 'waist', 'bp_systolic', 'bp_diastolic', 'resting_hr', 'sleep_hours', 'exercise_minutes',
  'grip_strength', 'vo2max', 'alcohol_drinks', 'steps'
));
alter table public.measurements add column external_id text;
-- NULLs are distinct, so manual rows (no external_id) never collide.
alter table public.measurements
  add constraint measurements_external_unique unique (participant_id, source, type, external_id);

-- ─── Habit logs: who logged it ──────────────────────────────────────────────
-- manual | strava | apple_health
alter table public.habit_logs add column source text not null default 'manual';

-- ─── Connections ────────────────────────────────────────────────────────────
create table public.device_connections (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  provider text not null check (provider in ('strava', 'apple_health')),
  status text not null default 'active' check (status in ('active', 'revoked', 'error')),
  -- Strava athlete id; null for Apple Health.
  external_user_id text,
  display_name text,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (participant_id, provider)
);
create index on public.device_connections (provider, external_user_id);

-- Tokens live apart from the connection and are readable only with the service role.
create table public.device_secrets (
  connection_id uuid primary key references public.device_connections (id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  -- Personal upload link token (Apple Health export apps).
  ingest_token text unique
);

alter table public.device_connections enable row level security;
alter table public.device_secrets enable row level security;
revoke all on public.device_connections, public.device_secrets from anon;
revoke all on public.device_secrets from authenticated;

-- Participants see their own connections; all writes go through the server (service role).
create policy device_connections_read on public.device_connections for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
