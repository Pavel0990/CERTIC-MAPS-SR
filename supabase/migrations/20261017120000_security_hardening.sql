-- Endurecimiento tras la auditoría de seguridad del 17/10/2026 (SECURITY.md · Auditoría).
-- Dos hallazgos de la base en línea; el resto de la revisión (RLS, grants, funciones, cola) no requirió cambios.

-- 1. Listado del bucket público.
-- Las fotos públicas se sirven por URL pública (/storage/v1/object/public/...), que no pasa por RLS.
-- Esta política solo servía para que cualquiera LISTARA el bucket entero con la clave pública,
-- incluidas rutas de fotos que ya no están vinculadas a ninguna ficha. Sin ella, las URL públicas siguen funcionando.
drop policy if exists public_media_read on storage.objects;

-- 2. Métricas anónimas con techo diario.
-- track_engagement es anónimo a propósito (no identifica al visitante), así que no hay usuario al que limitar.
-- Un techo por ficha, métrica y día acota cuánto puede inflar alguien las cifras del comercio y del informe semanal.
-- 2000 está muy por encima de lo que una ficha de la provincia recibe en un día real.
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
  on conflict (entity_type, entity_id, metric, day) do update set count = e.count + 1
    where e.count < 2000;
end $$;
