-- =====================================================================
-- SR Conecta · 110 · RPC de contenido: negocios, promociones, lugares, rutas, moderación y roles
-- Referencia: DATABASE.md §6 · ARCHITECTURE.md §16, §22, §23 · Bases F1, F2, F3
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Negocios
-- ---------------------------------------------------------------------
create or replace function public.submit_business(
  p_name text, p_category_slug text, p_lat double precision, p_lng double precision, p_idempotency_key text,
  p_description text default null, p_phone text default null, p_whatsapp text default null,
  p_email text default null, p_website text default null, p_address text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_cat uuid;
  v_geom geometry;
  v_muni uuid;
  v_prov uuid;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 64 then
    return private.reject('invalid_idempotency_key');
  end if;
  select id into v_id from public.businesses where created_by = v_uid and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('status', 'ok', 'id', v_id, 'duplicate', true); end if;
  if not private.hit_rate_limit('business_submit') then return private.reject('rate_limited'); end if;

  select id into v_cat from public.business_categories where slug = p_category_slug and active;
  if not found then return private.reject('invalid_category'); end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 then return private.reject('invalid_name'); end if;
  v_geom := private.make_point(p_lat, p_lng);
  if v_geom is null then return private.reject('invalid_coordinates'); end if;
  select l.municipality_id, l.province_id into v_muni, v_prov from private.locate(v_geom) l;
  if v_muni is null then return private.reject('out_of_area'); end if;

  insert into public.businesses (province_id, municipality_id, category_id, slug, name, description, geom,
                                 phone, whatsapp, email, website, address, status, created_by, idempotency_key)
  values (v_prov, v_muni, v_cat,
          left(coalesce(private.slugify(p_name), 'negocio'), 80) || '-' || substr(md5(gen_random_uuid()::text), 1, 5),
          btrim(p_name), nullif(btrim(p_description), ''), v_geom,
          nullif(btrim(p_phone), ''), nullif(btrim(p_whatsapp), ''), nullif(btrim(p_email), ''),
          nullif(btrim(p_website), ''), nullif(btrim(p_address), ''), 'pending', v_uid, p_idempotency_key)
  returning id into v_id;
  insert into public.business_members (business_id, user_id, member_role) values (v_id, v_uid, 'owner');
  perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'business', 'id', v_id));
  perform private.audit('business.submit', 'business', v_id, null, jsonb_build_object('name', btrim(p_name)), 'success', v_muni);
  return jsonb_build_object('status', 'ok', 'id', v_id, 'business_status', 'pending');
exception
  when check_violation then return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
  when unique_violation then
    select id into v_id from public.businesses where created_by = v_uid and idempotency_key = p_idempotency_key;
    if v_id is null then return private.reject('conflict'); end if;
    return jsonb_build_object('status', 'ok', 'id', v_id, 'duplicate', true);
end $$;

