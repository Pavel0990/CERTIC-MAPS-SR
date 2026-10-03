-- =====================================================================
-- SR Conecta · 260 · Entrega del worker: aviso al personal, Web Push y datos de fotos
-- Referencia: ARCHITECTURE.md §9.5, §11.3 · ADR-013, ADR-016
-- Los jobs 'notify_moderators' y 'push' existían en el contrato de la cola, pero el worker no tenía
-- funciones para resolverlos sin leer tablas con service_role. Estas funciones son el único acceso:
-- el worker nunca consulta tablas directamente (ADR-018).
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. notify_moderators: avisa al personal que modera la entidad nueva.
-- Destinatarios: moderadores del municipio y moderadores provinciales. Si no hay ninguno,
-- la administración municipal (o provincial) para que nada quede sin revisar.
-- Reportes fuera de la provincia (sin municipio): solo personal provincial. Nunca se avisa al autor.
-- ---------------------------------------------------------------------
create or replace function public.worker_notify_moderators(p_entity text, p_id uuid)
returns integer
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_muni uuid;
  v_province uuid;
  v_label text;
  v_kind text;
  v_href text;
  v_status text;
  v_author uuid;
  v_user record;
  v_n integer := 0;
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_entity = 'traffic_report' then
    select t.municipality_id, t.province_id, 'Nueva alerta de tránsito: ' || tt.name, t.status, t.reporter_id
      into v_muni, v_province, v_label, v_status, v_author
    from public.traffic_reports t join public.traffic_report_types tt on tt.code = t.type where t.id = p_id;
    v_kind := 'traffic_status'; v_href := '/admin/bandeja';
  elsif p_entity = 'citizen_request' then
    select r.municipality_id, r.province_id, 'Nueva consulta: ' || r.title, r.status, r.requester_id
      into v_muni, v_province, v_label, v_status, v_author
    from public.citizen_requests r where r.id = p_id;
    v_kind := 'request_status'; v_href := '/admin/bandeja';
  elsif p_entity = 'business' then
    select b.municipality_id, b.province_id, 'Negocio por revisar: ' || b.name, b.status, b.created_by
      into v_muni, v_province, v_label, v_status, v_author
    from public.businesses b where b.id = p_id;
    v_kind := 'content_status'; v_href := '/admin/validaciones';
  elsif p_entity = 'promotion' then
    select b.municipality_id, b.province_id, 'Promoción por revisar: ' || pr.title, pr.status, pr.created_by
      into v_muni, v_province, v_label, v_status, v_author
    from public.promotions pr join public.businesses b on b.id = pr.business_id where pr.id = p_id;
    v_kind := 'content_status'; v_href := '/admin/validaciones';
  elsif p_entity = 'tourism_place' then
    select t.municipality_id, t.province_id, 'Lugar propuesto: ' || t.name, t.status, t.proposed_by
      into v_muni, v_province, v_label, v_status, v_author
    from public.tourism_places t where t.id = p_id;
    v_kind := 'content_status'; v_href := '/admin/validaciones';
  elsif p_entity = 'eco_route' then
    select r.municipality_id, r.province_id, 'Ruta propuesta: ' || r.name, r.status, r.proposed_by
      into v_muni, v_province, v_label, v_status, v_author
    from public.eco_routes r where r.id = p_id;
    v_kind := 'content_status'; v_href := '/admin/validaciones';
  else
    return 0;   -- entidad desconocida: nada que avisar (el job termina bien, no se reintenta)
  end if;

  -- borrada o ya revisada antes de que corriera el worker: no se molesta a nadie
  if v_province is null or v_status not in ('pending', 'active', 'out_of_area') then return 0; end if;

  for v_user in
    with staff as (
      select distinct ur.user_id, ur.role
      from public.user_roles ur
      where ur.province_id = v_province
        and ur.role in ('moderator', 'municipal_admin')
        and (ur.municipality_id is null or (v_muni is not null and ur.municipality_id = v_muni))
    )
    select distinct s.user_id from staff s
    where s.user_id is distinct from v_author   -- nadie recibe aviso de lo que él mismo creó
      and (s.role = 'moderator' or not exists (select 1 from staff m where m.role = 'moderator'))
  loop
    perform private.notify(v_user.user_id, v_kind, left(v_label, 120), 'Toca para revisarlo en el panel.',
                           jsonb_build_object('entity', p_entity, 'id', p_id, 'href', v_href, 'staff', true));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------
-- 2. push: qué enviar y a qué dispositivos. Solo notificaciones con push pendiente.
-- ---------------------------------------------------------------------
create or replace function public.worker_push_payload(p_notification_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case when not private.is_service() then null else (
    select jsonb_build_object(
             'id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'payload', n.payload,
             'subscriptions', coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
                                        from public.push_subscriptions s where s.user_id = n.user_id), '[]'::jsonb))
    from public.notifications n
    where n.id = p_notification_id and n.push_status = 'pending')
  end
$$;

-- Resultado del envío: marca la notificación, sella las suscripciones que funcionaron
-- y elimina las que el servicio de push dio por muertas (404/410).
create or replace function public.worker_push_result(p_notification_id uuid, p_sent boolean,
                                                     p_ok_endpoints text[] default '{}', p_gone_endpoints text[] default '{}')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not private.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.notifications set push_status = case when p_sent then 'sent' else 'failed' end
  where id = p_notification_id and push_status = 'pending'
  returning user_id into v_user;
  if v_user is null then return; end if;
  update public.push_subscriptions set last_success_at = now()
  where user_id = v_user and endpoint = any (coalesce(p_ok_endpoints, '{}'));
  delete from public.push_subscriptions
  where user_id = v_user and endpoint = any (coalesce(p_gone_endpoints, '{}'));
end $$;

-- ---------------------------------------------------------------------
-- 3. Fotos: dónde está el archivo que hay que procesar o publicar (image_process, publish_media).
-- 'public' indica si la foto puede llegar a public-media (negocios, lugares y rutas, nunca evidencia).
-- ---------------------------------------------------------------------
create or replace function public.worker_attachment_info(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case when not private.is_service() then null else (
    select jsonb_build_object('id', a.id, 'bucket', a.bucket, 'path', a.path, 'status', a.status, 'mime', a.mime,
                              'public', (a.business_id is not null or a.tourism_place_id is not null or a.eco_route_id is not null))
    from public.attachments a where a.id = p_id)
  end
$$;

revoke all on function public.worker_attachment_info(uuid) from public, anon, authenticated;
revoke all on function public.worker_notify_moderators(text, uuid) from public, anon, authenticated;
revoke all on function public.worker_push_payload(uuid) from public, anon, authenticated;
revoke all on function public.worker_push_result(uuid, boolean, text[], text[]) from public, anon, authenticated;
grant execute on function
  public.worker_attachment_info(uuid),
  public.worker_notify_moderators(text, uuid),
  public.worker_push_payload(uuid),
  public.worker_push_result(uuid, boolean, text[], text[])
to service_role;
