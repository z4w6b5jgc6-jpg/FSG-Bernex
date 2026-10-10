-- =====================================================================
-- Schéma de la base de données – Coach Athlé
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run
-- Le script peut être relancé sans risque (mise à jour de l'app).
-- =====================================================================

create extension if not exists pgcrypto;

-- Nettoyage de l'ancienne version (liens personnels par athlète)
drop function if exists athlete_portal(uuid);
drop function if exists athlete_submit_feedback(uuid, uuid, boolean, int, int, int, text, text);

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Club : un par entraîneur, avec le code d'invitation à partager aux athlètes
create table if not exists clubs (
  coach_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  invite_code  text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at   timestamptz not null default now()
);

create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now()
);

-- Athlètes : chacun a son propre compte (user_id) et rejoint le club via le lien d'invitation
create table if not exists athletes (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_id        uuid unique references auth.users (id) on delete set null,
  group_id       uuid references groups (id) on delete set null,
  first_name     text not null,
  last_name      text not null default '',
  birth_year     int,
  events         text not null default '',
  phone          text not null default '',
  avatar         text not null default '🏃',
  color          text not null default '#e85d04',
  goals          text not null default '',
  favorite_tips  text[] not null default '{}',
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
alter table athletes add column if not exists user_id uuid unique references auth.users (id) on delete set null;
alter table athletes add column if not exists phone text not null default '';
alter table athletes add column if not exists avatar text not null default '🏃';
alter table athletes add column if not exists color text not null default '#e85d04';
alter table athletes add column if not exists goals text not null default '';
alter table athletes add column if not exists favorite_tips text[] not null default '{}';
alter table athletes drop column if exists access_token;
alter table athletes drop column if exists notes;

-- Notes de suivi privées de l'entraîneur (jamais visibles par l'athlète)
create table if not exists athlete_notes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  athlete_id  uuid not null references athletes (id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  category     text not null default 'Autre',
  description  text not null default '',
  created_at   timestamptz not null default now()
);

-- blocks = [{ id, title, items: [{ id, name, sets, reps, distance, duration, recovery, intensity, notes }] }]
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  objective    text not null default '',
  focus        text not null default '',
  duration_min int,
  blocks       jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id   uuid not null references sessions (id) on delete cascade,
  date         date not null,
  time         text not null default '',
  location     text not null default '',
  group_id     uuid references groups (id) on delete cascade,
  athlete_ids  uuid[] not null default '{}',
  note         text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists feedback (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references assignments (id) on delete cascade,
  athlete_id     uuid not null references athletes (id) on delete cascade,
  completed      boolean not null default true,
  rpe            int check (rpe between 1 and 10),
  fatigue        int check (fatigue between 1 and 5),
  mood           int check (mood between 1 and 5),
  pain           text not null default '',
  comment        text not null default '',
  coach_reply    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assignment_id, athlete_id)
);

