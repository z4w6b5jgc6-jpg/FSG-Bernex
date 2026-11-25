-- 4 · Correctifs de sécurité et d'intégrité (audit du 25 novembre 2026)
-- À appliquer après 1, 2 et 3 sur un projet existant. Rejouable sans risque.
-- Aucune donnée sportive n'est supprimée. Les codes d'inscription existants restent valables.
begin;

-- ---------------------------------------------------------------------
-- 1. Club : écritures uniquement par les fonctions de l'app
--    (un entraîneur associé ne peut plus modifier ni supprimer le club)
-- ---------------------------------------------------------------------
drop policy if exists coach_all on clubs;
drop policy if exists coach_read on clubs;
create policy coach_read on clubs for select to authenticated using (coach_id = my_club());

-- Code d'inscription plus long (12 caractères) pour les nouveaux clubs et les codes régénérés
alter table clubs alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
create or replace function regenerate_invite_code() returns text
language sql security definer set search_path = public as $$
  update clubs set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  where coach_id = my_club() returning invite_code
$$;

-- ---------------------------------------------------------------------
-- 2. Entraîneurs associés : le compte relié (user_id) n'est fixé que par la base
-- ---------------------------------------------------------------------
create or replace function club_coaches_protect() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.linking', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := null;
  elsif new.user_id is not null then
    new.user_id := old.user_id;  -- délier reste possible, relier non
  end if;
  return new;
end $$;
drop trigger if exists club_coaches_protect on club_coaches;
create trigger club_coaches_protect before insert or update on club_coaches for each row execute function club_coaches_protect();

-- Rôle de l'utilisateur connecté. Un entraîneur associé n'est relié que si son email est confirmé.
create or replace function whoami() returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  v_club clubs;
  v_ath  athletes;
begin
  if my_club() is null and auth.uid() is not null
     and not exists (select 1 from athletes where user_id = auth.uid())
     and exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    perform set_config('app.linking', '1', true);
    update club_coaches set user_id = auth.uid()
    where (owner_id, email) = (select owner_id, email from club_coaches
                               where user_id is null and email = (select lower(email) from auth.users where id = auth.uid())
                               order by created_at limit 1);
    perform set_config('app.linking', '', true);
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
  perform set_config('app.linking', '1', true);
  insert into club_coaches (owner_id, email, user_id) values (v_owner, v_email, auth.uid())
  on conflict (owner_id, email) do update set user_id = auth.uid();
  perform set_config('app.linking', '', true);
  delete from coach_invites where token = p_token;
end $$;

-- ---------------------------------------------------------------------
-- 3. Création d'un espace entraîneur : seulement le premier club de la base,
--    ou les adresses ajoutées à club_creators (dans le SQL Editor de Supabase) :
--    insert into club_creators (email) values ('prenom.nom@exemple.ch');
-- ---------------------------------------------------------------------
create table if not exists club_creators (
  email      text primary key check (email = lower(trim(email)) and email <> ''),
  created_at timestamptz not null default now()
);
alter table club_creators enable row level security;  -- aucune règle : invisible depuis l'app

create or replace function create_club(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from athletes where user_id = auth.uid()) then raise exception 'already_athlete'; end if;
  if exists (select 1 from club_coaches where user_id = auth.uid()) then raise exception 'is_coach'; end if;
  if not exists (select 1 from clubs where coach_id = auth.uid())
     and exists (select 1 from clubs)
     and not exists (select 1 from club_creators where email = (select lower(email) from auth.users where id = auth.uid())) then
    raise exception 'club_creation_closed';
  end if;
  insert into clubs (coach_id, name) values (auth.uid(), p_name)
  on conflict (coach_id) do update set name = excluded.name;
end $$;
revoke all on function create_club(text) from public;
grant execute on function create_club(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Assistant IA : quota quotidien par entraîneur et par club
-- ---------------------------------------------------------------------
create table if not exists ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  club    uuid not null,
  calls   int not null default 0,
  primary key (user_id, day)
);
alter table ai_usage enable row level security;  -- aucune règle : seulement via ai_take_quota()

