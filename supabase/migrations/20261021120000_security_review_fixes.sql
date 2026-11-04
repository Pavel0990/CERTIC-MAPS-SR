-- =====================================================================
-- SR Conecta · Correcciones de la revisión de seguridad del 21/10/2026 (SECURITY.md · Auditoría del 21/10).
-- Ningún hallazgo crítico ni alto; esto cierra los medios y bajos que dependen de la base.
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Subidas de evidencia: el tope de 20 por hora ya no se puede saltar pidiendo muchas URLs firmadas.
--    Antes la política contaba objetos ya subidos, pero firmar una URL no crea ninguno: se podían pedir cientos.
--    Ahora cada ruta es un permiso de un solo uso que da una RPC con límite (20 por hora); sin permiso no hay subida.
-- ---------------------------------------------------------------------
create table private.upload_grants (
  path        text primary key,
  user_id     uuid not null,
  created_at  timestamptz not null default now()
);
create index upload_grants_user_idx on private.upload_grants (user_id, created_at);

insert into private.rate_limit_rules (action, max_count, window_size) values ('upload_sign', 20, interval '1 hour')
on conflict (action) do nothing;

create or replace function public.request_upload(p_ext text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_path text;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if p_ext is null or p_ext not in ('jpg', 'png', 'webp') then return private.reject('invalid_file'); end if;
  if not private.hit_rate_limit('upload_sign') then return private.reject('rate_limited'); end if;
  -- limpieza de permisos viejos de esta persona (la URL firmada dura 2 horas)
  delete from private.upload_grants where user_id = v_uid and created_at < now() - interval '1 day';
  v_path := 'incoming/' || v_uid::text || '/' || gen_random_uuid()::text || '.' || p_ext;
  insert into private.upload_grants (path, user_id) values (v_path, v_uid);
  return jsonb_build_object('status', 'ok', 'path', v_path);
end $$;
revoke all on function public.request_upload(text) from public, anon;
grant execute on function public.request_upload(text) to authenticated;

create or replace function private.upload_granted(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.upload_grants g
                 where g.path = p_name and g.user_id = (select auth.uid()) and g.created_at > now() - interval '3 hours')
$$;
revoke all on function private.upload_granted(text) from public;
grant execute on function private.upload_granted(text) to authenticated;

drop policy if exists evidence_upload_own_folder on storage.objects;
create policy evidence_upload_own_folder on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence'
              and (storage.foldername(name))[1] = 'incoming'
              and (storage.foldername(name))[2] = (select auth.uid())::text
              and private.upload_granted(name)
              and private.upload_quota_ok());

-- ---------------------------------------------------------------------
-- 2. Evidencia privada: el personal solo ve la de SU municipio (antes, cualquier moderador veía la de toda la provincia).
-- ---------------------------------------------------------------------
create or replace function private.attachment_municipality(p_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select coalesce(b.municipality_id, p.municipality_id, r.municipality_id, t.municipality_id, c.municipality_id)
  from public.attachments a
  left join public.businesses b on b.id = a.business_id
  left join public.tourism_places p on p.id = a.tourism_place_id
  left join public.eco_routes r on r.id = a.eco_route_id
  left join public.traffic_reports t on t.id = a.traffic_report_id
  left join public.citizen_requests c on c.id = a.citizen_request_id
  where a.id = p_id
$$;
revoke all on function private.attachment_municipality(uuid) from public;
-- anon también: la política de lectura de attachments (que anon usa para ver fotos públicas) la evalúa.
-- El esquema private no se expone en la API, así que nadie la llama directamente.
grant execute on function private.attachment_municipality(uuid) to anon, authenticated;

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to anon, authenticated
  using ((bucket = 'public-media' and status = 'approved')
         or owner_id = (select auth.uid())
         or private.is_staff(private.attachment_municipality(id)));

create or replace function private.can_read_evidence(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.attachments a
                 where a.bucket = 'report-evidence' and a.path = p_name
                   and private.is_staff(private.attachment_municipality(a.id)))
$$;
revoke all on function private.can_read_evidence(text) from public;
grant execute on function private.can_read_evidence(text) to authenticated;

drop policy if exists evidence_read_own_or_staff on storage.objects;
create policy evidence_read_own_or_staff on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence'
         and (((storage.foldername(name))[1] = 'incoming' and (storage.foldername(name))[2] = (select auth.uid())::text)
              or private.can_read_evidence(name)));

