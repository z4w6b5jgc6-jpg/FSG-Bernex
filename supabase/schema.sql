-- =====================================================================
-- Schéma de la base de données – Application d'entraînement athlétisme
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Groupes d'entraînement (ex. U14, U16, Sprint…)
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now()
);

-- Athlètes : pas de compte, accès via un lien personnel (access_token)
create table if not exists athletes (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  group_id      uuid references groups (id) on delete set null,
  first_name    text not null,
  last_name     text not null default '',
  birth_year    int,
  events        text not null default '',          -- disciplines (ex. "60m, longueur")
  phone         text not null default '',          -- numéro WhatsApp (athlète ou parent)
  notes         text not null default '',          -- notes privées de l'entraîneur
  access_token  uuid not null unique default gen_random_uuid(),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Bibliothèque d'exercices réutilisables
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  category     text not null default 'autre',
  description  text not null default '',
  created_at   timestamptz not null default now()
);

-- Séances : contenu stocké en JSON (blocs > exercices)
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

-- Planning : une séance attribuée à une date, à un groupe et/ou à des athlètes
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

-- Retours des athlètes après une séance
create table if not exists feedback (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references assignments (id) on delete cascade,
  athlete_id     uuid not null references athletes (id) on delete cascade,
  completed      boolean not null default true,
  rpe            int check (rpe between 1 and 10),        -- difficulté ressentie
  fatigue        int check (fatigue between 1 and 5),     -- 1 = en forme, 5 = épuisé
  mood           int check (mood between 1 and 5),        -- 1 = pas bien, 5 = super
  pain           text not null default '',                -- douleurs éventuelles
  comment        text not null default '',
  coach_reply    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assignment_id, athlete_id)
);

-- Mise à jour d'une base créée avec une version précédente du schéma
alter table athletes add column if not exists phone text not null default '';

create index if not exists assignments_date_idx on assignments (coach_id, date);
create index if not exists athletes_group_idx on athletes (group_id);
create index if not exists feedback_assignment_idx on feedback (assignment_id);

-- ---------------------------------------------------------------------
-- Sécurité : chaque entraîneur ne voit que ses propres données
-- ---------------------------------------------------------------------

alter table groups      enable row level security;
alter table athletes    enable row level security;
alter table exercises   enable row level security;
alter table sessions    enable row level security;
alter table assignments enable row level security;
alter table feedback    enable row level security;

drop policy if exists coach_all on groups;
create policy coach_all on groups for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists coach_all on athletes;
create policy coach_all on athletes for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists coach_all on exercises;
create policy coach_all on exercises for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists coach_all on sessions;
create policy coach_all on sessions for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists coach_all on assignments;
create policy coach_all on assignments for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- L'entraîneur lit les retours de ses athlètes et peut y répondre
drop policy if exists coach_all on feedback;
create policy coach_all on feedback for all to authenticated
  using (exists (select 1 from athletes a where a.id = feedback.athlete_id and a.coach_id = auth.uid()))
  with check (exists (select 1 from athletes a where a.id = feedback.athlete_id and a.coach_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Espace athlète : accès sans compte via le lien personnel
-- Ces fonctions vérifient le jeton et ne renvoient que les données
-- de l'athlète concerné.
-- ---------------------------------------------------------------------

create or replace function athlete_portal(p_token uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_athlete athletes;
  v_result  json;
begin
  select * into v_athlete from athletes where access_token = p_token and active;
  if not found then
    raise exception 'invalid_token';
  end if;

  select json_build_object(
    'athlete', json_build_object(
      'id', v_athlete.id,
      'first_name', v_athlete.first_name,
      'last_name', v_athlete.last_name,
      'group_name', (select g.name from groups g where g.id = v_athlete.group_id)
    ),
    'assignments', coalesce((
      select json_agg(row_to_json(x) order by x.date desc)
      from (
        select a.id, a.date, a.time, a.location, a.note,
               json_build_object(
                 'id', s.id, 'title', s.title, 'objective', s.objective,
                 'focus', s.focus, 'duration_min', s.duration_min, 'blocks', s.blocks
               ) as session,
               (select row_to_json(f) from (
                  select f.id, f.completed, f.rpe, f.fatigue, f.mood, f.pain,
                         f.comment, f.coach_reply, f.updated_at
                  from feedback f
                  where f.assignment_id = a.id and f.athlete_id = v_athlete.id
                ) f) as feedback
        from assignments a
        join sessions s on s.id = a.session_id
        where a.coach_id = v_athlete.coach_id
          and (a.group_id = v_athlete.group_id or v_athlete.id = any (a.athlete_ids))
          and a.date >= current_date - 60
      ) x
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function athlete_submit_feedback(
  p_token         uuid,
  p_assignment_id uuid,
  p_completed     boolean,
  p_rpe           int,
  p_fatigue       int,
  p_mood          int,
  p_pain          text,
  p_comment       text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_athlete athletes;
begin
  select * into v_athlete from athletes where access_token = p_token and active;
  if not found then
    raise exception 'invalid_token';
  end if;

  if not exists (
    select 1 from assignments a
    where a.id = p_assignment_id
      and a.coach_id = v_athlete.coach_id
      and (a.group_id = v_athlete.group_id or v_athlete.id = any (a.athlete_ids))
  ) then
    raise exception 'assignment_not_found';
  end if;

  insert into feedback (assignment_id, athlete_id, completed, rpe, fatigue, mood, pain, comment)
  values (p_assignment_id, v_athlete.id, p_completed, p_rpe, p_fatigue, p_mood,
          coalesce(p_pain, ''), coalesce(p_comment, ''))
  on conflict (assignment_id, athlete_id) do update
    set completed  = excluded.completed,
        rpe        = excluded.rpe,
        fatigue    = excluded.fatigue,
        mood       = excluded.mood,
        pain       = excluded.pain,
        comment    = excluded.comment,
        updated_at = now();
end;
$$;

revoke all on function athlete_portal(uuid) from public;
revoke all on function athlete_submit_feedback(uuid, uuid, boolean, int, int, int, text, text) from public;
grant execute on function athlete_portal(uuid) to anon, authenticated;
grant execute on function athlete_submit_feedback(uuid, uuid, boolean, int, int, int, text, text) to anon, authenticated;
