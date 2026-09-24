-- =====================================================================
-- SR Conecta · 140 · Fotos, alertas sobre el mapa, edición de lugares y rutas, agregados y salud
-- Referencia: ARCHITECTURE.md §9, §10, §11, §13 · DATABASE.md §6
-- Cubre requisitos de las bases: F2 "fotos", F3 "servicios disponibles",
-- "reciba notificaciones sobre el mapa" y el zoom provincial del mapa.
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Fotos
-- Flujo: el cliente sube a report-evidence/incoming/{uid}/{uuid}.{ext} (política de Storage + cuota)
--        → register_attachment() la vincula a su entidad → job image_process → worker_attachment_processed()
--        → (solo contenido público) review_content('attachment', …, 'approved') → job publish_media
-- ---------------------------------------------------------------------

-- Cuota de subida: máx. 20 archivos por hora y usuario (se evalúa en la política de Storage)
create or replace function private.upload_quota_ok()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select count(*) from storage.objects o
          where o.bucket_id = 'report-evidence'
            and (storage.foldername(o.name))[2] = (select auth.uid())::text
            and o.created_at > now() - interval '1 hour') < 20
$$;

create or replace function public.register_attachment(p_entity text, p_entity_id uuid, p_path text)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_obj record;
  v_mime text;
  v_bytes integer;
  v_allowed boolean := false;
  v_limit integer;
  v_count integer;
  v_id uuid;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('attachment_register') then return private.reject('rate_limited'); end if;
  if p_entity not in ('business', 'tourism_place', 'eco_route', 'traffic_report', 'citizen_request') then
    return private.reject('invalid_entity');
  end if;
  -- solo archivos de la carpeta propia; el nombre lo genera el cliente como {uuid}.{ext} (sin rutas del usuario)
  if p_path is null or p_path !~ ('^incoming/' || v_uid::text || '/[a-z0-9-]{8,64}\.(jpg|jpeg|png|webp)$') then
    return private.reject('invalid_path');
  end if;
  select o.metadata into v_obj from storage.objects o where o.bucket_id = 'report-evidence' and o.name = p_path;
  if not found then return private.reject('upload_not_found'); end if;
  v_mime := v_obj.metadata ->> 'mimetype';
  v_bytes := coalesce((v_obj.metadata ->> 'size')::integer, 0);
  if v_mime not in ('image/jpeg', 'image/png', 'image/webp') or v_bytes not between 1 and 5242880 then
    return private.reject('invalid_file');
  end if;
  if exists (select 1 from public.attachments where path = p_path) then return private.reject('already_registered'); end if;

  -- permiso sobre la entidad y límite de fotos por entidad
  if p_entity = 'traffic_report' then
    v_allowed := exists (select 1 from public.traffic_reports where id = p_entity_id and reporter_id = v_uid);
    v_limit := 3;
    select count(*) into v_count from public.attachments where traffic_report_id = p_entity_id and status <> 'rejected';
  elsif p_entity = 'citizen_request' then
    v_allowed := exists (select 1 from public.citizen_requests where id = p_entity_id and requester_id = v_uid);
    v_limit := 3;
    select count(*) into v_count from public.attachments where citizen_request_id = p_entity_id and status <> 'rejected';
  elsif p_entity = 'business' then
    v_allowed := private.is_business_member(p_entity_id)
                 or exists (select 1 from public.businesses b where b.id = p_entity_id and private.is_staff(b.municipality_id));
    v_limit := 10;
    select count(*) into v_count from public.attachments where business_id = p_entity_id and status <> 'rejected';
  elsif p_entity = 'tourism_place' then
    v_allowed := exists (select 1 from public.tourism_places t where t.id = p_entity_id
                         and ((t.proposed_by = v_uid and t.status = 'pending') or private.is_staff(t.municipality_id)));
    v_limit := 10;
    select count(*) into v_count from public.attachments where tourism_place_id = p_entity_id and status <> 'rejected';
  else
    v_allowed := exists (select 1 from public.eco_routes r where r.id = p_entity_id
                         and ((r.proposed_by = v_uid and r.status = 'pending') or private.is_staff(r.municipality_id)));
    v_limit := 10;
    select count(*) into v_count from public.attachments where eco_route_id = p_entity_id and status <> 'rejected';
  end if;
  if not v_allowed then return private.reject('forbidden'); end if;
  if v_count >= v_limit then return private.reject('too_many_photos', jsonb_build_object('limit', v_limit)); end if;

  insert into public.attachments (owner_id, business_id, tourism_place_id, eco_route_id, traffic_report_id,
                                  citizen_request_id, bucket, path, mime, bytes, status)
  values (v_uid,
          case when p_entity = 'business' then p_entity_id end,
          case when p_entity = 'tourism_place' then p_entity_id end,
          case when p_entity = 'eco_route' then p_entity_id end,
          case when p_entity = 'traffic_report' then p_entity_id end,
          case when p_entity = 'citizen_request' then p_entity_id end,
          'report-evidence', p_path, v_mime, v_bytes, 'pending')
  returning id into v_id;
  perform private.enqueue('image_process', jsonb_build_object('attachment_id', v_id), 'img:' || v_id);
  return jsonb_build_object('status', 'ok', 'id', v_id);