-- Edición con lista blanca de campos (sin asignación masiva) y bloqueo optimista por versión
create or replace function public.update_business(p_id uuid, p_version integer, p_changes jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  b public.businesses;
  v_allowed constant text[] := array['name', 'description', 'phone', 'whatsapp', 'email', 'website', 'address', 'google_place_id'];
  v_unknown text[];
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('business_update') then return private.reject('rate_limited'); end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    return private.reject('no_changes');
  end if;
  select array_agg(k) into v_unknown from jsonb_object_keys(p_changes) k where k <> all (v_allowed);
  if v_unknown is not null then return private.reject('unknown_field', jsonb_build_object('fields', v_unknown)); end if;

  select * into b from public.businesses where id = p_id and deleted_at is null;
  if not found then return private.reject('not_found'); end if;
  if not (private.is_business_member(p_id) or private.is_staff(b.municipality_id)) then
    return private.reject('forbidden');
  end if;
  if b.status in ('archived', 'rejected') then return private.reject('not_editable'); end if;

  update public.businesses set
    name        = case when p_changes ? 'name'        then btrim(p_changes ->> 'name') else name end,
    description = case when p_changes ? 'description' then nullif(btrim(p_changes ->> 'description'), '') else description end,
    phone       = case when p_changes ? 'phone'       then nullif(btrim(p_changes ->> 'phone'), '') else phone end,
    whatsapp    = case when p_changes ? 'whatsapp'    then nullif(btrim(p_changes ->> 'whatsapp'), '') else whatsapp end,
    email       = case when p_changes ? 'email'       then nullif(btrim(p_changes ->> 'email'), '') else email end,
    website     = case when p_changes ? 'website'     then nullif(btrim(p_changes ->> 'website'), '') else website end,
    address     = case when p_changes ? 'address'     then nullif(btrim(p_changes ->> 'address'), '') else address end,
    google_place_id = case when p_changes ? 'google_place_id' then nullif(btrim(p_changes ->> 'google_place_id'), '') else google_place_id end
  where id = p_id and version = p_version;
  if not found then
    return private.reject('version_conflict', jsonb_build_object('current_version', (select version from public.businesses where id = p_id)));
  end if;
  perform private.audit('business.update', 'business', p_id, null, p_changes, 'success', b.municipality_id);
  return jsonb_build_object('status', 'ok', 'id', p_id, 'version', p_version + 1);
exception when check_violation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- Reemplaza el horario completo. p_hours: [{"weekday":1,"opens":"08:00","closes":"17:00"}, ...]
create or replace function public.set_business_hours(p_business_id uuid, p_hours jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_muni uuid;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('business_update') then return private.reject('rate_limited'); end if;
  select municipality_id into v_muni from public.businesses where id = p_business_id and deleted_at is null;
  if not found then return private.reject('not_found'); end if;
  if not (private.is_business_member(p_business_id) or private.is_staff(v_muni)) then return private.reject('forbidden'); end if;
  if jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 21 then return private.reject('invalid_hours'); end if;

  delete from public.business_hours where business_id = p_business_id;
  insert into public.business_hours (business_id, weekday, opens, closes)
  select p_business_id, (h ->> 'weekday')::smallint, (h ->> 'opens')::time, (h ->> 'closes')::time
  from jsonb_array_elements(p_hours) h;
  perform private.audit('business.hours', 'business', p_business_id, null, p_hours, 'success', v_muni);
  return jsonb_build_object('status', 'ok', 'count', jsonb_array_length(p_hours));
exception when check_violation or unique_violation or invalid_datetime_format or invalid_text_representation
               or datetime_field_overflow or not_null_violation then
  return private.reject('invalid_hours', jsonb_build_object('detail', sqlerrm));
end $$;

create or replace function public.create_promotion(
  p_business_id uuid, p_title text, p_valid_from date, p_valid_until date, p_description text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_status text;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('business_update') then return private.reject('rate_limited'); end if;
  select status into v_status from public.businesses where id = p_business_id and deleted_at is null;
  if not found then return private.reject('not_found'); end if;
  if not private.is_business_member(p_business_id) then return private.reject('forbidden'); end if;
  if v_status <> 'approved' then return private.reject('business_not_approved'); end if;
  if p_valid_from < current_date then return private.reject('invalid_dates'); end if;
  insert into public.promotions (business_id, title, description, valid_from, valid_until, created_by)
  values (p_business_id, btrim(p_title), nullif(btrim(p_description), ''), p_valid_from, p_valid_until, v_uid)
  returning id into v_id;
  perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'promotion', 'id', v_id));
  return jsonb_build_object('status', 'ok', 'id', v_id, 'promotion_status', 'pending');
exception when check_violation or not_null_violation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- ---------------------------------------------------------------------
-- Propuestas ciudadanas (F1 "agregar puntos de interés", F3 "trazado de rutas")
-- El personal publica directo; el resto queda pendiente de moderación.
-- ---------------------------------------------------------------------
create or replace function public.propose_place(
  p_name text, p_kind text, p_lat double precision, p_lng double precision, p_description text default null)
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
  v_status text;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('proposal_create') then return private.reject('rate_limited'); end if;
  v_geom := private.make_point(p_lat, p_lng);
  if v_geom is null then return private.reject('invalid_coordinates'); end if;
  select l.municipality_id, l.province_id into v_muni, v_prov from private.locate(v_geom) l;
  if v_muni is null then return private.reject('out_of_area'); end if;
  v_status := case when private.is_staff(v_muni) then 'published' else 'pending' end;
  insert into public.tourism_places (province_id, municipality_id, slug, name, kind, description, geom, status, proposed_by,
                                     reviewed_by)
  values (v_prov, v_muni, left(coalesce(private.slugify(p_name), 'lugar'), 80) || '-' || substr(md5(gen_random_uuid()::text), 1, 5),
          btrim(p_name), p_kind, nullif(btrim(p_description), ''), v_geom, v_status, v_uid,
          case when v_status = 'published' then v_uid end)
  returning id into v_id;
  if v_status = 'pending' then
    perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'tourism_place', 'id', v_id));
  end if;
  return jsonb_build_object('status', 'ok', 'id', v_id, 'place_status', v_status);
