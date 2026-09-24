-- =====================================================================
-- SR Conecta · 100 · RPC de participación ciudadana (tránsito, consultas, votos)
-- Referencia: DATABASE.md §6 · ARCHITECTURE.md §12 (contrato de RPC), §21, ADR-018
--
-- Contrato de TODAS las RPC:
--  · identidad desde auth.uid(), nunca desde parámetros
--  · validan todo lo que importa (asumen que se las llama directamente, sin Next.js)
--  · rechazos de negocio → se DEVUELVEN con private.reject() (el rate limit y la auditoría persisten)
--  · creación idempotente (p_idempotency_key) · cambios de estado con compare-and-set (p_expected_status)
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Tránsito
-- ---------------------------------------------------------------------
create or replace function public.create_traffic_report(
  p_type text, p_lat double precision, p_lng double precision,
  p_idempotency_key text, p_severity smallint default null, p_description text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_type public.traffic_report_types;
  v_geom geometry;
  v_muni uuid;
  v_prov uuid;
  v_status text;
  v_rep smallint;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 64 then
    return private.reject('invalid_idempotency_key');
  end if;
  select id into v_id from public.traffic_reports where reporter_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('status', 'ok', 'id', v_id, 'duplicate', true); end if;

  if not private.hit_rate_limit('traffic_report_create') then return private.reject('rate_limited'); end if;

  select * into v_type from public.traffic_report_types where code = p_type and active;
  if not found then return private.reject('invalid_type'); end if;
  v_geom := private.make_point(p_lat, p_lng);
  if v_geom is null then return private.reject('invalid_coordinates'); end if;
  if p_severity is not null and p_severity not between 1 and 3 then return private.reject('invalid_severity'); end if;
  if char_length(p_description) > 500 then return private.reject('description_too_long'); end if;

  select l.municipality_id, l.province_id into v_muni, v_prov from private.locate(v_geom) l;
  select reputation into v_rep from public.profiles where id = v_uid;
  v_status := case when v_muni is null then 'out_of_area'
                   when coalesce(v_rep, 0) >= 5 then 'active'   -- reputación alta: publicación directa
                   else 'pending' end;

  insert into public.traffic_reports (province_id, municipality_id, reporter_id, type, severity, description,
                                      geom, status, expires_at, idempotency_key)
  values (coalesce(v_prov, private.default_province_id()), v_muni, v_uid, v_type.code,
          coalesce(p_severity, v_type.default_severity), nullif(btrim(p_description), ''),
          v_geom, v_status, now() + v_type.default_ttl, p_idempotency_key)
  returning id into v_id;

  perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'traffic_report', 'id', v_id));
  return jsonb_build_object('status', 'ok', 'id', v_id, 'report_status', v_status);
exception when unique_violation then
  -- doble envío concurrente con la misma clave: devolver el existente
  select id into v_id from public.traffic_reports where reporter_id = v_uid and idempotency_key = p_idempotency_key;
  return jsonb_build_object('status', 'ok', 'id', v_id, 'duplicate', true);
end $$;

