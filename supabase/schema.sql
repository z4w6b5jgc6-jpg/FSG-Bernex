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

-- Organisation générale des entraînements (horaires, lieux…), affichée dans le planning
alter table clubs add column if not exists training_info text not null default '';
-- Réglages de l'espace : lieux, règle été / hiver, description du groupe pour l'assistant
alter table clubs add column if not exists settings jsonb not null default '{}'::jsonb;

-- Autres entraîneurs du club : ajoutés par email, reliés à leur compte à la première connexion
create table if not exists club_coaches (
  owner_id    uuid not null default auth.uid() references clubs (coach_id) on delete cascade,
  email       text not null check (email = lower(trim(email)) and email <> ''),
  user_id     uuid unique references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (owner_id, email)
);

-- Liens d'invitation entraîneur (envoyés par WhatsApp) : usage unique, valables 14 jours
create table if not exists coach_invites (
  token       text primary key check (length(token) >= 20),
  owner_id    uuid not null default auth.uid() references clubs (coach_id) on delete cascade,
  created_at  timestamptz not null default now()
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
  email          text not null default '',          -- saisi par l'entraîneur, sert à relier l'inscription
  linked_at      timestamptz,                       -- date à laquelle l'athlète a relié son compte
  signup_reviewed boolean not null default true,    -- false = nouvelle inscription à vérifier par l'entraîneur
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
alter table athletes add column if not exists email text not null default '';
alter table athletes add column if not exists linked_at timestamptz;
alter table athletes add column if not exists signup_reviewed boolean not null default true;
-- Sous-groupe des séances du lundi : 'sprint' (Sprint / Sauts / Haies), '400-800' ou '' (aucun)
alter table athletes add column if not exists subgroup text not null default '';

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
-- Plan du lundi : plan = { name, date, cycle, light, objective, warmup, speed, content, cooldown, remarks, subgroup }
-- targets = répétitions chronométrées [{ ordre, d, base: 'VMA'|'RVA'|'REC'|'INT', pct }] (temps calculés par athlète dans l'app)
alter table sessions add column if not exists plan jsonb not null default '{}'::jsonb;
alter table sessions add column if not exists targets jsonb not null default '[]'::jsonb;

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
-- Temps de récupération ressentis : 1 trop courts, 2 adaptés, 3 trop longs
alter table feedback add column if not exists recovery_fit int check (recovery_fit between 1 and 3);

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
-- 'perf' = record ou résultat de compétition ; 'muscu' = charge maximale (event = exercice, mark = « 80 kg »)
alter table records add column if not exists kind text not null default 'perf';

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
-- Contenu montré aux athlètes plus tôt que la règle du groupe (« montrer maintenant ») : null = la règle
alter table assignments add column if not exists visible_from timestamptz;

-- Le contenu d'une séance est-il visible pour les athlètes ? Règle du groupe (Réglages, settings.release) :
-- 'plan' dès la planification, 'day' le jour même, 'start' à l'heure, 'hour' 1 h avant (par défaut). Heure de Genève.
create or replace function assignment_released(p_coach uuid, p_date date, p_time text, p_visible timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select (p_visible is not null and p_visible <= now()) or now() >= (
    select case coalesce((select settings->>'release' from clubs where coach_id = p_coach), 'hour')
      when 'plan' then '-infinity'::timestamptz
      when 'day' then p_date::timestamp at time zone 'Europe/Zurich'
      when 'start' then (case when p_time ~ '^\d{1,2}:\d{2}$' then p_date + p_time::time else p_date::timestamp end) at time zone 'Europe/Zurich'
      else ((case when p_time ~ '^\d{1,2}:\d{2}$' then p_date + p_time::time else p_date::timestamp end) at time zone 'Europe/Zurich') - interval '1 hour'
    end)
$$;
create index if not exists athletes_group_idx on athletes (group_id);
create index if not exists feedback_assignment_idx on feedback (assignment_id);
-- Tests physiques définis par l'entraîneur (30 m, VMA, détente…)
create table if not exists tests (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  unit              text not null default '',
  higher_is_better  boolean not null default true,
  category          text not null default 'Autre',
  description       text not null default '',
  created_at        timestamptz not null default now()
);

-- Résultats des tests (saisis par l'entraîneur)
create table if not exists test_results (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references athletes (id) on delete cascade,
  test_id     uuid not null references tests (id) on delete cascade,
  date        date not null default current_date,
  value       numeric not null,                   -- meilleur essai
  trials      numeric[] not null default '{}',    -- tous les essais (ex. 20 m lancé : essai 1, essai 2)
  notes       text not null default '',
  created_at  timestamptz not null default now()
);
alter table test_results add column if not exists trials numeric[] not null default '{}';
create index if not exists test_results_athlete_idx on test_results (athlete_id, test_id, date);

-- Bilan de tests rédigé par l'entraîneur, lisible par l'athlète
create table if not exists test_reports (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references athletes (id) on delete cascade,
  date        date not null default current_date,
  title       text not null default 'Bilan des tests',
  strengths   text not null default '',   -- points forts
  priority    text not null default '',   -- axe prioritaire
  training    text not null default '',   -- type d'entraînement
  message     text not null default '',   -- feedback individuel
  created_at  timestamptz not null default now()
);

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

-- Club géré par l'entraîneur connecté : le sien, ou celui où il est entraîneur associé.
-- Toutes les données d'un club portent l'identifiant de son entraîneur principal (coach_id).
create or replace function my_club() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select coach_id from clubs where coach_id = auth.uid()),
    (select owner_id from club_coaches where user_id = auth.uid() limit 1))
$$;

do $$
declare t text;
begin
  foreach t in array array['groups','athletes','athlete_notes','exercises','sessions','assignments','tips','tests'] loop
    execute format('alter table %I alter column coach_id set default my_club()', t);
  end loop;
end $$;

-- Compétitions visées (saisies par les entraîneurs) ; athlete_ids vide = tout le club
create table if not exists competitions (
  id                    uuid primary key default gen_random_uuid(),
  coach_id              uuid not null default my_club() references auth.users (id) on delete cascade,
  name                  text not null,
  date                  date not null,
  end_date              date,
  location              text not null default '',
  level                 text not null default 'B' check (level in ('A', 'B', 'C')),
  program_url           text not null default '',
  registration_url      text not null default '',
  results_url           text not null default '',
  registration_deadline date,
  notes                 text not null default '',
  athlete_ids           uuid[] not null default '{}',
  created_at            timestamptz not null default now()
);
-- Disciplines de chaque participant : { "<id athlète>": "60 m, longueur" }
alter table competitions add column if not exists entries jsonb not null default '{}'::jsonb;
create index if not exists competitions_date_idx on competitions (coach_id, date);
alter table competitions enable row level security;

create or replace function is_my_athlete(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from athletes where id = p_athlete and coach_id = my_club())
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
alter table tests         enable row level security;
alter table test_results  enable row level security;
alter table test_reports  enable row level security;

-- Entraîneur : accès complet à ses propres lignes
do $$
declare t text;
begin
  foreach t in array array['clubs','groups','athletes','athlete_notes','exercises','sessions','assignments','tips','tests','competitions'] loop
    execute format('drop policy if exists coach_all on %I', t);
    execute format('create policy coach_all on %I for all to authenticated using (coach_id = my_club()) with check (coach_id = my_club())', t);
  end loop;
  foreach t in array array['feedback','records','wellness','test_results','test_reports'] loop
    execute format('drop policy if exists coach_all on %I', t);
    execute format('create policy coach_all on %I for all to authenticated using (is_my_athlete(athlete_id)) with check (is_my_athlete(athlete_id))', t);
  end loop;
end $$;

-- Entraîneurs associés : visibles par tous les entraîneurs du club, ajoutés ou retirés par l'entraîneur principal
alter table club_coaches enable row level security;
drop policy if exists coach_read on club_coaches;
create policy coach_read on club_coaches for select to authenticated using (owner_id = my_club());
drop policy if exists owner_write on club_coaches;
create policy owner_write on club_coaches for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table coach_invites enable row level security;
drop policy if exists owner_write on coach_invites;
create policy owner_write on coach_invites for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

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
  using (exists (select 1 from assignments a where a.session_id = sessions.id and targets_me(a.coach_id, a.group_id, a.athlete_ids)
                 and assignment_released(a.coach_id, a.date, a.time, a.visible_from)));

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

-- Athlète : lecture de ses résultats de tests et de la liste des tests du club
-- Athlète : les compétitions du club (toutes, ou celles où il est inscrit)
drop policy if exists athlete_read on competitions;
create policy athlete_read on competitions for select to authenticated
  using (coach_id = my_coach_id() and (cardinality(athlete_ids) = 0 or my_athlete_id() = any (athlete_ids)));

drop policy if exists athlete_read on tests;
create policy athlete_read on tests for select to authenticated using (coach_id = my_coach_id());
drop policy if exists athlete_read on test_results;
create policy athlete_read on test_results for select to authenticated using (athlete_id = my_athlete_id());
-- L'athlète peut aussi saisir ses propres résultats, sur les tests de son club
drop policy if exists athlete_write on test_results;
create policy athlete_write on test_results for insert to authenticated
  with check (athlete_id = my_athlete_id() and exists (select 1 from tests t where t.id = test_id and t.coach_id = my_coach_id()));
drop policy if exists athlete_edit on test_results;
create policy athlete_edit on test_results for update to authenticated
  using (athlete_id = my_athlete_id()) with check (athlete_id = my_athlete_id() and exists (select 1 from tests t where t.id = test_id and t.coach_id = my_coach_id()));
drop policy if exists athlete_delete on test_results;
create policy athlete_delete on test_results for delete to authenticated using (athlete_id = my_athlete_id());
drop policy if exists athlete_read on test_reports;
create policy athlete_read on test_reports for select to authenticated using (athlete_id = my_athlete_id());

-- L'athlète ne peut pas changer de club, de groupe, ni se réactiver lui-même.
-- L'entraîneur peut délier un compte, mais pas en relier un à la main (seules les
-- fonctions join_club / merge_athletes le font).
create or replace function athletes_protect() returns trigger
language plpgsql as $$
begin
  -- Liaison faite par join_club / merge_athletes : autorisée
  if coalesce(current_setting('app.linking', true), '') = '1' then return new; end if;
  if auth.uid() is not null and my_club() is distinct from old.coach_id then
    new.coach_id := old.coach_id;
    new.group_id := old.group_id;
    new.active   := old.active;
    new.user_id  := old.user_id;
    new.email    := old.email;
    new.signup_reviewed := old.signup_reviewed;
    new.subgroup := old.subgroup;
  elsif new.user_id is not null and new.user_id is distinct from old.user_id
        and coalesce(current_setting('app.linking', true), '') <> '1' then
    new.user_id := old.user_id;
  end if;
  if new.user_id is null then new.linked_at := null; end if;
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
  if auth.uid() is not null and my_club() is distinct from v_coach then
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
-- Un entraîneur associé (ajouté par email) est relié à son compte ici, à sa première connexion.
create or replace function whoami() returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  v_club clubs;
  v_ath  athletes;
begin
  if my_club() is null and auth.uid() is not null
     and not exists (select 1 from athletes where user_id = auth.uid()) then
    update club_coaches set user_id = auth.uid()
    where (owner_id, email) = (select owner_id, email from club_coaches
                               where user_id is null and email = (select lower(email) from auth.users where id = auth.uid())
                               order by created_at limit 1);
  end if;
  select * into v_club from clubs where coach_id = my_club();
  if found then
    return json_build_object('role', 'coach', 'club_name', v_club.name, 'invite_code', v_club.invite_code,
                             'is_owner', v_club.coach_id = auth.uid(), 'training_info', v_club.training_info,
                             'settings', v_club.settings);
  end if;
  select * into v_ath from athletes where user_id = auth.uid();
  if found then
    return json_build_object(
      'role', case when v_ath.active then 'athlete' else 'inactive' end,
      'athlete_id', v_ath.id,
      'club_name', (select name from clubs where coach_id = v_ath.coach_id),
      'training_info', (select training_info from clubs where coach_id = v_ath.coach_id),
      'settings', (select json_build_object('release', settings->'release') from clubs where coach_id = v_ath.coach_id));
  end if;
  return json_build_object('role', 'new');
end $$;

-- Création de l'espace entraîneur
create or replace function create_club(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from athletes where user_id = auth.uid()) then raise exception 'already_athlete'; end if;
  if exists (select 1 from club_coaches where user_id = auth.uid()) then raise exception 'is_coach'; end if;
  insert into clubs (coach_id, name) values (auth.uid(), p_name)
  on conflict (coach_id) do update set name = excluded.name;
end $$;

create or replace function regenerate_invite_code() returns text
language sql security definer set search_path = public as $$
  update clubs set invite_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
  where coach_id = my_club() returning invite_code
$$;

-- Infos publiques d'un club à partir du code (page d'inscription)
create or replace function club_by_code(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', c.name,
    'privacy', case when coalesce((c.settings->'privacy'->>'published')::boolean,false) then c.settings->'privacy' else null end,
    'groups', coalesce((select json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color) order by g.name)
                        from groups g where g.coach_id = c.coach_id), '[]'::json))
  from clubs c where c.invite_code = upper(trim(p_code))