-- Conseils (nutrition, sommeil, récupération…) rédigés par l'entraîneur
create table if not exists tips (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category    text not null default 'Hygiène de vie',
  emoji       text not null default '💡',
  title       text not null,
  summary     text not null default '',
  body        text not null default '',
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Records personnels saisis par l'athlète
create table if not exists records (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references athletes (id) on delete cascade,
  event        text not null,
  mark         text not null,
  date         date not null default current_date,
  competition  text not null default '',
  created_at   timestamptz not null default now()
);

-- Check-in bien-être quotidien
create table if not exists wellness (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references athletes (id) on delete cascade,
  date           date not null default current_date,
  sleep_hours    numeric(3, 1) check (sleep_hours between 0 and 16),
  sleep_quality  int check (sleep_quality between 1 and 5),
  energy         int check (energy between 1 and 5),
  soreness       int check (soreness between 1 and 5),
  stress         int check (stress between 1 and 5),
  note           text not null default '',
  created_at     timestamptz not null default now(),
  unique (athlete_id, date)
);

create index if not exists assignments_date_idx on assignments (coach_id, date);
create index if not exists athletes_group_idx on athletes (group_id);
create index if not exists feedback_assignment_idx on feedback (assignment_id);
create index if not exists wellness_athlete_idx on wellness (athlete_id, date);

-- ---------------------------------------------------------------------
-- Fonctions utilitaires (qui suis-je ?)
-- ---------------------------------------------------------------------

create or replace function my_athlete_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from athletes where user_id = auth.uid() and active limit 1
$$;

create or replace function my_coach_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coach_id from athletes where user_id = auth.uid() and active limit 1
$$;

create or replace function my_group_id() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from athletes where user_id = auth.uid() and active limit 1
$$;

create or replace function is_my_athlete(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from athletes where id = p_athlete and coach_id = auth.uid())
$$;

-- Une séance planifiée concerne-t-elle l'athlète connecté ?
create or replace function targets_me(p_coach uuid, p_group uuid, p_ids uuid[]) returns boolean
language sql stable security definer set search_path = public as $$
  select p_coach = my_coach_id() and (p_group = my_group_id() or my_athlete_id() = any (p_ids))
$$;

-- ---------------------------------------------------------------------
-- Sécurité (Row Level Security)
--  * l'entraîneur voit et gère toutes les données de son club
--  * l'athlète ne voit que son profil, ses séances, ses retours, ses
--    records et son bien-être, plus les conseils publiés du club
-- ---------------------------------------------------------------------

alter table clubs         enable row level security;
alter table groups        enable row level security;
alter table athletes      enable row level security;
alter table athlete_notes enable row level security;
alter table exercises     enable row level security;
alter table sessions      enable row level security;
alter table assignments   enable row level security;
alter table feedback      enable row level security;
alter table tips          enable row level security;
alter table records       enable row level security;
alter table wellness      enable row level security;

-- Entraîneur : accès complet à ses propres lignes
do $$
declare t text;
begin
  foreach t in array array['clubs','groups','athletes','athlete_notes','exercises','sessions','assignments','tips'] loop
    execute format('drop policy if exists coach_all on %I', t);
    execute format('create policy coach_all on %I for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid())', t);
  end loop;
  foreach t in array array['feedback','records','wellness'] loop
    execute format('drop policy if exists coach_all on %I', t);
    execute format('create policy coach_all on %I for all to authenticated using (is_my_athlete(athlete_id)) with check (is_my_athlete(athlete_id))', t);
  end loop;
end $$;

-- Athlète : lecture du club, des groupes, des séances qui le concernent, des conseils
drop policy if exists athlete_read on clubs;
create policy athlete_read on clubs for select to authenticated using (coach_id = my_coach_id());

drop policy if exists athlete_read on groups;
create policy athlete_read on groups for select to authenticated using (coach_id = my_coach_id());

drop policy if exists athlete_read on assignments;
create policy athlete_read on assignments for select to authenticated
  using (targets_me(coach_id, group_id, athlete_ids));

drop policy if exists athlete_read on sessions;
create policy athlete_read on sessions for select to authenticated
  using (exists (select 1 from assignments a where a.session_id = sessions.id and targets_me(a.coach_id, a.group_id, a.athlete_ids)));

drop policy if exists athlete_read on tips;
create policy athlete_read on tips for select to authenticated using (coach_id = my_coach_id() and published);

-- Athlète : son propre profil (lecture + modification limitée, voir trigger)
drop policy if exists athlete_self on athletes;
create policy athlete_self on athletes for select to authenticated using (user_id = auth.uid());
drop policy if exists athlete_self_update on athletes;
create policy athlete_self_update on athletes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Athlète : ses retours, records et check-ins
drop policy if exists athlete_own on feedback;
create policy athlete_own on feedback for all to authenticated
  using (athlete_id = my_athlete_id())
  with check (
    athlete_id = my_athlete_id()
    and exists (select 1 from assignments a where a.id = assignment_id and targets_me(a.coach_id, a.group_id, a.athlete_ids))
  );

drop policy if exists athlete_own on records;
create policy athlete_own on records for all to authenticated
  using (athlete_id = my_athlete_id()) with check (athlete_id = my_athlete_id());

drop policy if exists athlete_own on wellness;
create policy athlete_own on wellness for all to authenticated
  using (athlete_id = my_athlete_id()) with check (athlete_id = my_athlete_id());

-- L'athlète ne peut pas changer de club, de groupe, ni se réactiver lui-même
create or replace function athletes_protect() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and auth.uid() is distinct from old.coach_id then
    new.coach_id := old.coach_id;
    new.group_id := old.group_id;
    new.active   := old.active;
    new.user_id  := old.user_id;
  end if;
  return new;
end $$;
drop trigger if exists athletes_protect on athletes;
create trigger athletes_protect before update on athletes for each row execute function athletes_protect();

-- Seul l'entraîneur écrit la réponse ; seul l'athlète écrit son ressenti
create or replace function feedback_protect() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_coach uuid;
begin
  select coach_id into v_coach from athletes where id = new.athlete_id;
  if auth.uid() is not null and auth.uid() is distinct from v_coach then
    new.coach_reply := case when tg_op = 'UPDATE' then old.coach_reply else '' end;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists feedback_protect on feedback;
create trigger feedback_protect before insert or update on feedback for each row execute function feedback_protect();

-- ---------------------------------------------------------------------
-- Fonctions appelées par l'application
-- ---------------------------------------------------------------------

-- Rôle de l'utilisateur connecté : 'coach', 'athlete' ou 'new' (pas encore inscrit)
create or replace function whoami() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_club clubs;
  v_ath  athletes;
begin
  select * into v_club from clubs where coach_id = auth.uid();
  if found then
    return json_build_object('role', 'coach', 'club_name', v_club.name, 'invite_code', v_club.invite_code);
  end if;
  select * into v_ath from athletes where user_id = auth.uid();
  if found then
    return json_build_object(
      'role', case when v_ath.active then 'athlete' else 'inactive' end,
      'athlete_id', v_ath.id,
      'club_name', (select name from clubs where coach_id = v_ath.coach_id));
  end if;
  return json_build_object('role', 'new');
end $$;

-- Création de l'espace entraîneur
create or replace function create_club(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from athletes where user_id = auth.uid()) then raise exception 'already_athlete'; end if;
  insert into clubs (coach_id, name) values (auth.uid(), p_name)
  on conflict (coach_id) do update set name = excluded.name;
end $$;

create or replace function regenerate_invite_code() returns text
language sql security definer set search_path = public as $$
  update clubs set invite_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
  where coach_id = auth.uid() returning invite_code
$$;

-- Infos publiques d'un club à partir du code (page d'inscription)
create or replace function club_by_code(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', c.name,
    'groups', coalesce((select json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color) order by g.name)
                        from groups g where g.coach_id = c.coach_id), '[]'::json))
  from clubs c where c.invite_code = upper(trim(p_code))