create or replace function public.moderate_traffic_report(
  p_id uuid, p_expected_status text, p_to text, p_note text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r public.traffic_reports;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;
  select * into r from public.traffic_reports where id = p_id;
  if not found then return private.reject('not_found'); end if;
  if not private.is_staff(r.municipality_id) then
    perform private.audit('traffic.moderate', 'traffic_report', p_id, null, jsonb_build_object('to', p_to), 'denied', r.municipality_id);
    return private.reject('forbidden');
  end if;
  if not exists (select 1 from private.traffic_transitions t where t.from_status = p_expected_status and t.to_status = p_to) then
    return private.reject('invalid_transition');
  end if;
  if p_to = 'rejected' and coalesce(btrim(p_note), '') = '' then return private.reject('reason_required'); end if;

  update public.traffic_reports set status = p_to
  where id = p_id and status = p_expected_status;           -- compare-and-set
  if not found then
    return private.reject('stale_state', jsonb_build_object('current_status', (select status from public.traffic_reports where id = p_id)));
  end if;

  -- reputación del autor: verificar suma, rechazar resta
  if r.reporter_id is not null and p_to in ('active', 'verified', 'rejected') then
    update public.profiles
    set reputation = greatest(-100, least(100, reputation + case when p_to = 'rejected' then -2 else 1 end))
    where id = r.reporter_id;
  end if;

  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, from_status, to_status, reason)
  values (v_uid, 'traffic_report', p_id, 'status_change', p_expected_status, p_to, p_note);
  perform private.audit('traffic.moderate', 'traffic_report', p_id,
                        jsonb_build_object('status', p_expected_status), jsonb_build_object('status', p_to), 'success', r.municipality_id);
  perform private.notify(r.reporter_id, 'traffic_status', 'Tu reporte de tránsito cambió de estado',
                         case p_to when 'rejected' then 'No se publicó: ' || p_note else 'Nuevo estado: ' || p_to end,
                         jsonb_build_object('traffic_report_id', p_id, 'status', p_to));
  return jsonb_build_object('status', 'ok', 'id', p_id, 'report_status', p_to);
end $$;

-- Un bache que necesita obra pasa a ser incidencia municipal sin que el vecino lo reporte otra vez
create or replace function public.escalate_traffic_report(p_id uuid, p_category text default 'infraestructura')
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r public.traffic_reports;
  v_type_name text;
  v_req uuid;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;
  select * into r from public.traffic_reports where id = p_id for update;
  if not found then return private.reject('not_found'); end if;
  if r.municipality_id is null or not private.is_staff(r.municipality_id) then return private.reject('forbidden'); end if;
  if r.escalated_request_id is not null then
    return jsonb_build_object('status', 'ok', 'request_id', r.escalated_request_id, 'duplicate', true);
  end if;
  if not exists (select 1 from public.request_categories c where c.code = p_category and c.kind = 'incident' and c.active) then
    return private.reject('invalid_category');
  end if;
  select name into v_type_name from public.traffic_report_types where code = r.type;

  insert into public.citizen_requests (province_id, municipality_id, requester_id, kind, category, title, description,
                                       geom, status)
  values (r.province_id, r.municipality_id, r.reporter_id, 'incident', p_category,
          left('Escalado desde tránsito: ' || v_type_name, 120),
          left('Reporte de tránsito escalado (' || v_type_name || '): ' || coalesce(nullif(r.description, ''), 'sin descripción'), 2000),
          r.geom, 'approved')
  returning id into v_req;
  insert into public.request_status_history (request_id, from_status, to_status, changed_by, note)
  values (v_req, null, 'approved', v_uid, 'Escalado desde el reporte de tránsito ' || p_id);
  update public.traffic_reports set escalated_request_id = v_req where id = p_id;

  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, reason)
  values (v_uid, 'traffic_report', p_id, 'escalate', 'citizen_request ' || v_req);
  perform private.audit('traffic.escalate', 'traffic_report', p_id, null, jsonb_build_object('request_id', v_req), 'success', r.municipality_id);
  perform private.notify(r.reporter_id, 'request_status', 'Tu reporte pasó al ayuntamiento',
                         'Se abrió una solicitud municipal para resolverlo.', jsonb_build_object('request_id', v_req));
  return jsonb_build_object('status', 'ok', 'request_id', v_req);
end $$;

