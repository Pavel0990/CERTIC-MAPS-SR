-- Revisión integral del 04/11/2026 (docs/audit/05-database-audit.md y 06-security-audit.md).
--
-- S-01  Un moderador al que le quitaron el rol seguía pudiendo pasar a «en proceso» o «resuelto» las consultas
--       que tenía asignadas, y su nota le llegaba al vecino como respuesta oficial. Ahora la asignación solo vale
--       mientras conserve el rol, y quitar el rol libera sus consultas abiertas.
-- DB-02 Las alertas de tránsito que vencían sin que nadie las revisara pasaban a «expired» y se contaban como
--       publicadas en el mapa de calor público y en los indicadores y el PDF. Ahora cuenta solo lo que de verdad
--       se publicó (published_at, sellado al pasar a active o verified).
-- DB-04 La administración municipal leía todas las columnas de audit_logs, incluidas la IP y el navegador de los
--       vecinos. Ahora el grant es por columna: el panel no las usa.

-- ── DB-02: cuándo se publicó cada alerta ───────────────────────────────────────
alter table public.traffic_reports add column if not exists published_at timestamptz;

-- Rellenar con lo que consta: la primera auditoría que la dejó activa o verificada…
update public.traffic_reports t set published_at = a.first_at
from (select entity_id, min(created_at) as first_at from public.audit_logs
      where entity_type = 'traffic_report' and after->>'status' in ('active', 'verified') group by entity_id) a
where a.entity_id = t.id and t.published_at is null;
-- …y la primera acción de moderación que la publicó
update public.traffic_reports t set published_at = m.first_at
from (select entity_id, min(created_at) as first_at from public.moderation_actions
      where entity_type = 'traffic_report' and to_status in ('active', 'verified') group by entity_id) m
where m.entity_id = t.id and t.published_at is null;
-- Lo que hoy está a la vista ya se publicó en algún momento
update public.traffic_reports set published_at = created_at
where published_at is null and status in ('active', 'verified', 'resolved');

create or replace function private.stamp_traffic_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('active', 'verified') and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
revoke all on function private.stamp_traffic_published() from public;

drop trigger if exists traffic_reports_stamp_published on public.traffic_reports;
create trigger traffic_reports_stamp_published
  before insert or update of status on public.traffic_reports
  for each row execute function private.stamp_traffic_published();

create or replace function public.kpi_summary(p_from date, p_to date, p_municipality_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  m uuid := p_municipality_id;
begin
  if not (private.is_service()
          or (m is null and private.is_provincial_admin())
          or (m is not null and private.is_admin(m))) then
    return private.reject('forbidden');
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then return private.reject('invalid_period'); end if;
  v_from := p_from::timestamp at time zone 'America/Santo_Domingo';
  v_to   := (p_to + 1)::timestamp at time zone 'America/Santo_Domingo';

  return jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'timezone', 'America/Santo_Domingo'),
    'municipality_id', m,
    'traffic', (select jsonb_build_object(
                  'received', count(*),
                  'published', count(*) filter (where t.published_at is not null and t.status <> 'rejected'),
                  'rejected', count(*) filter (where t.status = 'rejected'),
                  'out_of_area', count(*) filter (where t.status = 'out_of_area'),
                  'by_type', coalesce((select jsonb_object_agg(x.type, x.n) from (
                               select t2.type, count(*) n from public.traffic_reports t2
                               where t2.created_at >= v_from and t2.created_at < v_to
                                 and (m is null or t2.municipality_id = m) group by t2.type) x), '{}'::jsonb))
                from public.traffic_reports t
                where t.created_at >= v_from and t.created_at < v_to and (m is null or t.municipality_id = m)),
    'requests', jsonb_build_object(
                  'received', (select count(*) from public.citizen_requests r
                               where r.created_at >= v_from and r.created_at < v_to and (m is null or r.municipality_id = m)),
                  'resolved', (select count(*) from public.request_status_history h join public.citizen_requests r on r.id = h.request_id
                               where h.to_status = 'resolved' and h.created_at >= v_from and h.created_at < v_to
                                 and (m is null or r.municipality_id = m)),
                  'rejected', (select count(*) from public.request_status_history h join public.citizen_requests r on r.id = h.request_id
                               where h.to_status = 'rejected' and h.created_at >= v_from and h.created_at < v_to
                                 and (m is null or r.municipality_id = m)),
                  'open_now', (select count(*) from public.citizen_requests r
                               where r.status in ('pending', 'under_review', 'approved', 'in_progress') and (m is null or r.municipality_id = m)),
                  'avg_resolution_hours', (select round(avg(extract(epoch from (h.created_at - r.created_at)) / 3600)::numeric, 1)
                               from public.request_status_history h join public.citizen_requests r on r.id = h.request_id
                               where h.to_status = 'resolved' and h.created_at >= v_from and h.created_at < v_to
                                 and (m is null or r.municipality_id = m)),
                  'top_supported', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'support_count', x.support_count))
                               from (select r.id, r.title, r.support_count from public.citizen_requests r
                                     where r.is_public and r.status in ('approved', 'in_progress') and (m is null or r.municipality_id = m)
                                     order by r.support_count desc, r.created_at limit 5) x), '[]'::jsonb)),
    'businesses', jsonb_build_object(
                  'approved_total', (select count(*) from public.businesses b
                               where b.status = 'approved' and b.deleted_at is null and (m is null or b.municipality_id = m)),
                  'submitted', (select count(*) from public.businesses b
                               where b.created_at >= v_from and b.created_at < v_to and (m is null or b.municipality_id = m)),
                  'pending_now', (select count(*) from public.businesses b
                               where b.status in ('pending', 'under_review') and (m is null or b.municipality_id = m))),
    'tourism', jsonb_build_object(
                  'places_published', (select count(*) from public.tourism_places t
                               where t.status = 'published' and t.deleted_at is null and (m is null or t.municipality_id = m)),
                  'routes_published', (select count(*) from public.eco_routes r
                               where r.status = 'published' and r.deleted_at is null and (m is null or m = any (r.municipality_ids))),
                  'proposals_pending', (select count(*) from public.tourism_places t where t.status = 'pending' and (m is null or t.municipality_id = m))
                                     + (select count(*) from public.eco_routes r where r.status = 'pending' and (m is null or r.municipality_id = m))),
    'users', jsonb_build_object(
                  'new', (select count(*) from public.profiles p
                          where p.created_at >= v_from and p.created_at < v_to and (m is null or p.home_municipality_id = m))),
    'engagement', jsonb_build_object(
                  'views', coalesce((select sum(e.count) from public.engagement_daily e
                          where e.metric = 'view' and e.day between p_from and p_to), 0))
  );
