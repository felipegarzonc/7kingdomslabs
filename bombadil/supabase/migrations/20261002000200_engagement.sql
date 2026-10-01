-- Engagement after the persona review: reminders (web push / email), a sober
-- mode, a share link for an accountability buddy, more device metrics,
-- protein logging, and "undo" that devices respect.

-- ─── Measurements: HRV, sleep stages, protein ───────────────────────────────
alter table public.measurements drop constraint measurements_type_check;
alter table public.measurements add constraint measurements_type_check check (type in (
  'weight', 'waist', 'bp_systolic', 'bp_diastolic', 'resting_hr', 'sleep_hours', 'exercise_minutes',
  'grip_strength', 'vo2max', 'alcohol_drinks', 'steps',
  'hrv_ms', 'sleep_deep_hours', 'sleep_rem_hours', 'protein_g'
));

-- ─── Participants: preferences and share link ───────────────────────────────
-- {sober: bool, reminders_email: bool}
alter table public.participants add column preferences jsonb not null default '{}';
-- Opaque token for the read-only "buddy" page; null = not shared.
alter table public.participants add column share_token text unique;

-- ─── Habits: reminder time (Colombia local time) ────────────────────────────
alter table public.habits add column reminder_time time;

-- ─── Web push subscriptions ─────────────────────────────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (participant_id);

-- ─── Reminders already sent (one per habit, day and kind) ───────────────────
create table public.reminder_log (
  participant_id uuid not null references public.participants (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('daily', 'never_twice')),
  sent_at timestamptz not null default now(),
  primary key (habit_id, day, kind)
);

-- ─── Device logs the person undid: devices must not log them again ──────────
create table public.habit_log_dismissals (
  habit_id uuid not null references public.habits (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, day)
);

alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;
alter table public.habit_log_dismissals enable row level security;
revoke all on public.push_subscriptions, public.reminder_log, public.habit_log_dismissals from anon;

-- Participants see their own rows; writes go through the server (service role),
-- except dismissals, which the participant creates when undoing a device log.
create policy push_subscriptions_read on public.push_subscriptions for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy reminder_log_read on public.reminder_log for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy habit_log_dismissals_read on public.habit_log_dismissals for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy habit_log_dismissals_insert on public.habit_log_dismissals for insert to authenticated
  with check (
    participant_id = public.current_participant_id()
    and exists (select 1 from public.habits h where h.id = habit_id and h.participant_id = public.current_participant_id())
  );
create policy habit_log_dismissals_delete on public.habit_log_dismissals for delete to authenticated
  using (participant_id = public.current_participant_id());

-- ─── The participant changes their own preferences and share link ───────────
create function public.update_my_preferences(p_sober boolean, p_reminders_email boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.participants
     set preferences = preferences || jsonb_build_object('sober', p_sober, 'reminders_email', p_reminders_email)
   where id = public.current_participant_id();
end;
$$;

-- Turns the buddy link on (a fresh 128-bit token every time) or off. Returns the token or null.
create function public.set_my_share(p_enabled boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare t text := case when p_enabled then replace(gen_random_uuid()::text, '-', '') end;
begin
  update public.participants set share_token = t where id = public.current_participant_id();
  return t;
end;
$$;

revoke all on function public.update_my_preferences(boolean, boolean) from public, anon;
revoke all on function public.set_my_share(boolean) from public, anon;
grant execute on function public.update_my_preferences(boolean, boolean) to authenticated;
grant execute on function public.set_my_share(boolean) to authenticated;
