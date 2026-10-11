-- Facilitator-made scenarios ("custom inbox"). Owner: P5.
-- A facilitator writes a few messages for one class. Published ones are
-- delivered to that class's phones by the `ingest` function. Students never
-- read this table directly.

create table public.custom_scenarios (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes (id) on delete cascade,
  facilitator_id uuid not null references public.facilitators (id) default auth.uid(),
  title          text not null check (char_length(title) between 1 and 60),
  brief          text not null default '' check (char_length(brief) <= 280),
  concept        text not null,            -- a concept ID, so results show in the class Insights
  language       text not null default 'en',
  body           jsonb not null check (pg_column_size(body) <= 60000),
  status         text not null default 'draft' check (status in ('draft', 'published')),
  version        int not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index custom_scenarios_class_idx on public.custom_scenarios (class_id, status);

-- Every edit bumps the version, so phones know when to fetch a newer copy.
create or replace function public.touch_custom_scenario() returns trigger
language plpgsql as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger custom_scenarios_touch
  before update on public.custom_scenarios
  for each row execute function public.touch_custom_scenario();

alter table public.custom_scenarios enable row level security;

create policy "facilitator manages own class scenarios" on public.custom_scenarios
  for all to authenticated
  using (class_id in (select public.my_class_ids()))
  with check (class_id in (select public.my_class_ids()) and facilitator_id = auth.uid());
