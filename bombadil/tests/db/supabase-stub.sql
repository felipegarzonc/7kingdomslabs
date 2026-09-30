-- Minimal stand-in for the parts of Supabase that our migrations depend on,
-- so migrations and RLS can be tested against plain Postgres.
-- NOT used in production (Supabase provides the real auth/storage schemas).

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- Same shape as Supabase: supports both the legacy per-claim settings and
-- PostgREST's request.jwt.claims JSON.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true),
                       'email', current_setting('request.jwt.claim.email', true))
  );
$$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid default auth.uid()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/') ;
$$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant select on auth.users to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant all on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

-- PostgREST connects as `authenticator` and switches to the JWT role.
do $$ begin
  create role authenticator login noinherit;
exception when duplicate_object then null; end $$;
grant anon, authenticated, service_role to authenticator;