end $$;

-- El worker informa el resultado del procesamiento (EXIF fuera, re-codificado a WebP, dimensiones limitadas)
create or replace function public.worker_attachment_processed(
  p_id uuid, p_ok boolean, p_final_path text default null, p_bytes integer default null,
  p_width integer default null, p_height integer default null, p_error text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  select path into v_old from public.attachments where id = p_id and status = 'pending';
  if not found then return private.reject('not_pending'); end if;
  if p_ok then
    update public.attachments
    set path = p_final_path, mime = 'image/webp', bytes = p_bytes, width = p_width, height = p_height, status = 'processed'
    where id = p_id;
  else
    update public.attachments set status = 'rejected' where id = p_id;
  end if;
  -- el original (con EXIF) se borra siempre
  perform private.enqueue('delete_storage_object', jsonb_build_object('bucket', 'report-evidence', 'path', v_old), 'del:' || v_old);
  return jsonb_build_object('status', 'ok', 'error', p_error);
end $$;

-- El worker confirma que copió la foto aprobada al bucket público
create or replace function public.worker_attachment_published(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.attachments set bucket = 'public-media' where id = p_id and status = 'approved';
  if not found then return private.reject('not_approved'); end if;
  return jsonb_build_object('status', 'ok');
end $$;

-- ---------------------------------------------------------------------
-- 2. Alertas sobre el mapa (bases: "reciba notificaciones sobre el mapa")
-- Al activarse un reporte de gravedad ≥ 2 se encola una alerta; el worker la reparte.
-- Destinatarios: vecinos de ese municipio (in-app por defecto) o quien lo sigue en sus preferencias;
-- se excluye al autor y a quien quitó el tema 'traffic_nearby'. Una sola alerta por reporte.
-- ---------------------------------------------------------------------
create or replace function private.enqueue_traffic_alert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('active', 'verified') and new.severity >= 2 and new.municipality_id is not null
     and (tg_op = 'INSERT' or old.status not in ('active', 'verified')) then
    perform private.enqueue('fanout_alert', jsonb_build_object('traffic_report_id', new.id), 'alert:' || new.id);
  end if;
  return null;
end $$;

create trigger traffic_reports_alert after insert or update of status on public.traffic_reports
  for each row execute function private.enqueue_traffic_alert();

create or replace function public.worker_run_fanout_alert(p_traffic_report_id uuid)
returns integer
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  r record;
  v_n integer;
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  select t.id, t.municipality_id, t.reporter_id, t.severity, tt.name as type_name, m.name as muni_name, t.status
    into r
  from public.traffic_reports t
  join public.traffic_report_types tt on tt.code = t.type
  join public.municipalities m on m.id = t.municipality_id
  where t.id = p_traffic_report_id;
  if not found or r.status not in ('active', 'verified') then return 0; end if;

  with recipients as (
    select p.id as user_id,
           coalesce(np.push_enabled, false) and 'traffic_nearby' = any (coalesce(np.topics, '{}')) as push
    from public.profiles p
    left join public.notification_preferences np on np.user_id = p.id
    where p.id is distinct from r.reporter_id
      and (   (np.user_id is null and p.home_municipality_id = r.municipality_id)
           or (np.user_id is not null and 'traffic_nearby' = any (np.topics)
               and (r.municipality_id = any (np.municipalities)
                    or (cardinality(np.municipalities) = 0 and p.home_municipality_id = r.municipality_id))))
  ), ins as (
    insert into public.notifications (user_id, kind, title, body, payload, push_status)
    select user_id, 'traffic_nearby', left(r.type_name || ' en ' || r.muni_name, 120),
           'Toca para verlo en el mapa.',
           jsonb_build_object('traffic_report_id', r.id, 'severity', r.severity),
           case when push then 'pending' else 'none' end
    from recipients
    returning id, push_status
  ), jobs as (
    insert into private.jobs (kind, payload, dedupe_key)
    select 'push', jsonb_build_object('notification_id', id), 'push:' || id from ins where push_status = 'pending'
    on conflict (dedupe_key) where status in ('pending', 'running') do nothing
    returning 1
  )
  select count(*) into v_n from ins;
  return v_n;
end $$;

-- ---------------------------------------------------------------------
-- 3. Edición de lugares y rutas (bases F3: "servicios disponibles"; panel: CRUD de turismo)
-- Personal del municipio, o quien propuso mientras está pendiente. Lista blanca + versión.
-- ---------------------------------------------------------------------
create or replace function private.valid_services(p jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select p is not null and jsonb_typeof(p) = 'object'
         and (select count(*) from jsonb_object_keys(p)) <= 20
         and not exists (select 1 from jsonb_each(p) e where jsonb_typeof(e.value) not in ('boolean', 'string'))
$$;

create or replace function public.update_place(p_id uuid, p_version integer, p_changes jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  t public.tourism_places;
  v_allowed constant text[] := array['name', 'kind', 'description', 'services', 'accessibility', 'opening_info'];
  v_unknown text[];
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('content_update') then return private.reject('rate_limited'); end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then return private.reject('no_changes'); end if;
  select array_agg(k) into v_unknown from jsonb_object_keys(p_changes) k where k <> all (v_allowed);
  if v_unknown is not null then return private.reject('unknown_field', jsonb_build_object('fields', v_unknown)); end if;
  if p_changes ? 'services' and not private.valid_services(p_changes -> 'services') then return private.reject('invalid_services'); end if;

  select * into t from public.tourism_places where id = p_id and deleted_at is null;
  if not found then return private.reject('not_found'); end if;
  if not (private.is_staff(t.municipality_id) or (t.proposed_by = v_uid and t.status = 'pending')) then
    return private.reject('forbidden');
  end if;

  update public.tourism_places set
    name          = case when p_changes ? 'name'          then btrim(p_changes ->> 'name') else name end,
    kind          = case when p_changes ? 'kind'          then p_changes ->> 'kind' else kind end,
    description   = case when p_changes ? 'description'   then nullif(btrim(p_changes ->> 'description'), '') else description end,
    services      = case when p_changes ? 'services'      then p_changes -> 'services' else services end,
    accessibility = case when p_changes ? 'accessibility' then nullif(btrim(p_changes ->> 'accessibility'), '') else accessibility end,
    opening_info  = case when p_changes ? 'opening_info'  then nullif(btrim(p_changes ->> 'opening_info'), '') else opening_info end
  where id = p_id and version = p_version;
  if not found then
    return private.reject('version_conflict', jsonb_build_object('current_version', (select version from public.tourism_places where id = p_id)));
  end if;
  perform private.audit('place.update', 'tourism_place', p_id, null, p_changes, 'success', t.municipality_id);
  return jsonb_build_object('status', 'ok', 'id', p_id, 'version', p_version + 1);
exception when check_violation or not_null_violation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- p_changes admite 'geojson' (nuevo trazado) solo para el personal
create or replace function public.update_route(p_id uuid, p_version integer, p_changes jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  r public.eco_routes;
  v_allowed constant text[] := array['name', 'kind', 'difficulty', 'duration_min', 'description', 'services', 'geojson'];
  v_unknown text[];
  v_staff boolean;
  v_geom geometry;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('content_update') then return private.reject('rate_limited'); end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then return private.reject('no_changes'); end if;
  select array_agg(k) into v_unknown from jsonb_object_keys(p_changes) k where k <> all (v_allowed);
  if v_unknown is not null then return private.reject('unknown_field', jsonb_build_object('fields', v_unknown)); end if;
  if p_changes ? 'services' and not private.valid_services(p_changes -> 'services') then return private.reject('invalid_services'); end if;

  select * into r from public.eco_routes where id = p_id and deleted_at is null;
  if not found then return private.reject('not_found'); end if;
  v_staff := private.is_staff(r.municipality_id);
  if not (v_staff or (r.proposed_by = v_uid and r.status = 'pending')) then return private.reject('forbidden'); end if;

  if p_changes ? 'geojson' then
    if not v_staff then return private.reject('forbidden'); end if;
    if p_changes -> 'geojson' ->> 'type' not in ('LineString', 'MultiLineString') then return private.reject('invalid_geometry'); end if;
    begin
      v_geom := st_multi(st_setsrid(st_geomfromgeojson((p_changes -> 'geojson')::text), 4326));
    exception when others then return private.reject('invalid_geometry');
    end;
    if not st_isvalid(v_geom) or st_npoints(v_geom) not between 2 and 5000 then return private.reject('invalid_geometry'); end if;
  end if;

  update public.eco_routes set
    name         = case when p_changes ? 'name'         then btrim(p_changes ->> 'name') else name end,
    kind         = case when p_changes ? 'kind'         then p_changes ->> 'kind' else kind end,
    difficulty   = case when p_changes ? 'difficulty'   then p_changes ->> 'difficulty' else difficulty end,
    duration_min = case when p_changes ? 'duration_min' then (p_changes ->> 'duration_min')::integer else duration_min end,
    description  = case when p_changes ? 'description'  then nullif(btrim(p_changes ->> 'description'), '') else description end,
    services     = case when p_changes ? 'services'     then p_changes -> 'services' else services end,
    geom         = coalesce(v_geom, geom)
  where id = p_id and version = p_version;
  if not found then
    return private.reject('version_conflict', jsonb_build_object('current_version', (select version from public.eco_routes where id = p_id)));
  end if;
  perform private.audit('route.update', 'eco_route', p_id, null, p_changes - 'geojson', 'success', r.municipality_id);
  return jsonb_build_object('status', 'ok', 'id', p_id, 'version', p_version + 1);
exception when check_violation or not_null_violation or invalid_text_representation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- ---------------------------------------------------------------------
-- 4. Mapa a escala provincial (zoom ≤ 10): conteos públicos por municipio
-- ---------------------------------------------------------------------
create or replace function public.map_aggregates()
returns jsonb
language sql stable security invoker
set search_path = pg_catalog, extensions, public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'municipality_id', m.id, 'name', m.name,
           'center', st_asgeojson(st_pointonsurface(m.geom_simplified), 6)::jsonb,
           'businesses', (select count(*) from public.businesses b where b.municipality_id = m.id and b.status = 'approved' and b.deleted_at is null),
           'tourism', (select count(*) from public.tourism_places t where t.municipality_id = m.id and t.status = 'published' and t.deleted_at is null),
           'routes', (select count(*) from public.eco_routes r where m.id = any (r.municipality_ids) and r.status = 'published' and r.deleted_at is null),
           'traffic', (select count(*) from public.traffic_reports tr where tr.municipality_id = m.id and tr.status in ('active', 'verified') and tr.expires_at > now()),
           'requests', (select count(*) from public.citizen_requests q where q.municipality_id = m.id and q.is_public and q.status in ('approved', 'in_progress', 'resolved')))
         order by m.name), '[]'::jsonb)
  from public.municipalities m
$$;

-- ---------------------------------------------------------------------
-- 5. Salud de la cola (para /api/v1/health y el monitor de uptime)
-- ---------------------------------------------------------------------
create or replace function public.worker_queue_health()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'pending', (select count(*) from private.jobs where status = 'pending'),
    'oldest_pending_seconds', (select coalesce(extract(epoch from now() - min(run_at))::integer, 0)
                               from private.jobs where status = 'pending' and run_at <= now()),
    'stale_running', (select count(*) from private.jobs where status = 'running' and locked_until < now()),
    'dead', (select count(*) from private.jobs where status = 'dead'));
end $$;

-- ---------------------------------------------------------------------
-- 6. Baja de cuenta (ARCHITECTURE.md §10.8): no deja negocios sin dueño y borra la evidencia privada
-- Se ejecuta al borrar el perfil (en cascada desde auth.users). Si lanza, la baja no ocurre.
-- ---------------------------------------------------------------------
create or replace function private.before_profile_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.business_members bm
    join public.businesses b on b.id = bm.business_id
    where bm.user_id = old.id and bm.member_role = 'owner' and b.deleted_at is null
      and b.status not in ('rejected', 'archived')
      and not exists (select 1 from public.business_members o
                      where o.business_id = bm.business_id and o.member_role = 'owner' and o.user_id <> old.id)) then
    raise exception 'transfer_ownership_first' using errcode = 'P0001',
      hint = 'El usuario es el único dueño de un negocio activo: transferir la propiedad o archivar el negocio antes de la baja';
  end if;
  -- evidencia privada del usuario (fotos de reportes y consultas): se borra el archivo y se marca rechazada
  perform private.enqueue('delete_storage_object', jsonb_build_object('bucket', a.bucket, 'path', a.path), 'del:' || a.path)
  from public.attachments a
  where a.owner_id = old.id and (a.traffic_report_id is not null or a.citizen_request_id is not null);
  update public.attachments set status = 'rejected'
  where owner_id = old.id and (traffic_report_id is not null or citizen_request_id is not null);
  perform private.audit('account.delete', 'profile', old.id, null, null, 'success', old.home_municipality_id);
  return old;