exception when check_violation or not_null_violation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- p_geojson: LineString o MultiLineString (trazado en el mapa o GPX convertido en el cliente)
create or replace function public.propose_route(
  p_name text, p_kind text, p_difficulty text, p_duration_min integer, p_geojson jsonb, p_description text default null)
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
  v_status text;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('proposal_create') then return private.reject('rate_limited'); end if;
  if p_geojson is null or p_geojson ->> 'type' not in ('LineString', 'MultiLineString') then
    return private.reject('invalid_geometry');
  end if;
  begin
    v_geom := st_multi(st_setsrid(st_geomfromgeojson(p_geojson::text), 4326));
  exception when others then
    return private.reject('invalid_geometry');
  end;
  if not st_isvalid(v_geom) or st_npoints(v_geom) not between 2 and 5000 then return private.reject('invalid_geometry'); end if;
  select l.municipality_id, l.province_id into v_muni, v_prov from private.locate(st_startpoint(st_geometryn(v_geom, 1))) l;
  if v_muni is null then return private.reject('out_of_area'); end if;
  v_status := case when private.is_staff(v_muni) then 'published' else 'pending' end;
  insert into public.eco_routes (province_id, municipality_id, slug, name, kind, difficulty, duration_min, description,
                                 geom, status, proposed_by, reviewed_by)
  values (v_prov, v_muni, left(coalesce(private.slugify(p_name), 'ruta'), 80) || '-' || substr(md5(gen_random_uuid()::text), 1, 5),
          btrim(p_name), p_kind, p_difficulty, p_duration_min, nullif(btrim(p_description), ''), v_geom, v_status,
          v_uid, case when v_status = 'published' then v_uid end)
  returning id into v_id;
  if v_status = 'pending' then
    perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'eco_route', 'id', v_id));
  end if;
  return jsonb_build_object('status', 'ok', 'id', v_id, 'route_status', v_status);
exception when check_violation or not_null_violation then
  return private.reject('invalid_field', jsonb_build_object('detail', sqlerrm));
end $$;

-- ---------------------------------------------------------------------
-- Moderación genérica de contenido (compare-and-set sobre el estado)
-- Sin SQL dinámico: una rama explícita por entidad.
-- ---------------------------------------------------------------------
create or replace function public.review_content(
  p_entity text, p_id uuid, p_expected_status text, p_to text, p_reason text default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_muni uuid;
  v_owner uuid;
  v_title text;
  v_rows integer;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('staff_action') then return private.reject('rate_limited'); end if;
  if not exists (select 1 from private.content_transitions t
                 where t.entity = p_entity and t.from_status = p_expected_status and t.to_status = p_to) then
    return private.reject('invalid_transition');
  end if;
  if p_to in ('rejected', 'suspended') and coalesce(btrim(p_reason), '') = '' then return private.reject('reason_required'); end if;

  if p_entity = 'business' then
    select municipality_id, created_by, name into v_muni, v_owner, v_title from public.businesses where id = p_id;
  elsif p_entity = 'place' then
    select municipality_id, proposed_by, name into v_muni, v_owner, v_title from public.tourism_places where id = p_id;
  elsif p_entity = 'route' then
    select municipality_id, proposed_by, name into v_muni, v_owner, v_title from public.eco_routes where id = p_id;
  elsif p_entity = 'promotion' then
    select b.municipality_id, p.created_by, p.title into v_muni, v_owner, v_title
    from public.promotions p join public.businesses b on b.id = p.business_id where p.id = p_id;
  elsif p_entity = 'attachment' then
    -- solo se publican fotos de contenido público; la evidencia de reportes y consultas nunca es pública
    select coalesce(b.municipality_id, t.municipality_id, r.municipality_id), a.owner_id, 'Foto'
      into v_muni, v_owner, v_title
    from public.attachments a
    left join public.businesses b on b.id = a.business_id
    left join public.tourism_places t on t.id = a.tourism_place_id
    left join public.eco_routes r on r.id = a.eco_route_id
    where a.id = p_id;
    if v_muni is null and exists (select 1 from public.attachments where id = p_id) then
      return private.reject('not_publishable');
    end if;
  end if;
  if v_muni is null then return private.reject('not_found'); end if;
  if not private.is_staff(v_muni) then
    perform private.audit('content.review', p_entity, p_id, null, jsonb_build_object('to', p_to), 'denied', v_muni);
    return private.reject('forbidden');
  end if;

  if p_entity = 'business' then
    update public.businesses set status = p_to, status_reason = case when p_to in ('rejected', 'suspended') then btrim(p_reason) else null end
    where id = p_id and status = p_expected_status;
  elsif p_entity = 'place' then
    update public.tourism_places set status = p_to, reviewed_by = v_uid,
           status_reason = case when p_to = 'rejected' then btrim(p_reason) else status_reason end
    where id = p_id and status = p_expected_status;
  elsif p_entity = 'route' then
    update public.eco_routes set status = p_to, reviewed_by = v_uid,
           status_reason = case when p_to = 'rejected' then btrim(p_reason) else status_reason end
    where id = p_id and status = p_expected_status;
  elsif p_entity = 'promotion' then
    update public.promotions set status = p_to where id = p_id and status = p_expected_status;
  else
    update public.attachments set status = p_to where id = p_id and status = p_expected_status;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return private.reject('stale_state'); end if;

  -- Un negocio aprobado convierte a sus dueños en emprendedores (rol automático, nunca autoasignado)
  if p_entity = 'business' and p_to = 'approved' then
    insert into public.user_roles (user_id, role, province_id, granted_by)
    select bm.user_id, 'entrepreneur', m.province_id, v_uid
    from public.business_members bm join public.municipalities m on m.id = v_muni
    where bm.business_id = p_id and bm.member_role = 'owner'
    on conflict on constraint user_roles_scope_unique do nothing;
  end if;

  -- Suspender o archivar un negocio pausa sus promociones activas (dejan de mostrarse y quedan registradas)
  if p_entity = 'business' and p_to in ('suspended', 'archived') then
    update public.promotions set status = 'paused' where business_id = p_id and status = 'active';
  end if;
  -- Foto aprobada: el worker la copia al bucket público
  if p_entity = 'attachment' and p_to = 'approved' then
    perform private.enqueue('publish_media', jsonb_build_object('attachment_id', p_id), 'publish:' || p_id);
  end if;

  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, from_status, to_status, reason)
  values (v_uid, case p_entity when 'place' then 'tourism_place' when 'route' then 'eco_route' else p_entity end,
          p_id, 'status_change', p_expected_status, p_to, nullif(btrim(p_reason), ''));
  perform private.audit('content.review', p_entity, p_id, jsonb_build_object('status', p_expected_status),
                        jsonb_build_object('status', p_to), 'success', v_muni);
  perform private.notify(v_owner, 'content_status', left('«' || v_title || '» cambió de estado', 120),
                         case when p_to in ('rejected', 'suspended') then 'Motivo: ' || btrim(p_reason) else 'Nuevo estado: ' || p_to end,
                         jsonb_build_object('entity', p_entity, 'id', p_id, 'status', p_to));
  return jsonb_build_object('status', 'ok', 'id', p_id, 'content_status', p_to);