$$;

-- Inscription de l'athlète connecté dans le club
create or replace function join_club(
  p_code text, p_first_name text, p_last_name text, p_birth_year int,
  p_group_id uuid, p_events text, p_phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_coach uuid;
  v_id    uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from clubs where coach_id = auth.uid()) then raise exception 'is_coach'; end if;
  if exists (select 1 from athletes where user_id = auth.uid()) then raise exception 'already_member'; end if;
  select coach_id into v_coach from clubs where invite_code = upper(trim(p_code));
  if v_coach is null then raise exception 'invalid_code'; end if;
  if p_group_id is not null and not exists (select 1 from groups where id = p_group_id and coach_id = v_coach) then
    p_group_id := null;
  end if;
  insert into athletes (coach_id, user_id, group_id, first_name, last_name, birth_year, events, phone)
  values (v_coach, auth.uid(), p_group_id, trim(p_first_name), trim(coalesce(p_last_name, '')), p_birth_year,
          coalesce(p_events, ''), coalesce(p_phone, ''))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function whoami() from public;
revoke all on function create_club(text) from public;
revoke all on function regenerate_invite_code() from public;
revoke all on function club_by_code(text) from public;
revoke all on function join_club(text, text, text, int, uuid, text, text) from public;
grant execute on function whoami() to authenticated;
grant execute on function create_club(text) to authenticated;
grant execute on function regenerate_invite_code() to authenticated;
grant execute on function club_by_code(text) to anon, authenticated;
grant execute on function join_club(text, text, text, int, uuid, text, text) to authenticated;
