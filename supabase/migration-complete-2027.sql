-- À exécuter après migration-season-2027.sql sur la base existante.
begin;
alter table public.competitions add column if not exists athlete_priorities jsonb not null default '{}'::jsonb;
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

create or replace function club_by_code(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', c.name,
    'privacy', case when coalesce((c.settings->'privacy'->>'published')::boolean,false) then c.settings->'privacy' else null end,
    'groups', coalesce((select json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color) order by g.name)
                        from groups g where g.coach_id = c.coach_id), '[]'::json))
  from clubs c where c.invite_code = upper(trim(p_code))
$$;


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
commit;
