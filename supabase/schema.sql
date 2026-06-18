-- =====================================================================
--  Sport-Duell – Supabase Schema
--  Im Supabase-Dashboard unter "SQL Editor" einfuegen und ausfuehren.
--  Das Skript ist idempotent und kann gefahrlos erneut ausgefuehrt werden.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Tabellen
-- ---------------------------------------------------------------------

-- Ein Profil pro angemeldeter Person (gekoppelt an Supabase Auth).
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Spieler',
  emoji        text not null default '🦊',
  color        text not null default '#1f4d3a',
  created_at   timestamptz not null default now()
);

-- Sportarten – gemeinsam genutzt, in der App verwaltbar.
create table if not exists public.activity_types (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  emoji             text not null default '🏅',
  points_per_minute numeric(6, 2) not null default 1.0 check (points_per_minute >= 0),
  sort_order        int  not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Eingetragene Aktivitaeten.
create table if not exists public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  activity_type_id uuid references public.activity_types (id) on delete set null,
  activity_date    date not null default current_date,
  duration_minutes int  not null check (duration_minutes > 0),
  points           numeric(8, 2) not null default 0 check (points >= 0),
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists activities_user_date_idx on public.activities (user_id, activity_date desc);
create index if not exists activities_date_idx      on public.activities (activity_date desc);

-- ---------------------------------------------------------------------
--  Rechte & Row Level Security
--  Lesen darf jede angemeldete Person alles (es ist ein gemeinsamer
--  Wettbewerb). Schreiben darf jede:r nur die eigenen Eintraege.
-- ---------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles       to authenticated;
grant select, insert, update, delete on public.activity_types to authenticated;
grant select, insert, update, delete on public.activities     to authenticated;

alter table public.profiles       enable row level security;
alter table public.activity_types enable row level security;
alter table public.activities     enable row level security;

-- profiles
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- activity_types (gemeinsam verwaltet von beiden Personen)
drop policy if exists types_select_auth on public.activity_types;
create policy types_select_auth on public.activity_types
  for select to authenticated using (true);

drop policy if exists types_insert_auth on public.activity_types;
create policy types_insert_auth on public.activity_types
  for insert to authenticated with check (true);

drop policy if exists types_update_auth on public.activity_types;
create policy types_update_auth on public.activity_types
  for update to authenticated using (true) with check (true);

drop policy if exists types_delete_auth on public.activity_types;
create policy types_delete_auth on public.activity_types
  for delete to authenticated using (true);

-- activities
drop policy if exists activities_select_auth on public.activities;
create policy activities_select_auth on public.activities
  for select to authenticated using (true);

drop policy if exists activities_insert_self on public.activities;
create policy activities_insert_self on public.activities
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists activities_update_self on public.activities;
create policy activities_update_self on public.activities
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists activities_delete_self on public.activities;
create policy activities_delete_self on public.activities
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
--  Trigger: beim Registrieren automatisch ein Profil anlegen.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'Spieler'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
--  Start-Sportarten (nur einfuegen, wenn der Name noch nicht existiert).
--  Faktor = Punkte pro Minute. In der App jederzeit aenderbar.
-- ---------------------------------------------------------------------
insert into public.activity_types (name, emoji, points_per_minute, sort_order)
select v.name, v.emoji, v.points_per_minute, v.sort_order
from (values
  ('Laufen',                '🏃', 1.0, 10),
  ('Radfahren',             '🚴', 0.6, 20),
  ('Schwimmen',             '🏊', 1.2, 30),
  ('Krafttraining',         '🏋️', 1.0, 40),
  ('Fußball',               '⚽', 0.8, 50),
  ('Yoga / Stretching',     '🧘', 0.5, 60),
  ('Spaziergang / Wandern', '🚶', 0.4, 70),
  ('HIIT',                  '🔥', 1.3, 80)
) as v(name, emoji, points_per_minute, sort_order)
where not exists (
  select 1 from public.activity_types t where t.name = v.name
);