-- ---------------------------------------------------------------------
-- Incidencias y consultas municipales
-- ---------------------------------------------------------------------
create or replace function public.create_citizen_request(
  p_kind text, p_category text, p_title text, p_description text, p_idempotency_key text,
  p_lat double precision default null, p_lng double precision default null, p_municipality_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_geom geometry;
  v_muni uuid;
  v_prov uuid;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 64 then
    return private.reject('invalid_idempotency_key');
  end if;
  select id into v_id from public.citizen_requests where requester_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('status', 'ok', 'id', v_id, 'duplicate', true); end if;
  if not private.hit_rate_limit('request_create') then return private.reject('rate_limited'); end if;

  if not exists (select 1 from public.request_categories c where c.code = p_category and c.kind = p_kind and c.active) then
    return private.reject('invalid_category');
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 120 then return private.reject('invalid_title'); end if;
  if char_length(btrim(coalesce(p_description, ''))) not between 10 and 2000 then return private.reject('invalid_description'); end if;

  if p_lat is not null or p_lng is not null then
    v_geom := private.make_point(p_lat, p_lng);
    if v_geom is null then return private.reject('invalid_coordinates'); end if;
    select l.municipality_id, l.province_id into v_muni, v_prov from private.locate(v_geom) l;
    if v_muni is null then return private.reject('out_of_area'); end if;
  elsif p_kind = 'incident' then
    return private.reject('location_required');
  else
    select m.id, m.province_id into v_muni, v_prov from public.municipalities m where m.id = p_municipality_id;
    if v_muni is null then return private.reject('municipality_required'); end if;
  end if;

  insert into public.citizen_requests (province_id, municipality_id, requester_id, kind, category, title, description,
                                       geom, idempotency_key)
  values (v_prov, v_muni, v_uid, p_kind, p_category, btrim(p_title), btrim(p_description), v_geom, p_idempotency_key)
  returning id into v_id;
  insert into public.request_status_history (request_id, from_status, to_status, changed_by)
  values (v_id, null, 'pending', v_uid);
  perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'citizen_request', 'id', v_id));
  return jsonb_build_object('status', 'ok', 'id', v_id);
exception when unique_violation then
  select id into v_id from public.citizen_requests where requester_id = v_uid and idempotency_key = p_idempotency_key;
  return jsonb_build_object('status', 'ok', 'id', v_id, 'duplicate', true);
end $$;

-- Un paso por llamada, solo si el estado sigue siendo el que el moderador vio (compare-and-set)
create or replace function public.change_request_status(
  p_id uuid, p_expected_status text, p_to text, p_note text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r public.citizen_requests;
  v_min_role text;
  v_allowed boolean;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;
  select * into r from public.citizen_requests where id = p_id;
  if not found then return private.reject('not_found'); end if;

  select t.min_role into v_min_role from private.request_transitions t
  where t.from_status = p_expected_status and t.to_status = p_to;
  if not found then return private.reject('invalid_transition'); end if;

  v_allowed := case v_min_role
                 when 'moderator' then private.is_staff(r.municipality_id)
                                       or (r.assigned_to = v_uid and p_to in ('in_progress', 'resolved'))
                 when 'municipal_admin' then private.is_admin(r.municipality_id)
                 else false end;
  if not v_allowed then
    perform private.audit('request.status_change', 'citizen_request', p_id, null, jsonb_build_object('to', p_to), 'denied', r.municipality_id);
    return private.reject('forbidden');
  end if;

  if p_to = 'resolved' and coalesce(btrim(p_note), '') = '' then return private.reject('note_required'); end if;
  if p_to = 'rejected' and coalesce(btrim(p_note), '') = '' then return private.reject('reason_required'); end if;
  if p_to = 'in_progress' and r.assigned_to is null then return private.reject('assignee_required'); end if;

  update public.citizen_requests
  set status = p_to,
      resolution_note  = case when p_to = 'resolved' then btrim(p_note) else resolution_note end,
      rejection_reason = case when p_to = 'rejected' then btrim(p_note) else rejection_reason end
  where id = p_id and status = p_expected_status;
  if not found then
    return private.reject('stale_state', jsonb_build_object('current_status', (select status from public.citizen_requests where id = p_id)));
  end if;

  insert into public.request_status_history (request_id, from_status, to_status, changed_by, note)
  values (p_id, p_expected_status, p_to, v_uid, nullif(btrim(p_note), ''));
  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, from_status, to_status, reason)
  values (v_uid, 'citizen_request', p_id, 'status_change', p_expected_status, p_to, nullif(btrim(p_note), ''));
  perform private.audit('request.status_change', 'citizen_request', p_id,
                        jsonb_build_object('status', p_expected_status), jsonb_build_object('status', p_to), 'success', r.municipality_id);
  perform private.notify(r.requester_id, 'request_status', 'Tu solicitud cambió de estado',
                         case p_to when 'rejected' then 'No se aceptó: ' || btrim(p_note)
                                   when 'resolved' then 'Resuelta: ' || btrim(p_note)
                                   else 'Nuevo estado: ' || p_to end,
                         jsonb_build_object('request_id', p_id, 'status', p_to));
  return jsonb_build_object('status', 'ok', 'id', p_id, 'request_status', p_to);
