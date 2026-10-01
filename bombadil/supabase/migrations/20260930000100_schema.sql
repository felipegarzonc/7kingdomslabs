-- Bombadil — core schema.
-- Every table holding participant data has RLS enabled (see 20260930000200_rls.sql).

create extension if not exists pgcrypto;

-- ─── Admins ─────────────────────────────────────────────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── Participants ───────────────────────────────────────────────────────────
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique check (email = lower(email)),
  -- Display name is for the operator only; never sent to the LLM.
  display_name text,
  birth_date date,
  sex text check (sex in ('male', 'female')),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  personal_goal text check (char_length(personal_goal) <= 1000),
  -- 1-3 current priorities, set by the operator when approving a report.
  priorities text[] not null default '{}' check (cardinality(priorities) <= 3),
  pilot_start date,
  status text not null default 'invited' check (status in ('invited', 'active', 'withdrawn', 'completed')),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Consents (immutable) ───────────────────────────────────────────────────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  version text not null,
  text_hash text not null,
  accepted_at timestamptz not null default now(),
  user_agent text
);
create index on public.consents (participant_id);

-- ─── Biomarker catalog (seeded from src/domain/biomarkers.ts) ───────────────
create table public.biomarkers (
  code text primary key,
  name text not null,
  category text not null,
  synonyms text[] not null default '{}',
  unit text not null,
  conversions jsonb not null,
  reference jsonb not null,
  optimal jsonb,
  better_when text not null check (better_when in ('lower', 'higher', 'in_range')),
  source text not null,
  notes text
);

-- ─── Lab documents and results ──────────────────────────────────────────────
create table public.lab_documents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  storage_path text not null unique,
  original_filename text,
  lab_name text,
  sampled_on date,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'extracting', 'extracted', 'reviewed', 'failed')),
  extraction jsonb,
  extraction_error text,
  prompt_version text,
  model text,
  redactions integer,
  uploaded_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.lab_documents (participant_id);
create index on public.lab_documents (status);

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.lab_documents (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  biomarker_code text not null references public.biomarkers (code),
  sampled_on date not null,
  value_original numeric not null,
  unit_original text not null,
  value_canonical numeric not null,
  lab_ref_low numeric,
  lab_ref_high numeric,
  flag text check (flag in ('low', 'normal', 'high')),
  corrected_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (document_id, biomarker_code)
);
create index on public.lab_results (participant_id, biomarker_code, sampled_on);

-- ─── Measurements ───────────────────────────────────────────────────────────
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  type text not null check (type in ('weight', 'waist', 'bp_systolic', 'bp_diastolic', 'resting_hr', 'sleep_hours', 'exercise_minutes')),
  value numeric not null,
  unit text not null,
  measured_at timestamptz not null,
  -- {arm: left|right, period: day|night, note}
  context jsonb not null default '{}',
  -- Pairs systolic and diastolic readings taken together.
  group_id uuid,
  -- manual | checkin | abpm | (future) strava | apple_health | garmin
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index on public.measurements (participant_id, type, measured_at);

-- ─── Goals ──────────────────────────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  metric text not null,
  baseline numeric not null,
  target numeric not null,
  horizon_months integer not null check (horizon_months in (3, 6, 12)),
  start_date date not null,
  deadline date not null,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (deadline > start_date)
);
create index on public.goals (participant_id);

-- ─── Weekly check-ins ───────────────────────────────────────────────────────
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  week integer not null check (week between 1 and 60),
  -- {priority: "done"|"partial"|"no"} per current priority
  adherence jsonb not null default '[]',
  symptoms text[] not null default '{}',
  free_text text check (char_length(free_text) <= 2000),
  answers jsonb not null default '{}',
  duration_seconds integer,
  submitted_at timestamptz not null default now(),
  unique (participant_id, week)
);
create index on public.checkins (participant_id);

-- Replies live apart so participants never see an unapproved draft.
create table public.checkin_replies (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null unique references public.checkins (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  draft text,
  final_text text,
  status text not null default 'pending' check (status in ('pending', 'draft', 'failed', 'sent')),
  error text,
  prompt_version text,
  model text,
  sent_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.checkin_replies (status);

-- ─── Reports ────────────────────────────────────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  content jsonb not null,
  input_snapshot jsonb not null,
  prompt_version text not null,
  model text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or approved_at is not null)
);
create index on public.reports (participant_id, status);

-- ─── Alerts ─────────────────────────────────────────────────────────────────
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  rule_id text not null,
  level text not null check (level in ('urgency', 'consult_soon', 'next_visit')),
  origin text not null check (origin in ('measurement', 'checkin', 'lab')),
  origin_id uuid,
  message text not null,
  evidence text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.alerts (participant_id, status);

-- ─── Pilot feedback / willingness to pay ────────────────────────────────────
create table public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  week integer,
  willingness_to_pay_cop integer check (willingness_to_pay_cop >= 0),
  would_continue text check (would_continue in ('yes', 'maybe', 'no')),
  comments text,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index on public.pilot_feedback (participant_id);

-- ─── Audit log of admin access (append-only) ────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  action text not null,
  participant_id uuid,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index on public.audit_log (participant_id, at desc);