-- ---------------------------------------------------------------------
-- 3. Negocio aprobado: si su dueño cambia el NOMBRE o la WEB, vuelve a revisión antes de salir así en el mapa.
--    (Evita suplantaciones y enlaces de estafa publicados sin que nadie los vea.) Teléfono, WhatsApp, correo,
--    dirección y descripción siguen siendo cambios directos, pero avisan al personal.
-- ---------------------------------------------------------------------
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
  v_staff boolean;
  v_rereview boolean := false;
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
  v_staff := private.is_staff(b.municipality_id);
  if not (private.is_business_member(p_id) or v_staff) then
    return private.reject('forbidden');
  end if;
  if b.status in ('archived', 'rejected') then return private.reject('not_editable'); end if;

  if not v_staff and b.status = 'approved' then
    v_rereview := (p_changes ? 'name' and btrim(p_changes ->> 'name') is distinct from b.name)
               or (p_changes ? 'website' and nullif(btrim(p_changes ->> 'website'), '') is distinct from b.website);
  end if;

  update public.businesses set
    name        = case when p_changes ? 'name'        then btrim(p_changes ->> 'name') else name end,
    description = case when p_changes ? 'description' then nullif(btrim(p_changes ->> 'description'), '') else description end,
    phone       = case when p_changes ? 'phone'       then nullif(btrim(p_changes ->> 'phone'), '') else phone end,
    whatsapp    = case when p_changes ? 'whatsapp'    then nullif(btrim(p_changes ->> 'whatsapp'), '') else whatsapp end,
    email       = case when p_changes ? 'email'       then nullif(btrim(p_changes ->> 'email'), '') else email end,
    website     = case when p_changes ? 'website'     then nullif(btrim(p_changes ->> 'website'), '') else website end,
    address     = case when p_changes ? 'address'     then nullif(btrim(p_changes ->> 'address'), '') else address end,
    google_place_id = case when p_changes ? 'google_place_id' then nullif(btrim(p_changes ->> 'google_place_id'), '') else google_place_id end,
    status      = case when v_rereview then 'under_review' else status end
  where id = p_id and version = p_version;
  if not found then
    return private.reject('version_conflict', jsonb_build_object('current_version', (select version from public.businesses where id = p_id)));
  end if;
  if not v_staff then
    perform private.enqueue('notify_moderators', jsonb_build_object('entity', 'business', 'id', p_id));
  end if;
  perform private.audit('business.update', 'business', p_id, null, p_changes || jsonb_build_object('rereview', v_rereview), 'success', b.municipality_id);
  return jsonb_build_object('status', 'ok', 'id', p_id, 'version', p_version + 1,
                            'business_status', case when v_rereview then 'under_review' else b.status end);
exception when check_violation then
  return private.reject('invalid_field');
end $$;

-- ---------------------------------------------------------------------
-- 4. Avisos push: solo a servidores de push reales (antes cualquier https://, y el worker les enviaba un POST).
--    Y el alta pasa solo por register_push_device (con su límite), no por escritura directa en la tabla.
-- ---------------------------------------------------------------------
create or replace function private.is_push_endpoint(p_endpoint text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com)/'
$$;
alter table public.push_subscriptions add constraint push_subscriptions_known_service
  check (private.is_push_endpoint(endpoint)) not valid;
drop policy if exists push_subs_insert_own on public.push_subscriptions;
revoke insert on public.push_subscriptions from authenticated;

-- ---------------------------------------------------------------------
-- 5. Foto de perfil
--    · iPhone: Safari no codifica WebP desde el canvas; se acepta también JPEG (misma ruta, mismo tope de 64 KB).
--    · Quitar la foto no consume el límite de cambios: siempre se puede quitar.
-- ---------------------------------------------------------------------
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg'] where id = 'avatars';

create or replace function public.set_avatar(p_present boolean)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_version smallint;
begin
  if v_uid is null then return private.reject('auth_required'); end if;
  if p_present is null then return private.reject('invalid_input'); end if;
  if p_present then
    if not private.hit_rate_limit('avatar_update') then return private.reject('rate_limited'); end if;
    if not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = v_uid::text || '.webp') then
      return private.reject('avatar_missing');
    end if;
  end if;
  update public.profiles
     set avatar_version = case when p_present then coalesce(avatar_version, 0) % 32000 + 1 end
   where id = v_uid
  returning avatar_version into v_version;
  if not found then return private.reject('not_found'); end if;
  return jsonb_build_object('status', 'ok', 'avatar_version', v_version);
end $$;

-- ---------------------------------------------------------------------
-- 6. Baja de cuenta: la foto de perfil se borra siempre (antes solo si estaba registrada).
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
  -- foto de perfil: siempre, aunque no esté registrada (si un borrado anterior falló, el archivo quedó huérfano).
  -- Borrar un archivo que no existe no es un error.
  perform private.enqueue('delete_storage_object', jsonb_build_object('bucket', 'avatars', 'path', old.id::text || '.webp'),
                          'del:avatars/' || old.id::text);
  perform private.audit('account.delete', 'profile', old.id, null, null, 'success', old.home_municipality_id);
  return old;
end $$;