create or replace function ai_take_quota() returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  v_club uuid := my_club();
  v_user int;
  v_total int;
begin
  if auth.uid() is null or v_club is null then return json_build_object('ok', false, 'reason', 'not_coach'); end if;
  perform pg_advisory_xact_lock(hashtext('ai:' || v_club::text));
  v_user  := coalesce((select calls from ai_usage where user_id = auth.uid() and day = current_date), 0);
  v_total := coalesce((select sum(calls) from ai_usage where club = v_club and day = current_date), 0);
  if v_user >= 100 or v_total >= 300 then return json_build_object('ok', false, 'reason', 'quota'); end if;
  insert into ai_usage (user_id, day, club, calls) values (auth.uid(), current_date, v_club, 1)
  on conflict (user_id, day) do update set calls = ai_usage.calls + 1;
  delete from ai_usage where day < current_date - 31;
  return json_build_object('ok', true);
end $$;
revoke all on function ai_take_quota() from public;
grant execute on function ai_take_quota() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Fiche athlète : l'athlète ne change plus son identité (prénom, nom, année)
-- ---------------------------------------------------------------------
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
    new.first_name := old.first_name;
    new.last_name  := old.last_name;
    new.birth_year := old.birth_year;
  elsif new.user_id is not null and new.user_id is distinct from old.user_id then
    new.user_id := old.user_id;
  end if;
  if new.user_id is null then new.linked_at := null; end if;
  return new;
end $$;

-- Inscription : une fiche désactivée par l'entraîneur n'est plus réactivée par l'athlète
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

  -- Profil existant avec le même email (confirmé)
  select id into v_id from athletes
  where coach_id = v_coach and user_id is null and email <> '' and lower(trim(email)) = v_email
  limit 1;
  if v_id is not null and not exists (
    select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null
  ) then v_id := null; end if;

  perform set_config('app.linking', '1', true);
  if v_id is not null then
    update athletes set
      user_id = auth.uid(), linked_at = now(), signup_reviewed = false,
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

-- ---------------------------------------------------------------------
-- 6. Résultats de tests : l'athlète ne modifie que ceux qu'il a saisis lui-même
-- ---------------------------------------------------------------------
alter table test_results add column if not exists entered_by uuid default auth.uid();
drop policy if exists athlete_edit on test_results;
create policy athlete_edit on test_results for update to authenticated
  using (athlete_id = my_athlete_id() and entered_by = auth.uid())
  with check (athlete_id = my_athlete_id() and entered_by = auth.uid()
              and exists (select 1 from tests t where t.id = test_id and t.coach_id = my_coach_id()));
drop policy if exists athlete_delete on test_results;
create policy athlete_delete on test_results for delete to authenticated
  using (athlete_id = my_athlete_id() and entered_by = auth.uid());

-- ---------------------------------------------------------------------
-- 7. Notifications : appareils de push reconnus, pas de vol d'abonnement, un seul envoi par message
-- ---------------------------------------------------------------------
alter table push_subscriptions add column if not exists auth_hash text;
alter table messages add column if not exists notified_at timestamptz;
alter table feedback add column if not exists notified_at timestamptz;