end $$;

create or replace function public.assign_request(p_id uuid, p_assignee uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r public.citizen_requests;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;
  select * into r from public.citizen_requests where id = p_id;
  if not found then return private.reject('not_found'); end if;
  if not private.is_staff(r.municipality_id) then return private.reject('forbidden'); end if;
  if r.status not in ('under_review', 'approved', 'in_progress') then return private.reject('not_assignable'); end if;
  if not private.user_has_role(p_assignee, array['moderator', 'municipal_admin'], r.municipality_id) then
    return private.reject('assignee_not_staff');
  end if;
  update public.citizen_requests set assigned_to = p_assignee where id = p_id;
  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, reason)
  values (v_uid, 'citizen_request', p_id, 'assign', 'assigned_to ' || p_assignee);
  perform private.audit('request.assign', 'citizen_request', p_id,
                        jsonb_build_object('assigned_to', r.assigned_to), jsonb_build_object('assigned_to', p_assignee), 'success', r.municipality_id);
  return jsonb_build_object('status', 'ok', 'id', p_id, 'assigned_to', p_assignee);
end $$;

-- F5 "voten prioridades": alterna el apoyo del usuario (un voto por usuario y consulta)
create or replace function public.toggle_request_vote(p_request_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r record;
  v_voted boolean;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('request_vote') then return private.reject('rate_limited'); end if;
  select id, status, is_public, requester_id into r from public.citizen_requests where id = p_request_id;
  if not found then return private.reject('not_found'); end if;
  if not r.is_public or r.status not in ('approved', 'in_progress') then return private.reject('not_votable'); end if;
  if r.requester_id = v_uid then return private.reject('own_request'); end if;

  delete from public.request_votes where request_id = p_request_id and user_id = v_uid;
  if found then
    v_voted := false;
  else
    begin
      insert into public.request_votes (request_id, user_id) values (p_request_id, v_uid);
    exception when unique_violation then null;   -- doble clic concurrente: ya estaba votado
    end;
    v_voted := true;
  end if;
  return jsonb_build_object('status', 'ok', 'voted', v_voted,
                            'support_count', (select support_count from public.citizen_requests where id = p_request_id));
end $$;

-- Publicar una consulta en el mapa (solo personal; sin datos personales visibles: grants por columna, DATABASE.md §7)
create or replace function public.set_request_public(p_id uuid, p_public boolean)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r public.citizen_requests;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  select * into r from public.citizen_requests where id = p_id;
  if not found then return private.reject('not_found'); end if;
  if not private.is_staff(r.municipality_id) then return private.reject('forbidden'); end if;
  if p_public and r.status not in ('approved', 'in_progress', 'resolved') then return private.reject('not_approved'); end if;
  update public.citizen_requests set is_public = p_public where id = p_id;
  perform private.audit('request.visibility', 'citizen_request', p_id,
                        jsonb_build_object('is_public', r.is_public), jsonb_build_object('is_public', p_public), 'success', r.municipality_id);
  return jsonb_build_object('status', 'ok', 'id', p_id, 'is_public', p_public);
end $$;
