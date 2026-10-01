-- Habits: small daily/weekly behaviours aligned with the participant's longevity
-- goal, logged with one tap and adapted week by week.

-- ─── Lifestyle baseline (2-minute questionnaire) ────────────────────────────
alter table public.participants add column lifestyle jsonb;

create function public.update_my_lifestyle(p_lifestyle jsonb, p_personal_goal text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.participants
     set lifestyle = p_lifestyle,
         personal_goal = coalesce(nullif(p_personal_goal, ''), personal_goal)
   where id = public.current_participant_id();
end;
$$;
revoke all on function public.update_my_lifestyle(jsonb, text) from public, anon;
grant execute on function public.update_my_lifestyle(jsonb, text) to authenticated;

-- ─── Habits ─────────────────────────────────────────────────────────────────
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  pillar text not null check (pillar in ('movimiento', 'fuerza', 'nutricion', 'sueno', 'estres', 'conexion', 'sustancias')),
  title text not null check (char_length(title) between 3 and 140),
  -- The smallest version that still counts on a bad day ("ponerme los tenis").
  tiny text check (char_length(tiny) <= 140),
  -- Implementation intention: "después de almorzar".
  anchor text check (char_length(anchor) <= 140),
  why text check (char_length(why) <= 500),
  -- What the next level looks like once this one is easy.
  next_step text check (char_length(next_step) <= 300),
  target_per_week integer not null default 7 check (target_per_week between 1 and 7),
  level integer not null default 1 check (level between 1 and 20),
  status text not null default 'active' check (status in ('suggested', 'active', 'paused', 'archived')),
  source text not null default 'user' check (source in ('plan', 'user')),
  prompt_version text,
  model text,
  started_on date,
  created_at timestamptz not null default now()
);
create index on public.habits (participant_id, status);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  day date not null,
  -- true = done, false = only the tiny version.
  full_version boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);
create index on public.habit_logs (participant_id, day);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
revoke all on public.habits, public.habit_logs from anon;

create policy habits_read on public.habits for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy habits_insert on public.habits for insert to authenticated
  with check ((participant_id = public.current_participant_id() and public.is_active_participant()) or public.is_admin());
create policy habits_update on public.habits for update to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin())
  with check (participant_id = public.current_participant_id() or public.is_admin());
create policy habits_delete on public.habits for delete to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());

-- A log must belong to one of the participant's own habits.
create policy habit_logs_read on public.habit_logs for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy habit_logs_insert on public.habit_logs for insert to authenticated
  with check (
    (participant_id = public.current_participant_id()
      and exists (select 1 from public.habits h where h.id = habit_id and h.participant_id = public.current_participant_id()))
    or public.is_admin()
  );
create policy habit_logs_update on public.habit_logs for update to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin())
  with check (participant_id = public.current_participant_id() or public.is_admin());
create policy habit_logs_delete on public.habit_logs for delete to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