end $$;

-- ---------------------------------------------------------------------
-- Roles (ARCHITECTURE.md §16, ADR-020). El administrador provincial solo se crea por script de operación.
-- ---------------------------------------------------------------------
create or replace function public.assign_role(p_user_id uuid, p_role text, p_municipality_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_prov uuid;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('role_change') then return private.reject('rate_limited'); end if;
  if p_role not in ('moderator', 'municipal_admin') then return private.reject('role_not_assignable'); end if;
  if p_municipality_id is null then return private.reject('provincial_scope_requires_operation_script'); end if;
  select province_id into v_prov from public.municipalities where id = p_municipality_id;
  if not found then return private.reject('invalid_municipality'); end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then return private.reject('user_not_found'); end if;
  if (p_role = 'moderator' and not private.is_admin(p_municipality_id))
     or (p_role = 'municipal_admin' and not private.is_provincial_admin()) then
    perform private.audit('role.grant', 'user_role', null, null, jsonb_build_object('user', p_user_id, 'role', p_role), 'denied', p_municipality_id);
    return private.reject('forbidden');
  end if;
  insert into public.user_roles (user_id, role, province_id, municipality_id, granted_by)
  values (p_user_id, p_role, v_prov, p_municipality_id, v_uid)
  on conflict on constraint user_roles_scope_unique do nothing;
  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, reason)
  values (v_uid, 'user_role', p_user_id, 'grant', p_role || ' @ ' || p_municipality_id);
  perform private.audit('role.grant', 'user_role', p_user_id, null, jsonb_build_object('role', p_role), 'success', p_municipality_id);
  return jsonb_build_object('status', 'ok');
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
  insert into public.moderation_actions (moderator_id, entity_type, entity_id, action, reason)
  values (v_uid, 'user_role', p_user_id, 'revoke', p_role || ' @ ' || p_municipality_id);
  perform private.audit('role.revoke', 'user_role', p_user_id, jsonb_build_object('role', p_role), null, 'success', p_municipality_id);
  return jsonb_build_object('status', 'ok');
end $$;
