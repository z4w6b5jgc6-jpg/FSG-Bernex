-- 3 · Version légère de la confidentialité (à appliquer après 1 et 2 sur un projet existant ; rejouable)
-- - inscriptions ouvertes sans publication préalable d'une politique de confidentialité
-- - suivi de forme (bien-être, douleur, fatigue, humeur) sans consentement enregistré
-- - ouverture du contenu des séances par défaut 1 h avant le début

drop trigger if exists consent_required on public.wellness;
drop trigger if exists consent_required on public.feedback;

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

-- Le contenu d'une séance est-il visible pour les athlètes ? Défaut : 1 h avant (heure de Genève).
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
