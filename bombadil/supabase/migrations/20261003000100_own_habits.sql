-- Start from what the person already does: their own habits are tracked from day one,
-- and the plan only suggests (never imposes) one or two improvements or additions.

-- 'own' = a habit the person already had when they joined.
alter table public.habits drop constraint habits_source_check;
alter table public.habits add constraint habits_source_check check (source in ('plan', 'user', 'own'));

-- A suggestion that levels up an existing habit replaces it when accepted.
alter table public.habits add column replaces_habit_id uuid references public.habits (id) on delete set null;

-- "Ahora no": declined suggestions are archived with this date so the plan does not insist.
alter table public.habits add column declined_at timestamptz;