end $$;

create trigger profiles_before_delete before delete on public.profiles
  for each row execute function private.before_profile_delete();

-- ---------------------------------------------------------------------
-- 7. Métricas del comercio: vistas de ficha, "Cómo llegar" y WhatsApp (panel del negocio, KPI de uso)
-- Métrica orientativa: se puede inflar llamando la API, por eso no se usa para decisiones sensibles.
-- Solo cuenta sobre contenido público existente; una fila agregada por día (nunca una por evento).
-- ---------------------------------------------------------------------
create or replace function public.track_engagement(p_entity_type text, p_entity_id uuid, p_metric text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_metric not in ('view', 'directions', 'whatsapp') then return; end if;
  if not (   (p_entity_type = 'business' and exists (select 1 from public.businesses where id = p_entity_id and status = 'approved' and deleted_at is null))
          or (p_entity_type = 'tourism_place' and exists (select 1 from public.tourism_places where id = p_entity_id and status = 'published' and deleted_at is null))
          or (p_entity_type = 'eco_route' and exists (select 1 from public.eco_routes where id = p_entity_id and status = 'published' and deleted_at is null))) then
    return;
  end if;
  insert into public.engagement_daily as e (day, entity_type, entity_id, metric, count)
  values ((now() at time zone 'America/Santo_Domingo')::date, p_entity_type, p_entity_id, p_metric, 1)
  on conflict (entity_type, entity_id, metric, day) do update set count = e.count + 1;
end $$;
