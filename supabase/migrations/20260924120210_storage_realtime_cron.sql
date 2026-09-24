-- =====================================================================
-- SR Conecta · 210 · Storage, Realtime (alertas de tránsito en vivo) y tareas programadas
-- Referencia: DATABASE.md §9–§11 · ARCHITECTURE.md §13, §17, §26
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Storage: buckets y políticas
--  · report-evidence (privado): el ciudadano sube SOLO a incoming/{su uid}/…; el worker procesa y mueve
--  · public-media (público): solo escribe el worker (service_role) tras moderación
--  · reports-pdf (privado): solo service_role; descargas con URL firmada desde el servidor
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('report-evidence', 'report-evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('public-media',    'public-media',    true,  5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('reports-pdf',     'reports-pdf',     false, 20971520, array['application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

create policy evidence_upload_own_folder on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence'
              and (storage.foldername(name))[1] = 'incoming'
              and (storage.foldername(name))[2] = (select auth.uid())::text
              and private.upload_quota_ok());   -- máx. 20 subidas por hora

create policy evidence_read_own_or_staff on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence'
         and (((storage.foldername(name))[1] = 'incoming' and (storage.foldername(name))[2] = (select auth.uid())::text)
              or (select private.is_any_staff())));

create policy public_media_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
-- Sin políticas de UPDATE/DELETE para usuarios: el procesamiento y el borrado los hace el worker con service_role.

-- ---------------------------------------------------------------------
-- Realtime: alertas de tránsito en vivo (bases F1 "mapa en tiempo real").
-- Broadcast por provincia con datos públicos únicamente (sin autor, sin fotos).
-- Un fallo del broadcast nunca revierte el cambio del reporte.
-- ---------------------------------------------------------------------
create or replace function private.broadcast_traffic()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
begin
  if new.status in ('active', 'verified', 'resolved', 'expired', 'rejected')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    begin
      perform realtime.send(
        jsonb_build_object('id', new.id, 'type', new.type, 'severity', new.severity, 'status', new.status,
                           'lat', st_y(new.geom), 'lng', st_x(new.geom), 'expires_at', new.expires_at),
        'traffic_changed',
        'traffic:' || new.province_id::text,
        false);
    exception when others then
      raise warning 'broadcast_traffic: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

create trigger traffic_reports_broadcast after insert or update of status on public.traffic_reports
  for each row execute function private.broadcast_traffic();

-- ---------------------------------------------------------------------
-- pg_cron + pg_net (ARCHITECTURE.md §13: pg_cron es obligatorio).
-- Si el entorno no los tiene (p. ej. pruebas locales), la migración no falla.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end $$;

do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null then
    raise notice 'pg_cron no disponible: tareas programadas no registradas';
    return;
  end if;
  perform cron.schedule('sr-wake-worker',       '* * * * *',  'select private.wake_worker()');
  perform cron.schedule('sr-expire-traffic',    '*/15 * * * *', 'select private.expire_traffic_reports()');
  perform cron.schedule('sr-archive-requests',  '15 4 * * *', 'select private.archive_resolved_requests()');
  perform cron.schedule('sr-retention',         '30 4 * * *', 'select private.apply_retention()');
end $$;
