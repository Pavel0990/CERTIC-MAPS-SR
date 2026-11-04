-- =====================================================================
-- SR Conecta · Foto de perfil (avatar), con el menor consumo posible de Supabase.
--
-- Diseño (por qué gasta tan poco):
--  · El teléfono recorta y comprime la foto a 256×256 en WebP (~10-15 KB) antes de subirla:
--    el servidor no procesa nada, no hay job de la cola ni fila en attachments.
--  · Una sola foto por persona, siempre en la misma ruta: avatars/{uid}.webp. Cambiarla sobrescribe
--    el archivo, así nunca quedan fotos huérfanas que borrar ni almacenamiento que crezca.
--  · Bucket público: la foto se sirve por URL pública desde la CDN de Supabase, sin firmar URLs ni
--    pasar por la base. La URL lleva ?v={avatar_version}: el archivo se cachea un año y cada cambio
--    pide una URL nueva, así que la CDN casi nunca vuelve al origen.
--  · Tope duro en el bucket: 64 KB y solo image/webp. Aunque alguien salte la app, no puede subir más.
--  · Sin política de listado: nadie puede enumerar el bucket (igual que public-media, ver 20261017120000).
-- =====================================================================
set search_path = public, extensions;

-- 1. Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 65536, array['image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- 2. Cada persona solo escribe SU archivo. La subida usa upsert, que necesita insertar, leer y actualizar.
--    Leer solo el propio archivo: no permite listar el bucket.
--    Actualizar como máximo cada 10 segundos: frena a quien intente subir en bucle.
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp'
         and coalesce(updated_at, created_at) < now() - interval '10 seconds')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');

-- 3. Versión de la foto en el perfil (NULL = sin foto). Solo cambia por la RPC, que comprueba que el archivo exista.
alter table public.profiles add column avatar_version smallint check (avatar_version between 1 and 32000);
grant select (avatar_version) on public.profiles to authenticated;

insert into private.rate_limit_rules (action, max_count, window_size) values ('avatar_update', 10, interval '1 hour')
on conflict (action) do nothing;

-- 4. set_avatar(true) después de subir; set_avatar(false) después de borrar el archivo.
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
  if not private.hit_rate_limit('avatar_update') then return private.reject('rate_limited'); end if;
  if p_present and not exists (select 1 from storage.objects
                               where bucket_id = 'avatars' and name = v_uid::text || '.webp') then
    return private.reject('avatar_missing');
  end if;
  update public.profiles
     set avatar_version = case when p_present then coalesce(avatar_version, 0) % 32000 + 1 end
   where id = v_uid
  returning avatar_version into v_version;
  if not found then return private.reject('not_found'); end if;
  return jsonb_build_object('status', 'ok', 'avatar_version', v_version);
end $$;

revoke all on function public.set_avatar(boolean) from public, anon;
grant execute on function public.set_avatar(boolean) to authenticated;

-- 5. Baja de cuenta: también se borra la foto de perfil (misma función que antes, más la foto).
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
  -- foto de perfil
  if old.avatar_version is not null then
    perform private.enqueue('delete_storage_object', jsonb_build_object('bucket', 'avatars', 'path', old.id::text || '.webp'),
                            'del:avatars/' || old.id::text);
  end if;
  perform private.audit('account.delete', 'profile', old.id, null, null, 'success', old.home_municipality_id);
  return old;
end $$;
