-- Bombadil — Row Level Security.
-- Participants see only their own rows; admins see everything.
-- Drafts (reports, check-in replies) are invisible to participants until approved.

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.current_participant_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.participants where auth_user_id = auth.uid();
$$;

create or replace function public.is_active_participant()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.participants where auth_user_id = auth.uid() and status = 'active');
$$;

-- Link the signed-in user to the participant row the admin created for their email.
create or replace function public.link_participant()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  pid uuid;
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or mail = '' then
    return null;
  end if;
  update public.participants
     set auth_user_id = auth.uid()
   where email = mail and auth_user_id is null
  returning id into pid;
  if pid is null then
    select id into pid from public.participants where auth_user_id = auth.uid();
  end if;
  return pid;
end;
$$;

-- Onboarding: consent + basic data in one transaction. Activates the participant.
create or replace function public.complete_onboarding(
  p_birth_date date,
  p_sex text,
  p_height_cm numeric,
  p_personal_goal text,
  p_consent_version text,
  p_consent_hash text,
  p_user_agent text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  pid uuid := public.current_participant_id();
begin
  if pid is null then
    raise exception 'not a participant';
  end if;
  if p_consent_version is null or p_consent_hash is null then
    raise exception 'consent required';
  end if;
  insert into public.consents (participant_id, version, text_hash, user_agent)
  values (pid, p_consent_version, p_consent_hash, left(p_user_agent, 300));
  update public.participants
     set birth_date = p_birth_date,
         sex = p_sex,
         height_cm = p_height_cm,
         personal_goal = p_personal_goal,
         status = case when status = 'invited' then 'active' else status end,
         pilot_start = coalesce(pilot_start, current_date)
   where id = pid;
end;
$$;

-- Participants may edit only their own basic profile fields.
create or replace function public.update_my_profile(p_height_cm numeric, p_personal_goal text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.participants
     set height_cm = p_height_cm, personal_goal = p_personal_goal
   where id = public.current_participant_id();
end;
$$;

revoke all on function public.link_participant() from public, anon;
revoke all on function public.complete_onboarding(date, text, numeric, text, text, text, text) from public, anon;
revoke all on function public.update_my_profile(numeric, text) from public, anon;
grant execute on function public.link_participant() to authenticated;
grant execute on function public.complete_onboarding(date, text, numeric, text, text, text, text) to authenticated;
grant execute on function public.update_my_profile(numeric, text) to authenticated;

-- ─── Enable RLS everywhere ──────────────────────────────────────────────────
alter table public.admins enable row level security;
alter table public.participants enable row level security;
alter table public.consents enable row level security;
alter table public.biomarkers enable row level security;
alter table public.lab_documents enable row level security;
alter table public.lab_results enable row level security;
alter table public.measurements enable row level security;
alter table public.goals enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_replies enable row level security;
alter table public.reports enable row level security;
alter table public.alerts enable row level security;
alter table public.pilot_feedback enable row level security;
alter table public.audit_log enable row level security;

-- Nothing is readable anonymously.
revoke all on all tables in schema public from anon;

-- ─── admins ─────────────────────────────────────────────────────────────────
create policy admins_self_read on public.admins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ─── participants ───────────────────────────────────────────────────────────
create policy participants_read on public.participants for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());
create policy participants_admin_write on public.participants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── consents: insert via complete_onboarding only; read own ────────────────
create policy consents_read on public.consents for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());

-- ─── biomarkers: catalog readable by any signed-in user ─────────────────────
create policy biomarkers_read on public.biomarkers for select to authenticated using (true);
create policy biomarkers_admin_write on public.biomarkers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── lab_documents: participant uploads & reads own; admin reviews ──────────
create policy lab_documents_read on public.lab_documents for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy lab_documents_insert_own on public.lab_documents for insert to authenticated
  with check (
    (participant_id = public.current_participant_id() and public.is_active_participant()
      and status = 'uploaded' and extraction is null and reviewed_at is null)
    or public.is_admin()
  );
create policy lab_documents_admin_update on public.lab_documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lab_documents_admin_delete on public.lab_documents for delete to authenticated
  using (public.is_admin());

-- ─── lab_results: only the admin writes (after human review) ────────────────
create policy lab_results_read on public.lab_results for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy lab_results_admin_write on public.lab_results for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── measurements: participant CRUD own ─────────────────────────────────────
create policy measurements_read on public.measurements for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy measurements_insert on public.measurements for insert to authenticated
  with check ((participant_id = public.current_participant_id() and public.is_active_participant()) or public.is_admin());
create policy measurements_delete on public.measurements for delete to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy measurements_admin_update on public.measurements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── goals: participant can read and create own; admin all ──────────────────
create policy goals_read on public.goals for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy goals_insert on public.goals for insert to authenticated
  with check ((participant_id = public.current_participant_id() and public.is_active_participant()) or public.is_admin());
create policy goals_update on public.goals for update to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin())
  with check (participant_id = public.current_participant_id() or public.is_admin());

-- ─── checkins ───────────────────────────────────────────────────────────────
create policy checkins_read on public.checkins for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy checkins_insert on public.checkins for insert to authenticated
  with check ((participant_id = public.current_participant_id() and public.is_active_participant()) or public.is_admin());
create policy checkins_admin_write on public.checkins for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy checkins_admin_delete on public.checkins for delete to authenticated
  using (public.is_admin());

-- ─── checkin_replies: participant sees only sent replies ────────────────────
create policy checkin_replies_read on public.checkin_replies for select to authenticated
  using ((participant_id = public.current_participant_id() and status = 'sent') or public.is_admin());
create policy checkin_replies_admin_write on public.checkin_replies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── reports: participant sees only approved ────────────────────────────────
create policy reports_read on public.reports for select to authenticated
  using ((participant_id = public.current_participant_id() and status = 'approved') or public.is_admin());
create policy reports_admin_write on public.reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── alerts: participants may raise (not edit) their own ────────────────────
create policy alerts_read on public.alerts for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy alerts_insert on public.alerts for insert to authenticated
  with check ((participant_id = public.current_participant_id() and status = 'open') or public.is_admin());
create policy alerts_admin_update on public.alerts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── pilot_feedback ─────────────────────────────────────────────────────────
create policy pilot_feedback_read on public.pilot_feedback for select to authenticated
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy pilot_feedback_insert on public.pilot_feedback for insert to authenticated
  with check (participant_id = public.current_participant_id() or public.is_admin());
create policy pilot_feedback_admin_write on public.pilot_feedback for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── audit_log: admins append as themselves; read by admins; never edited ───
create policy audit_insert on public.audit_log for insert to authenticated
  with check (public.is_admin() and actor_user_id = auth.uid());
create policy audit_read on public.audit_log for select to authenticated
  using (public.is_admin());