-- Écritures uniquement par save_push (contrôle de l'adresse) ; lecture et retrait de ses propres appareils
drop policy if exists own on push_subscriptions;
drop policy if exists own_read on push_subscriptions;
drop policy if exists own_delete on push_subscriptions;
create policy own_read on push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy own_delete on push_subscriptions for delete to authenticated using (user_id = auth.uid());

drop function if exists save_push(text);
create or replace function save_push(p_endpoint text, p_auth text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row  push_subscriptions;
  v_hash text := case when coalesce(p_auth, '') <> '' then encode(sha256(convert_to(p_auth, 'UTF8')), 'hex') end;
begin
  if auth.uid() is null or length(p_endpoint) > 1000 or p_endpoint !~ (
    '^https://(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|'
    || '([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)/') then
    raise exception 'invalid_push_endpoint';
  end if;
  select * into v_row from push_subscriptions where endpoint = p_endpoint;
  -- Appareil déjà relié à un autre compte : il faut prouver qu'on détient l'abonnement (clé secrète du navigateur)
  if found and v_row.user_id <> auth.uid() and (v_row.auth_hash is null or v_hash is distinct from v_row.auth_hash) then
    raise exception 'push_device_taken';
  end if;
  insert into push_subscriptions (endpoint, user_id, auth_hash) values (p_endpoint, auth.uid(), v_hash)
  on conflict (endpoint) do update set user_id = auth.uid(),
    auth_hash = coalesce(excluded.auth_hash, push_subscriptions.auth_hash), created_at = now();
  -- Au plus 5 appareils par compte
  delete from push_subscriptions where user_id = auth.uid() and endpoint in (
    select endpoint from push_subscriptions where user_id = auth.uid() order by created_at desc offset 5);
end $$;
revoke all on function save_push(text, text) from public;
grant execute on function save_push(text, text) to authenticated;

-- notified_at n'est posé que par push_targets
create or replace function messages_protect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.linking', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.from_coach := is_my_athlete(new.athlete_id);
    new.author := case when new.from_coach then coalesce(nullif(initcap(split_part(split_part(
      (select email from auth.users where id = auth.uid()), '@', 1), '.', 1)), ''), 'Coach') else '' end;
    new.read_at := null;
    new.notified_at := null;
    new.created_at := now();
  else
    new.body := old.body; new.from_coach := old.from_coach; new.author := old.author;
    new.created_at := old.created_at; new.assignment_id := old.assignment_id; new.athlete_id := old.athlete_id;
    if old.from_coach = is_my_athlete(old.athlete_id) then new.read_at := old.read_at; end if;
    if coalesce(current_setting('app.push', true), '') <> '1' then new.notified_at := old.notified_at; end if;
  end if;
  return new;
end $$;

create or replace function feedback_protect() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_coach uuid;
begin
  if coalesce(current_setting('app.linking', true), '') = '1' then return new; end if;
  select coach_id into v_coach from athletes where id = new.athlete_id;
  if auth.uid() is not null and my_club() is distinct from v_coach then
    new.coach_reply := case when tg_op = 'UPDATE' then old.coach_reply else '' end;
  end if;
  if tg_op = 'INSERT' then new.notified_at := null;
  elsif coalesce(current_setting('app.push', true), '') <> '1' then new.notified_at := old.notified_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Appareils à prévenir après un message ou un retour que l'utilisateur connecté vient d'écrire.
-- Chaque message / retour n'est notifié qu'une fois.
drop function if exists push_targets(text, uuid);
create or replace function push_targets(p_kind text, p_id uuid) returns setof text
language plpgsql volatile security definer set search_path = public as $$
declare v_athlete uuid; v_to_coach boolean; v_coach uuid;
begin
  perform set_config('app.push', '1', true);
  if p_kind = 'message' then
    update messages m set notified_at = now()
     where m.id = p_id and m.notified_at is null and m.created_at > now() - interval '10 minutes'
       and ((m.from_coach and is_my_athlete(m.athlete_id)) or (not m.from_coach and m.athlete_id = my_athlete_id()))
    returning m.athlete_id, not m.from_coach into v_athlete, v_to_coach;
  elsif p_kind = 'feedback' then
    update feedback f set notified_at = now()
     where f.id = p_id and f.notified_at is null and f.athlete_id = my_athlete_id() and f.updated_at > now() - interval '10 minutes'
    returning f.athlete_id, true into v_athlete, v_to_coach;
  end if;
  perform set_config('app.push', '', true);
  if v_athlete is null then return; end if;
  if v_to_coach then
    select coach_id into v_coach from athletes where id = v_athlete;
    return query select s.endpoint from push_subscriptions s
      where s.user_id = v_coach or s.user_id in (select c.user_id from club_coaches c where c.owner_id = v_coach and c.user_id is not null);
  else
    return query select s.endpoint from push_subscriptions s join athletes a on a.user_id = s.user_id where a.id = v_athlete and a.active;
  end if;
end $$;
revoke all on function push_targets(text, uuid) from public;
grant execute on function push_targets(text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Fusion de deux fiches : toutes les données suivent (rien n'est perdu par cascade)
-- ---------------------------------------------------------------------
create or replace function merge_athletes(p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_from athletes;
  v_into athletes;
  f text := p_from::text;
  t text := p_into::text;
begin
  select * into v_from from athletes where id = p_from and coach_id = my_club();
  select * into v_into from athletes where id = p_into and coach_id = my_club();
  if v_from.id is null or v_into.id is null or p_from = p_into then raise exception 'not_found'; end if;
  if v_into.user_id is not null then raise exception 'target_has_account'; end if;

  perform set_config('app.linking', '1', true);
  -- En cas de doublon (même séance / même jour / même exercice), on garde les données du profil cible
  delete from feedback x where x.athlete_id = p_from
    and exists (select 1 from feedback y where y.athlete_id = p_into and y.assignment_id = x.assignment_id);
  update feedback set athlete_id = p_into where athlete_id = p_from;
  delete from wellness x where x.athlete_id = p_from
    and exists (select 1 from wellness y where y.athlete_id = p_into and y.date = x.date);
  update wellness set athlete_id = p_into where athlete_id = p_from;
  delete from attendance x where x.athlete_id = p_from
    and exists (select 1 from attendance y where y.athlete_id = p_into and y.assignment_id = x.assignment_id);
  update attendance set athlete_id = p_into where athlete_id = p_from;
  delete from session_adjustments x where x.athlete_id = p_from
    and exists (select 1 from session_adjustments y where y.athlete_id = p_into and y.assignment_id = x.assignment_id);
  update session_adjustments set athlete_id = p_into where athlete_id = p_from;
  delete from exercise_logs x where x.athlete_id = p_from
    and exists (select 1 from exercise_logs y where y.athlete_id = p_into and y.assignment_id = x.assignment_id and y.item_id = x.item_id);
  update exercise_logs set athlete_id = p_into where athlete_id = p_from;
  update records set athlete_id = p_into where athlete_id = p_from;
  update test_results set athlete_id = p_into where athlete_id = p_from;
  update test_reports set athlete_id = p_into where athlete_id = p_from;
  update athlete_notes set athlete_id = p_into where athlete_id = p_from;
  update messages set athlete_id = p_into where athlete_id = p_from;
  update availability set athlete_id = p_into where athlete_id = p_from;
  update privacy_acceptances set athlete_id = p_into where athlete_id = p_from;
  update assignments set athlete_ids = array(select distinct unnest(array_replace(athlete_ids, p_from, p_into)))
    where coach_id = my_club() and p_from = any (athlete_ids);
  update competitions set
    athlete_ids = array(select distinct unnest(array_replace(athlete_ids, p_from, p_into))),
    entries = case when entries ? f then (entries - f) || case when entries ? t then '{}'::jsonb
              else jsonb_build_object(t, entries -> f) end else entries end,
    athlete_priorities = case when athlete_priorities ? f then (athlete_priorities - f) || case when athlete_priorities ? t then '{}'::jsonb
              else jsonb_build_object(t, athlete_priorities -> f) end else athlete_priorities end
    where coach_id = my_club() and (p_from = any (athlete_ids) or entries ? f or athlete_priorities ? f);

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
revoke all on function merge_athletes(uuid, uuid) from public;
grant execute on function merge_athletes(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Messages : l'athlète peut écrire sur ses séances (la liste des séances
--    n'est plus lisible directement, la vérification passe par une fonction)
-- ---------------------------------------------------------------------
drop policy if exists athlete_write on messages;
create policy athlete_write on messages for insert to authenticated
  with check (athlete_id = my_athlete_id() and assignment_visible_to_me(assignment_id, false));

notify pgrst, 'reload schema';
commit;
