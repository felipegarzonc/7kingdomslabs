-- Longevity levers from the evidence review (docs: "Longevidad: base de evidencia para Bombadil"):
-- grip strength, estimated VO2max and weekly alcohol as measurements; smoking status on the profile.

-- ─── Measurements: new types ────────────────────────────────────────────────
alter table public.measurements drop constraint measurements_type_check;
alter table public.measurements add constraint measurements_type_check check (type in (
  'weight', 'waist', 'bp_systolic', 'bp_diastolic', 'resting_hr', 'sleep_hours', 'exercise_minutes',
  'grip_strength', 'vo2max', 'alcohol_drinks'
));

-- ─── Participants: smoking status ───────────────────────────────────────────
alter table public.participants
  add column smoking_status text check (smoking_status in ('never', 'former', 'current'));

-- ─── Onboarding and profile RPCs take the smoking status ────────────────────
drop function public.complete_onboarding(date, text, numeric, text, text, text, text);
create function public.complete_onboarding(
  p_birth_date date,
  p_sex text,
  p_height_cm numeric,
  p_personal_goal text,
  p_smoking_status text,
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
         smoking_status = p_smoking_status,
         status = case when status = 'invited' then 'active' else status end,
         pilot_start = coalesce(pilot_start, current_date)
   where id = pid;
end;
$$;

drop function public.update_my_profile(numeric, text);
create function public.update_my_profile(p_height_cm numeric, p_personal_goal text, p_smoking_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.participants
     set height_cm = p_height_cm, personal_goal = p_personal_goal, smoking_status = p_smoking_status
   where id = public.current_participant_id();
end;
$$;

revoke all on function public.complete_onboarding(date, text, numeric, text, text, text, text, text) from public, anon;
revoke all on function public.update_my_profile(numeric, text, text) from public, anon;
grant execute on function public.complete_onboarding(date, text, numeric, text, text, text, text, text) to authenticated;
grant execute on function public.update_my_profile(numeric, text, text) to authenticated;