$$;

-- Normalisation des noms pour la comparaison (accents, majuscules, tirets, espaces)
create or replace function norm_name(p text) returns text
language sql immutable as $$
  select regexp_replace(
    translate(lower(coalesce(p, '')), 'àâäáãåçéèêëíìîïñóòôöõøúùûüýÿ', 'aaaaaaceeeeiiiinoooooouuuuyy'),
    '[^a-z0-9]', '', 'g')
$$;

-- Inscription de l'athlète connecté dans le club.
-- Si l'entraîneur a déjà créé son profil (liste d'athlètes), le compte y est relié :
--   1. par email, sinon 2. par prénom + nom (+ année de naissance si connue).
-- Sinon un nouveau profil est créé. Dans tous les cas l'inscription est à vérifier par l'entraîneur.
create or replace function join_club(
  p_code text, p_first_name text, p_last_name text, p_birth_year int,
  p_group_id uuid, p_events text, p_phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_coach uuid;
  v_id    uuid;
  v_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if my_club() is not null then raise exception 'is_coach'; end if;
  if exists (select 1 from athletes where user_id = auth.uid()) then raise exception 'already_member'; end if;
  select coach_id into v_coach from clubs where invite_code = upper(trim(p_code));
  if v_coach is null then raise exception 'invalid_code'; end if;
  if p_group_id is not null and not exists (select 1 from groups where id = p_group_id and coach_id = v_coach) then
    p_group_id := null;
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();

  -- 1. Profil existant avec le même email
  select id into v_id from athletes
  where coach_id = v_coach and user_id is null and email <> '' and lower(trim(email)) = v_email
  limit 1;

  -- Le nom et l'année de naissance ne prouvent pas une identité.
  -- Aucune liaison automatique sur ces seuls éléments : le coach peut fusionner les fiches après vérification.
  if v_id is not null and not exists (
    select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null
  ) then v_id := null; end if;

  perform set_config('app.linking', '1', true);
  if v_id is not null then
    update athletes set
      user_id = auth.uid(), linked_at = now(), signup_reviewed = false, active = true,
      group_id   = coalesce(group_id, p_group_id),
      birth_year = coalesce(birth_year, p_birth_year),
      events     = case when events = '' then coalesce(p_events, '') else events end,
      phone      = case when phone = '' then coalesce(p_phone, '') else phone end
    where id = v_id;
  else
    insert into athletes (coach_id, user_id, group_id, first_name, last_name, birth_year, events, phone, email, linked_at, signup_reviewed)
    values (v_coach, auth.uid(), p_group_id, trim(p_first_name), trim(coalesce(p_last_name, '')), p_birth_year,
            coalesce(p_events, ''), coalesce(p_phone, ''), coalesce(v_email, ''), now(), false)
    returning id into v_id;
  end if;
  perform set_config('app.linking', '', true);
  return v_id;
end $$;

-- L'entraîneur relie une inscription (p_from) au profil qu'il avait créé (p_into) :
-- le compte et toutes les données de l'athlète sont déplacés, puis le doublon est supprimé.
create or replace function merge_athletes(p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_from athletes;
  v_into athletes;
begin
  select * into v_from from athletes where id = p_from and coach_id = my_club();
  select * into v_into from athletes where id = p_into and coach_id = my_club();
  if v_from.id is null or v_into.id is null or p_from = p_into then raise exception 'not_found'; end if;
  if v_into.user_id is not null then raise exception 'target_has_account'; end if;

  -- Données de l'athlète : en cas de doublon (même séance / même jour), on garde celles du profil cible
  delete from feedback f where f.athlete_id = p_from
    and exists (select 1 from feedback g where g.athlete_id = p_into and g.assignment_id = f.assignment_id);
  update feedback set athlete_id = p_into where athlete_id = p_from;
  delete from wellness w where w.athlete_id = p_from
    and exists (select 1 from wellness x where x.athlete_id = p_into and x.date = w.date);
  update wellness set athlete_id = p_into where athlete_id = p_from;
  update records set athlete_id = p_into where athlete_id = p_from;
  update test_results set athlete_id = p_into where athlete_id = p_from;
  update test_reports set athlete_id = p_into where athlete_id = p_from;
  update athlete_notes set athlete_id = p_into where athlete_id = p_from;
  update assignments set athlete_ids = array_replace(athlete_ids, p_from, p_into)
    where coach_id = my_club() and p_from = any (athlete_ids);
  update competitions set
    athlete_ids = array_replace(athlete_ids, p_from, p_into),
    entries = case when entries ? p_from::text
      then (entries - p_from::text) || jsonb_build_object(p_into::text, entries -> p_from::text) else entries end
    where coach_id = my_club() and p_from = any (athlete_ids);

  perform set_config('app.linking', '1', true);
  update athletes set user_id = null where id = p_from;
  update athletes set
    user_id = v_from.user_id, linked_at = now(), signup_reviewed = true, active = true,
    group_id   = coalesce(group_id, v_from.group_id),
    birth_year = coalesce(birth_year, v_from.birth_year),
    events     = case when events = '' then v_from.events else events end,
    phone      = case when phone = '' then v_from.phone else phone end,
    email      = case when email = '' then v_from.email else email end,
    avatar = v_from.avatar, color = v_from.color, goals = v_from.goals, favorite_tips = v_from.favorite_tips
  where id = p_into;
  perform set_config('app.linking', '', true);
  delete from athletes where id = p_from;
end $$;

-- Texte « Organisation des entraînements » (tous les entraîneurs du club)
create or replace function set_training_info(p_text text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_club() is null then raise exception 'not_coach'; end if;
  update clubs set training_info = coalesce(p_text, '') where coach_id = my_club();
end $$;
create or replace function set_club_settings(p_settings jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_club() is null then raise exception 'not_coach'; end if;
  update clubs set settings = coalesce(p_settings, '{}'::jsonb) where coach_id = my_club();
end $$;
revoke all on function set_club_settings(jsonb) from public;
grant execute on function set_club_settings(jsonb) to authenticated;
revoke all on function set_training_info(text) from public;
grant execute on function set_training_info(text) to authenticated;

-- Page d'invitation entraîneur : nom du club (sans être connecté)
create or replace function coach_invite_info(p_token text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('name', c.name)
  from coach_invites i join clubs c on c.coach_id = i.owner_id
  where i.token = p_token and i.created_at > now() - interval '14 days'
$$;

-- L'entraîneur invité (connecté) rejoint le club ; le lien est ensuite désactivé
create or replace function accept_coach_invite(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select owner_id into v_owner from coach_invites where token = p_token and created_at > now() - interval '14 days';
  if v_owner is null then raise exception 'invalid_invite'; end if;
  if my_club() = v_owner then delete from coach_invites where token = p_token; return; end if;
  if my_club() is not null then raise exception 'is_coach'; end if;
  if exists (select 1 from athletes where user_id = auth.uid()) then raise exception 'already_athlete'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  insert into club_coaches (owner_id, email, user_id) values (v_owner, v_email, auth.uid())
  on conflict (owner_id, email) do update set user_id = auth.uid();
  delete from coach_invites where token = p_token;
end $$;

revoke all on function coach_invite_info(text) from public;
revoke all on function accept_coach_invite(text) from public;
grant execute on function coach_invite_info(text) to anon, authenticated;
grant execute on function accept_coach_invite(text) to authenticated;
revoke all on function my_club() from public;
grant execute on function my_club() to authenticated;
revoke all on function whoami() from public;
revoke all on function create_club(text) from public;
revoke all on function regenerate_invite_code() from public;
revoke all on function club_by_code(text) from public;
revoke all on function join_club(text, text, text, int, uuid, text, text) from public;
revoke all on function merge_athletes(uuid, uuid) from public;
grant execute on function whoami() to authenticated;
grant execute on function create_club(text) to authenticated;
grant execute on function regenerate_invite_code() to authenticated;
grant execute on function club_by_code(text) to anon, authenticated;
grant execute on function join_club(text, text, text, int, uuid, text, text) to authenticated;
grant execute on function merge_athletes(uuid, uuid) to authenticated;

-- ===== Notes du coach sur une séance : réservées aux coachs (jamais visibles par les athlètes) =====
create table if not exists session_notes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null default my_club() references auth.users (id) on delete cascade,
  session_id uuid not null unique references sessions (id) on delete cascade,
  text       text not null default '',
  updated_at timestamptz not null default now()
);
alter table session_notes enable row level security;
drop policy if exists coach_all on session_notes;
create policy coach_all on session_notes for all to authenticated
  using (coach_id = my_club())
  with check (coach_id = my_club() and exists (select 1 from sessions s where s.id = session_id and s.coach_id = my_club()));

-- Reprise des anciennes remarques (plan du lundi, blocs « Remarques ») dans les notes du coach, puis retrait des séances
insert into session_notes (session_id, coach_id, text)
select s.id, s.coach_id, coalesce(nullif(s.plan->>'remarks', ''), (
  select string_agg(i->>'name', E'\n' order by b.n, i.m)
  from jsonb_array_elements(s.blocks) with ordinality b(v, n), jsonb_array_elements(b.v->'items') with ordinality i(i, m)
  where lower(trim(b.v->>'title')) in ('remarque', 'remarques')))
from sessions s
where coalesce(s.plan->>'remarks', '') <> ''
   or exists (select 1 from jsonb_array_elements(s.blocks) b where lower(trim(b->>'title')) in ('remarque', 'remarques'))
on conflict (session_id) do nothing;
update sessions s set
  blocks = (select coalesce(jsonb_agg(b.v order by b.n), '[]'::jsonb) from jsonb_array_elements(s.blocks) with ordinality b(v, n)
            where lower(trim(b.v->>'title')) not in ('remarque', 'remarques')),
  plan = case when s.plan ? 'remarks' then s.plan || '{"remarks": ""}'::jsonb else s.plan end
where coalesce(s.plan->>'remarks', '') <> ''
   or exists (select 1 from jsonb_array_elements(s.blocks) b where lower(trim(b->>'title')) in ('remarque', 'remarques'));

-- ===== Messages : fil de discussion entre l'athlète et ses coachs, pour chaque séance planifiée =====
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  athlete_id    uuid not null references athletes (id) on delete cascade,
  from_coach    boolean not null default false,
  author        text not null default '',
  body          text not null check (length(body) between 1 and 2000),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages (athlete_id, assignment_id, created_at);
alter table messages enable row level security;

-- L'expéditeur est fixé par la base (coach ou athlète) ; ensuite seul le destinataire peut marquer « lu »
create or replace function messages_protect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.from_coach := is_my_athlete(new.athlete_id);
    new.author := case when new.from_coach then coalesce(nullif(initcap(split_part(split_part(
      (select email from auth.users where id = auth.uid()), '@', 1), '.', 1)), ''), 'Coach') else '' end;
    new.read_at := null;
    new.created_at := now();
  else
    new.body := old.body; new.from_coach := old.from_coach; new.author := old.author;
    new.created_at := old.created_at; new.assignment_id := old.assignment_id; new.athlete_id := old.athlete_id;
    if old.from_coach = is_my_athlete(old.athlete_id) then new.read_at := old.read_at; end if;
  end if;
  return new;
end $$;
drop trigger if exists messages_protect on messages;
create trigger messages_protect before insert or update on messages for each row execute function messages_protect();

drop policy if exists coach_all on messages;
create policy coach_all on messages for all to authenticated
  using (is_my_athlete(athlete_id))
  with check (is_my_athlete(athlete_id) and exists (select 1 from assignments a where a.id = assignment_id and a.coach_id = my_club()));
drop policy if exists athlete_read on messages;
create policy athlete_read on messages for select to authenticated using (athlete_id = my_athlete_id());
drop policy if exists athlete_write on messages;
create policy athlete_write on messages for insert to authenticated
  with check (athlete_id = my_athlete_id()
    and exists (select 1 from assignments a where a.id = assignment_id and targets_me(a.coach_id, a.group_id, a.athlete_ids)));
drop policy if exists athlete_mark_read on messages;
create policy athlete_mark_read on messages for update to authenticated
  using (athlete_id = my_athlete_id()) with check (athlete_id = my_athlete_id());

-- ===== Notifications sur le téléphone (Web Push) : un abonnement par appareil =====
create table if not exists push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists own on push_subscriptions;
create policy own on push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Enregistre l'appareil pour l'utilisateur connecté (un appareil partagé passe au dernier connecté)
create or replace function save_push(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_endpoint !~ '^https://' then raise exception 'invalid'; end if;
  delete from push_subscriptions where endpoint = p_endpoint;
  insert into push_subscriptions (endpoint, user_id) values (p_endpoint, auth.uid());
end $$;

-- Appareils à prévenir après un message ou un retour que l'utilisateur connecté vient d'écrire
-- (les notifications ne contiennent aucun texte : seulement « nouveau message »)
create or replace function push_targets(p_kind text, p_id uuid) returns setof text
language plpgsql stable security definer set search_path = public as $$
declare v_athlete uuid; v_to_coach boolean; v_coach uuid;
begin
  if p_kind = 'message' then
    select m.athlete_id, not m.from_coach into v_athlete, v_to_coach from messages m
     where m.id = p_id and m.created_at > now() - interval '10 minutes'
       and ((m.from_coach and is_my_athlete(m.athlete_id)) or (not m.from_coach and m.athlete_id = my_athlete_id()));
  elsif p_kind = 'feedback' then
    select f.athlete_id, true into v_athlete, v_to_coach from feedback f
     where f.id = p_id and f.athlete_id = my_athlete_id() and f.updated_at > now() - interval '10 minutes';
  end if;
  if v_athlete is null then return; end if;
  if v_to_coach then
    select coach_id into v_coach from athletes where id = v_athlete;
    return query select s.endpoint from push_subscriptions s
      where s.user_id = v_coach or s.user_id in (select c.user_id from club_coaches c where c.owner_id = v_coach and c.user_id is not null);
  else
    return query select s.endpoint from push_subscriptions s join athletes a on a.user_id = s.user_id where a.id = v_athlete and a.active;
  end if;
end $$;
revoke all on function save_push(text) from public;
revoke all on function push_targets(text, uuid) from public;
grant execute on function save_push(text) to authenticated;
grant execute on function push_targets(text, uuid) to authenticated;

-- Fait connaître tout de suite les nouvelles tables à l'API (sinon « schema cache » quelques minutes)
notify pgrst, 'reload schema';

-- Durée réellement déclarée pour le suivi de charge individuel.
alter table feedback add column if not exists duration_min integer check (duration_min between 0 and 600);

-- Les réglages contiennent la préparation privée du coach. Les athlètes reçoivent
-- uniquement leur règle d'ouverture et les informations utiles via whoami().
drop policy if exists athlete_read on clubs;

-- Modules de suivi complet
-- À exécuter après migration-season-2027.sql sur la base existante.
create table if not exists public.attendance (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 athlete_id uuid not null references public.athletes(id) on delete cascade,
 status text not null check (status in ('present','absent','excused')),
 updated_at timestamptz not null default now(), unique(assignment_id,athlete_id)
);
create table if not exists public.session_adjustments (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 athlete_id uuid not null references public.athletes(id) on delete cascade,
 content jsonb not null check (jsonb_typeof(content) = 'object' and jsonb_typeof(content->'blocks') = 'array'),
 rationale text not null check (length(trim(rationale)) > 0),
 source_ids text[] not null default '{}',
 updated_at timestamptz not null default now(), unique(assignment_id,athlete_id)
);
create table if not exists public.availability (
 id uuid primary key default gen_random_uuid(),
 athlete_id uuid not null references public.athletes(id) on delete cascade,
 start_date date not null, end_date date not null check (end_date >= start_date),
 status text not null check (status in ('away','available','camp')), note text not null default ''
);
create table if not exists public.privacy_acceptances (
 id uuid primary key default gen_random_uuid(),
 athlete_id uuid not null references public.athletes(id) on delete cascade,
 version text not null check (length(trim(version)) > 0), health_consent boolean not null,
 representative text not null default '', created_at timestamptz not null default now()
);
create index if not exists attendance_athlete_idx on public.attendance(athlete_id);
create index if not exists adjustments_athlete_idx on public.session_adjustments(athlete_id);
create index if not exists availability_athlete_idx on public.availability(athlete_id,start_date,end_date);
create index if not exists privacy_athlete_idx on public.privacy_acceptances(athlete_id,created_at desc);

create or replace function public.assignment_has_athlete(p_assignment uuid, p_athlete uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from assignments s join athletes a on a.id=p_athlete
 where s.id=p_assignment and s.coach_id=a.coach_id and a.active
 and (s.group_id=a.group_id or a.id=any(s.athlete_ids)))
$$;
revoke all on function public.assignment_has_athlete(uuid,uuid) from public;
grant execute on function public.assignment_has_athlete(uuid,uuid) to authenticated;

alter table public.attendance enable row level security;
alter table public.session_adjustments enable row level security;
alter table public.availability enable row level security;
alter table public.privacy_acceptances enable row level security;
do $$ declare t text; begin
 foreach t in array array['attendance','session_adjustments'] loop
  execute format('drop policy if exists coach_manage on public.%I', t);
  execute format('create policy coach_manage on public.%I for all to authenticated using (is_my_athlete(athlete_id)) with check (is_my_athlete(athlete_id) and assignment_has_athlete(assignment_id,athlete_id))',t);
 end loop;
end $$;
drop policy if exists own_read on public.attendance;
create policy own_read on public.attendance for select to authenticated using (athlete_id=my_athlete_id());
drop policy if exists own_read on public.session_adjustments;
create policy own_read on public.session_adjustments for select to authenticated using (
 athlete_id=my_athlete_id() and exists(select 1 from assignments a where a.id=assignment_id
 and targets_me(a.coach_id,a.group_id,a.athlete_ids) and assignment_released(a.coach_id,a.date,a.time,a.visible_from))
);
drop policy if exists coach_manage on public.availability;
create policy coach_manage on public.availability for all to authenticated using(is_my_athlete(athlete_id)) with check(is_my_athlete(athlete_id));
drop policy if exists own_manage on public.availability;
create policy own_manage on public.availability for all to authenticated using(athlete_id=my_athlete_id()) with check(athlete_id=my_athlete_id());
drop policy if exists coach_read on public.privacy_acceptances;
create policy coach_read on public.privacy_acceptances for select to authenticated using(is_my_athlete(athlete_id));
drop policy if exists own_read on public.privacy_acceptances;
create policy own_read on public.privacy_acceptances for select to authenticated using(athlete_id=my_athlete_id());
drop policy if exists own_insert on public.privacy_acceptances;
create policy own_insert on public.privacy_acceptances for insert to authenticated with check (
 athlete_id=my_athlete_id() and version=(select settings->'privacy'->>'version' from clubs where coach_id=my_coach_id())
);
-- Pas de modification de l'historique des consentements : le retrait ajoute une nouvelle ligne.
-- Cette fonction ne retourne que les informations publiques de politique du propre club.
create or replace function public.my_privacy_policy() returns jsonb
language sql stable security definer set search_path=public as $$
 select settings->'privacy' from clubs where coach_id=coalesce(my_club(),my_coach_id())
$$;
revoke all on function public.my_privacy_policy() from public;
grant execute on function public.my_privacy_policy() to authenticated;
-- Corrige la vérification de version sans ouvrir la lecture complète de clubs.
drop policy if exists own_insert on public.privacy_acceptances;
create policy own_insert on public.privacy_acceptances for insert to authenticated with check (
 athlete_id=my_athlete_id() and version=(my_privacy_policy()->>'version') and coalesce((my_privacy_policy()->>'published')::boolean,false)
);
create or replace function public.health_followup_allowed(p_athlete uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce((select p.health_consent from privacy_acceptances p join athletes a on a.id=p.athlete_id
 join clubs c on c.coach_id=a.coach_id where p.athlete_id=p_athlete and (a.user_id=auth.uid() or a.coach_id=my_club())
 and p.version=c.settings->'privacy'->>'version' and coalesce((c.settings->'privacy'->>'published')::boolean,false)
 order by p.created_at desc,p.id desc limit 1),false)
$$;
revoke all on function public.health_followup_allowed(uuid) from public;
grant execute on function public.health_followup_allowed(uuid) to authenticated;
create or replace function public.protect_health_writes() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not health_followup_allowed(new.athlete_id) then
  raise exception 'health_consent_required';
 end if;
 return new;
end $$;
drop trigger if exists consent_required on public.wellness;
-- Version légère : le suivi de forme ne dépend pas d'un consentement enregistré (information à l'inscription).
-- Permettre les présences et le bilan sportif sans imposer le suivi de santé.
create or replace function public.protect_feedback_health() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not health_followup_allowed(new.athlete_id)
 and (coalesce(new.pain,'')<>'' or new.fatigue is not null or new.mood is not null) then
  if tg_op='INSERT' or (new.pain,new.fatigue,new.mood) is distinct from (old.pain,old.fatigue,old.mood) then
   raise exception 'health_consent_required';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists consent_required on public.feedback;
-- Version légère : le suivi de forme ne dépend pas d'un consentement enregistré (information à l'inscription).
-- Les horodatages sont fixés côté base pour les présences, adaptations et consentements.
create or replace function public.touch_training_row() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists touch_row on public.attendance;
create trigger touch_row before insert or update on public.attendance for each row execute function public.touch_training_row();
drop trigger if exists touch_row on public.session_adjustments;
create trigger touch_row before insert or update on public.session_adjustments for each row execute function public.touch_training_row();
create or replace function public.touch_consent() returns trigger language plpgsql as $$
begin new.created_at=clock_timestamp(); return new; end $$;
drop trigger if exists touch_row on public.privacy_acceptances;
create trigger touch_row before insert on public.privacy_acceptances for each row execute function public.touch_consent();
grant select,insert,update,delete on public.attendance,public.session_adjustments,public.availability to authenticated;
grant select,insert on public.privacy_acceptances to authenticated;

create table if not exists public.exercise_logs (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 athlete_id uuid not null references public.athletes(id) on delete cascade,
 item_id text not null, sets jsonb not null check(jsonb_typeof(sets)='array' and jsonb_array_length(sets)<=30),
 updated_at timestamptz not null default now(),unique(assignment_id,athlete_id,item_id)
);
create table if not exists public.evidence_library (
 id uuid primary key default gen_random_uuid(),coach_id uuid not null default public.my_club() references auth.users(id) on delete cascade,
 paper jsonb not null check(jsonb_typeof(paper)='object'),review_note text not null default '',reviewed boolean not null default false,created_at timestamptz not null default now()
);
alter table public.exercise_logs enable row level security;
alter table public.evidence_library enable row level security;
drop policy if exists coach_manage on public.exercise_logs;
create policy coach_manage on public.exercise_logs for all to authenticated using(is_my_athlete(athlete_id)) with check(is_my_athlete(athlete_id) and assignment_has_athlete(assignment_id,athlete_id));
drop policy if exists own_manage on public.exercise_logs;
create policy own_manage on public.exercise_logs for all to authenticated using(athlete_id=my_athlete_id()) with check(athlete_id=my_athlete_id() and exists(select 1 from assignments a where a.id=assignment_id and targets_me(a.coach_id,a.group_id,a.athlete_ids) and assignment_released(a.coach_id,a.date,a.time,a.visible_from)));
drop policy if exists coach_manage on public.evidence_library;
create policy coach_manage on public.evidence_library for all to authenticated using(coach_id=my_club()) with check(coach_id=my_club());
drop trigger if exists touch_row on public.exercise_logs;
create trigger touch_row before insert or update on public.exercise_logs for each row execute function public.touch_training_row();
grant select,insert,update,delete on public.exercise_logs,public.evidence_library to authenticated;

alter table public.competitions add column if not exists athlete_priorities jsonb not null default '{}'::jsonb;

create or replace function public.retention_preview() returns jsonb
language plpgsql security definer set search_path=public as $$
declare c uuid; cfg jsonb; months_s int; months_h int; cut_s timestamptz;cut_h timestamptz;
begin
 c=my_club();if c is null then raise exception 'not_coach';end if;
 select settings->'privacy' into cfg from clubs where coach_id=c;
 months_s=(cfg->>'retention_months')::int;months_h=(cfg->>'health_retention_months')::int;
 if months_s is null or months_h is null or months_s not between 1 and 120 or months_h not between 1 and 120 then raise exception 'retention_not_configured';end if;
 cut_s=now()-make_interval(months=>months_s);cut_h=now()-make_interval(months=>months_h);
 return jsonb_build_object(
 'wellness',(select count(*) from wellness w join athletes a on a.id=w.athlete_id where a.coach_id=c and w.date<cut_h::date),
 'feedback_health',(select count(*) from feedback f join athletes a on a.id=f.athlete_id where a.coach_id=c and f.updated_at<cut_h and (f.pain<>'' or f.fatigue is not null or f.mood is not null)),
 'messages',(select count(*) from messages m join athletes a on a.id=m.athlete_id where a.coach_id=c and m.created_at<cut_s),
 'exercise_logs',(select count(*) from exercise_logs l join athletes a on a.id=l.athlete_id where a.coach_id=c and l.updated_at<cut_s),
 'athlete_notes',(select count(*) from athlete_notes n join athletes a on a.id=n.athlete_id where a.coach_id=c and n.created_at<cut_s)
 );
end $$;
create or replace function public.purge_expired_followup(p_expected jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c uuid; cfg jsonb;cut_s timestamptz;cut_h timestamptz;current_counts jsonb;
begin
 c=my_club();if c is null then raise exception 'not_coach';end if;
 perform pg_advisory_xact_lock(hashtext(c::text));current_counts=retention_preview();
 if current_counts is distinct from p_expected then raise exception 'retention_preview_changed';end if;
 select settings->'privacy' into cfg from clubs where coach_id=c;
 cut_s=now()-make_interval(months=>(cfg->>'retention_months')::int);cut_h=now()-make_interval(months=>(cfg->>'health_retention_months')::int);
 delete from wellness w using athletes a where a.id=w.athlete_id and a.coach_id=c and w.date<cut_h::date;
 update feedback f set pain='',fatigue=null,mood=null from athletes a where a.id=f.athlete_id and a.coach_id=c and f.updated_at<cut_h and (f.pain<>'' or f.fatigue is not null or f.mood is not null);
 delete from messages m using athletes a where a.id=m.athlete_id and a.coach_id=c and m.created_at<cut_s;
 delete from exercise_logs l using athletes a where a.id=l.athlete_id and a.coach_id=c and l.updated_at<cut_s;
 delete from athlete_notes n using athletes a where a.id=n.athlete_id and a.coach_id=c and n.created_at<cut_s;
 return current_counts;
end $$;
revoke all on function public.retention_preview() from public;
revoke all on function public.purge_expired_followup(jsonb) from public;
grant execute on function public.retention_preview() to authenticated;
grant execute on function public.purge_expired_followup(jsonb) to authenticated;

-- Évite de transmettre les listes d'autres athlètes et les notes de séance avant ouverture.
create or replace function public.assignment_visible_to_me(p_id uuid,p_require_release boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from assignments a where a.id=p_id and targets_me(a.coach_id,a.group_id,a.athlete_ids)
 and (not p_require_release or assignment_released(a.coach_id,a.date,a.time,a.visible_from)))
$$;
create or replace function public.session_visible_to_me(p_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from assignments a where a.session_id=p_id and targets_me(a.coach_id,a.group_id,a.athlete_ids)
 and assignment_released(a.coach_id,a.date,a.time,a.visible_from))
$$;
create or replace function public.visible_assignments() returns setof public.assignments
language plpgsql stable security definer set search_path=public as $$
declare row assignments;aid uuid;
begin
 if my_club() is not null then return query select * from assignments where coach_id=my_club() order by date,time;return;end if;
 aid=my_athlete_id();if aid is null then return;end if;
 for row in select * from assignments where targets_me(coach_id,group_id,athlete_ids) order by date,time loop
  row.athlete_ids=case when aid=any(row.athlete_ids) then array[aid] else '{}'::uuid[] end;
  if not assignment_released(row.coach_id,row.date,row.time,row.visible_from) then row.note='';end if;
  return next row;
 end loop;
end $$;
create or replace function public.visible_competitions() returns setof public.competitions
language plpgsql stable security definer set search_path=public as $$
declare row competitions;aid uuid;
begin
 if my_club() is not null then return query select * from competitions where coach_id=my_club() order by date;return;end if;
 aid=my_athlete_id();if aid is null then return;end if;
 for row in select * from competitions where coach_id=my_coach_id() and (cardinality(athlete_ids)=0 or aid=any(athlete_ids)) order by date loop
  row.athlete_ids=case when aid=any(row.athlete_ids) then array[aid] else '{}'::uuid[] end;
  row.entries=case when row.entries ? aid::text then jsonb_build_object(aid::text,row.entries->aid::text) else '{}'::jsonb end;
  row.athlete_priorities=case when row.athlete_priorities ? aid::text then jsonb_build_object(aid::text,row.athlete_priorities->aid::text) else '{}'::jsonb end;
  return next row;
 end loop;
end $$;
revoke all on function public.assignment_visible_to_me(uuid,boolean) from public;
revoke all on function public.session_visible_to_me(uuid) from public;
revoke all on function public.visible_assignments() from public;
revoke all on function public.visible_competitions() from public;
grant execute on function public.assignment_visible_to_me(uuid,boolean),public.session_visible_to_me(uuid),public.visible_assignments(),public.visible_competitions() to authenticated;
drop policy if exists athlete_read on public.assignments;
drop policy if exists athlete_read on public.competitions;
drop policy if exists athlete_read on public.sessions;
create policy athlete_read on public.sessions for select to authenticated using(session_visible_to_me(id));
drop policy if exists athlete_own on public.feedback;
create policy athlete_own on public.feedback for all to authenticated using(athlete_id=my_athlete_id()) with check(athlete_id=my_athlete_id() and assignment_visible_to_me(assignment_id,true));
drop policy if exists own_read on public.session_adjustments;
create policy own_read on public.session_adjustments for select to authenticated using(athlete_id=my_athlete_id() and assignment_visible_to_me(assignment_id,true));
drop policy if exists own_manage on public.exercise_logs;
create policy own_manage on public.exercise_logs for all to authenticated using(athlete_id=my_athlete_id()) with check(athlete_id=my_athlete_id() and assignment_visible_to_me(assignment_id,true));

create table if not exists public.import_history (
 id uuid primary key default gen_random_uuid(),coach_id uuid not null default public.my_club() references auth.users(id) on delete cascade,
 filename text not null,source_text text not null check(length(source_text)<=250000),
 imported_count int not null default 0,updated_count int not null default 0,created_at timestamptz not null default now()
);
alter table public.import_history enable row level security;
drop policy if exists coach_manage on public.import_history;
create policy coach_manage on public.import_history for all to authenticated using(coach_id=my_club()) with check(coach_id=my_club());
grant select,insert,update,delete on public.import_history to authenticated;

create or replace function public.validate_exercise_log() returns trigger
language plpgsql as $$
declare item jsonb;value numeric;
begin
 if jsonb_typeof(new.sets)<>'array' or jsonb_array_length(new.sets)>30 then raise exception 'invalid_exercise_sets';end if;
 for item in select jsonb_array_elements(new.sets) loop
  if jsonb_typeof(item)<>'object' or coalesce(jsonb_typeof(item->'done'),'')<>'boolean' or coalesce(jsonb_typeof(item->'result'),'')<>'string' or length(item->>'result')>500 then raise exception 'invalid_exercise_set';end if;
  if coalesce(jsonb_typeof(item->'index'),'')<>'number' then raise exception 'invalid_set_index';end if;
  value=(item->>'index')::numeric;if value<1 or value>30 or value<>trunc(value) then raise exception 'invalid_set_index';end if;
  if item->'reps' is distinct from 'null'::jsonb then
   if coalesce(jsonb_typeof(item->'reps'),'')<>'number' then raise exception 'invalid_reps';end if;
   value=(item->>'reps')::numeric;if value<0 or value>10000 or value<>trunc(value) then raise exception 'invalid_reps';end if;
  end if;
  if item->'load_kg' is distinct from 'null'::jsonb then
   if coalesce(jsonb_typeof(item->'load_kg'),'')<>'number' then raise exception 'invalid_load';end if;
   value=(item->>'load_kg')::numeric;if value<0 or value>1000 then raise exception 'invalid_load';end if;
  end if;
 end loop;
 return new;
end $$;
drop trigger if exists validate_log on public.exercise_logs;
create trigger validate_log before insert or update on public.exercise_logs for each row execute function public.validate_exercise_log();

alter table public.exercise_logs add column if not exists item_name text not null default '';