end $$;

create or replace function public.report_hotspots(p_days integer default 90)
returns jsonb
language sql stable security definer
set search_path = pg_catalog, extensions, public
as $$
  with params as (
    select least(greatest(coalesce(p_days, 90), 7), 365) as days, 0.005::double precision as cell
  ),
  pts as (
    select tr.geom from public.traffic_reports tr, params p
    where tr.published_at is not null and tr.status <> 'rejected'
      and tr.created_at >= now() - make_interval(days => p.days)
    union all
    select q.geom from public.citizen_requests q, params p
    where q.geom is not null and q.is_public and q.status in ('approved', 'in_progress', 'resolved', 'archived')
      and q.created_at >= now() - make_interval(days => p.days)
  ),
  cells as (
    select floor(st_x(geom) / p.cell) as gx, floor(st_y(geom) / p.cell) as gy, count(*) as n, p.cell
    from pts, params p
    group by gx, gy, p.cell
    having count(*) >= 2
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(
        round(((gx + 0.5) * cell)::numeric, 5), round(((gy + 0.5) * cell)::numeric, 5))),
      'properties', jsonb_build_object('count', n)
    ) order by n desc), '[]'::jsonb)
  )
  from cells;
$$;

-- ── S-01: la asignación caduca con el rol ──────────────────────────────────────
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
                                       or (r.assigned_to = v_uid and p_to in ('in_progress', 'resolved')
                                           -- la asignación solo vale mientras siga siendo personal del municipio
                                           and private.user_has_role(v_uid, array['moderator', 'municipal_admin'], r.municipality_id))
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

create or replace function public.revoke_role(p_user_id uuid, p_role text, p_municipality_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('role_change') then return private.reject('rate_limited'); end if;
  if p_role not in ('moderator', 'municipal_admin') or p_municipality_id is null then
    return private.reject('role_not_revocable');
  end if;
  if (p_role = 'moderator' and not private.is_admin(p_municipality_id))
     or (p_role = 'municipal_admin' and not private.is_provincial_admin()) then
    return private.reject('forbidden');
  end if;
  delete from public.user_roles where user_id = p_user_id and role = p_role and municipality_id = p_municipality_id;
  if not found then return private.reject('not_found'); end if;
  -- Sin rol en ese municipio, sus consultas abiertas vuelven a quedar sin responsable
  if not private.user_has_role(p_user_id, array['moderator', 'municipal_admin'], p_municipality_id) then
    update public.citizen_requests set assigned_to = null
    where assigned_to = p_user_id and municipality_id = p_municipality_id
      and status not in ('resolved', 'rejected', 'archived');
  end if;
  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, reason)
  values (v_uid, 'user_role', p_user_id, 'revoke', p_role || ' @ ' || p_municipality_id);
  perform private.audit('role.revoke', 'user_role', p_user_id, jsonb_build_object('role', p_role), null, 'success', p_municipality_id);
  return jsonb_build_object('status', 'ok');
end $$;

-- Asignaciones que quedaron colgadas antes de esta migración
update public.citizen_requests r set assigned_to = null
where r.assigned_to is not null
  and r.status not in ('resolved', 'rejected', 'archived')
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = r.assigned_to and ur.role in ('moderator', 'municipal_admin')
      and (ur.municipality_id = r.municipality_id or ur.municipality_id is null));

-- ── DB-04: la auditoría sin IP ni navegador para el panel ──────────────────────
revoke select on public.audit_logs from authenticated;
grant select (id, created_at, province_id, municipality_id, actor_id, actor_role, action, entity_type, entity_id, result)
  on public.audit_logs to authenticated;
