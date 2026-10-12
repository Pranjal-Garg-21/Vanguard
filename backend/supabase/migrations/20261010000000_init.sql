-- MoneyPath initial schema. Owner: P5.
-- Students never read or write tables directly: their phones send events to the
-- `ingest` edge function, which uses the service role. Facilitators log in and
-- see only their own classes through row-level security.

-- ───────────────────────── Tables ─────────────────────────

create table public.ngos (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.facilitators (
  id           uuid primary key references auth.users (id) on delete cascade,
  ngo_id       uuid references public.ngos (id),
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- 6-character join codes without look-alike characters (0/O, 1/I/L).
create or replace function public.generate_join_code() returns text
language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  return code;
end;
$$;

create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  ngo_id           uuid references public.ngos (id),
  facilitator_id   uuid not null references public.facilitators (id) default auth.uid(),
  name             text not null,
  centre           text,
  language         text not null default 'en' check (language in ('en', 'te', 'hi', 'ur')),
  expected_size    int,
  join_code        char(6) not null unique default public.generate_join_code(),
  consent_confirmed boolean not null default false,
  focus            text,
  created_at       timestamptz not null default now()
);

-- Pseudonymous players: no real names, emails or phone numbers.
create table public.players (
  pid          text primary key,
  class_id     uuid not null references public.classes (id) on delete cascade,
  display_name text not null,
  first_seen   timestamptz not null default now(),
  last_sync    timestamptz
);

-- Mirrors shared/telemetry/event.ts. eid is the primary key, so re-sent events are ignored.
create table public.events (
  eid           text primary key,
  pid           text not null references public.players (pid) on delete cascade,
  class_id      uuid not null references public.classes (id) on delete cascade,
  mode          text not null,
  activity      text not null,
  concept       text not null,
  choice        text not null,
  correct       boolean,
  misconception text,
  level         smallint not null,
  life_stage    text,
  stage         text,
  timeline      text not null,
  ts            timestamptz not null,
  v             smallint not null,
  received_at   timestamptz not null default now()
);
create index events_class_concept_idx on public.events (class_id, concept);
create index events_class_ts_idx on public.events (class_id, ts);

create table public.unlocks (
  class_id  uuid not null references public.classes (id) on delete cascade,
  target    text not null,   -- 'S3', 'arcade.investing', ...
  from_date date,
  primary key (class_id, target)
);

-- Filled by the aggregate job (P5 Phase 7).
create table public.class_concept_daily (
  class_id uuid not null references public.classes (id) on delete cascade,
  day      date not null,
  concept  text not null,
  red      int not null default 0,
  amber    int not null default 0,
  green    int not null default 0,
  primary key (class_id, day, concept)
);

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.ngos                enable row level security;
alter table public.facilitators        enable row level security;
alter table public.classes             enable row level security;
alter table public.players             enable row level security;
alter table public.events              enable row level security;
alter table public.unlocks             enable row level security;
alter table public.class_concept_daily enable row level security;

-- Classes owned by the logged-in facilitator. security definer avoids RLS recursion.
create or replace function public.my_class_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.classes where facilitator_id = auth.uid();
$$;

create policy "facilitator reads own profile" on public.facilitators
  for select to authenticated using (id = auth.uid());

create policy "facilitator reads own ngo" on public.ngos
  for select to authenticated
  using (id in (select ngo_id from public.facilitators where id = auth.uid()));

create policy "facilitator manages own classes" on public.classes
  for all to authenticated
  using (facilitator_id = auth.uid())
  with check (facilitator_id = auth.uid());

create policy "facilitator reads own players" on public.players
  for select to authenticated using (class_id in (select public.my_class_ids()));

create policy "facilitator reads own events" on public.events
  for select to authenticated using (class_id in (select public.my_class_ids()));

create policy "facilitator manages own unlocks" on public.unlocks
  for all to authenticated
  using (class_id in (select public.my_class_ids()))
  with check (class_id in (select public.my_class_ids()));

create policy "facilitator reads own summaries" on public.class_concept_daily
  for select to authenticated using (class_id in (select public.my_class_ids()));
