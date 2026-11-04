-- Puntos calientes: dónde se concentran las alertas de tránsito y los reportes de los vecinos
-- (rúbrica: innovación con geolocalización). Capa de calor del mapa y apoyo para decidir dónde
-- intervenir primero.
--
-- Privacidad: nunca devuelve la ubicación de un reporte. Agrupa en cuadros de ~550 m (0,005°) y
-- solo entrega los cuadros con 2 reportes o más, con el centro del cuadro. Solo cuenta lo que ya fue
-- público: alertas publicadas (activas, verificadas, resueltas o vencidas) y consultas públicas
-- aprobadas. Nada pendiente, rechazado ni privado.
-- security definer: anon no ve las alertas vencidas por RLS, pero aquí solo salen conteos agregados.

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
    where tr.status in ('active', 'verified', 'resolved', 'expired')
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

comment on function public.report_hotspots(integer) is
  'Cuadros de ~550 m con 2 o más alertas o reportes públicos en los últimos p_days días (7–365). Solo conteos y el centro del cuadro.';

revoke all on function public.report_hotspots(integer) from public;
grant execute on function public.report_hotspots(integer) to anon, authenticated;
