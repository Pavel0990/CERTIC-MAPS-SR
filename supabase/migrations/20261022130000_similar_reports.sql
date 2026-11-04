-- =====================================================================
-- SR Conecta · Aviso de reporte parecido cercano (ESTADO-Y-PENDIENTES §5.4 · DATABASE.md §5.23).
--
-- Antes de enviar una alerta de tránsito o un reporte al municipio, el asistente pregunta si ya hay uno
-- abierto del mismo tipo a menos de 150 m: "Ya hay un reporte parecido aquí. ¿Quieres apoyarlo en lugar
-- de crear otro?". Menos duplicados en la bandeja y más apoyos en el reporte que ya existe.
--
-- Barreras (ADR-018):
--  · solo authenticated la ejecuta (nunca anon); límite de 60 consultas por hora (similar_report_check);
--  · devuelve solo lo que la persona ya puede ver: alertas vigentes del mapa público o propias, y reportes
--    al municipio públicos y abiertos, o propios. La existencia de un reporte privado de otra persona
--    nunca se revela (ni siquiera como "hay uno, pero no lo puedes ver");
--  · por cada resultado: id, tipo, distancia en metros redondeada y, en los reportes al municipio, cuántos
--    apoyos tiene. Más tres datos sobre la propia persona que llama (mine, can_support, supported), para
--    que la interfaz no ofrezca "Apoyarlo" en un reporte propio ni quite un apoyo ya dado (el voto es un
--    interruptor). Nunca autor, descripción, título, fotos ni coordenadas;
--  · mismo municipio en el que caería el reporte nuevo (private.locate): cada ayuntamiento tiene su bandeja;
--  · como mucho 3 resultados, del más cercano al más lejano.
--
-- Ventana de "reciente":
--  · tránsito: mientras la alerta siga vigente (expires_at > now()). La vigencia ya es la vida útil de cada
--    tipo (3 horas un accidente, 7 días un bache; como máximo 30 días por el CHECK del catálogo): una alerta
--    vencida ya no está en el mapa y no tiene sentido "apoyarla";
--  · reportes al municipio: abiertos y creados en los últimos 90 días. Un bache o una luz apagada pueden
--    tardar semanas en arreglarse y siguen siendo el mismo problema; uno abierto hace más de 3 meses casi
--    siempre está olvidado o se resolvió fuera de la app, y un reporte nuevo vuelve a llamar la atención.
-- =====================================================================
set search_path = public, extensions;

insert into private.rate_limit_rules (action, max_count, window_size) values ('similar_report_check', 60, interval '1 hour')
on conflict (action) do nothing;

create or replace function public.find_similar_reports(
  p_kind text, p_type text, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_geom geometry;
  v_geog geography;
  v_muni uuid;
  v_items jsonb;
begin
  if v_uid is null then return private.reject('not_authenticated'); end if;
  if not private.hit_rate_limit('similar_report_check') then return private.reject('rate_limited'); end if;
  if p_kind is null or p_kind not in ('traffic', 'incident') then return private.reject('invalid_kind'); end if;
  if p_kind = 'traffic' and not exists (select 1 from public.traffic_report_types t where t.code = p_type and t.active) then
    return private.reject('invalid_type');
  end if;
  if p_kind = 'incident'
     and not exists (select 1 from public.request_categories c where c.code = p_type and c.kind = 'incident' and c.active) then
    return private.reject('invalid_category');
  end if;
  v_geom := private.make_point(p_lat, p_lng);
  if v_geom is null then return private.reject('invalid_coordinates'); end if;
  v_geog := v_geom::geography;

  -- Fuera de la provincia no hay bandeja a la que sumar: sin resultados
  select l.municipality_id into v_muni from private.locate(v_geom) l;
  if v_muni is null then return jsonb_build_object('status', 'ok', 'items', '[]'::jsonb); end if;

  -- El filtro "geom && st_expand(…, 0.002)" (~ 220 m) usa el índice GiST de geometría de cada tabla;
  -- ST_DWithin sobre geography da los 150 m en metros reales.
  if p_kind = 'traffic' then
    select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'kind', 'traffic', 'type', s.type,
                                                 'distance_m', s.distance_m, 'mine', s.mine) order by s.distance_m, s.id), '[]'::jsonb)
    into v_items
    from (
      select t.id, t.type, round(st_distance(t.geom::geography, v_geog))::integer as distance_m,
             (t.reporter_id is not distinct from v_uid) as mine
      from public.traffic_reports t
      where t.type = p_type
        and t.municipality_id = v_muni
        and t.expires_at > now()
        and (t.status in ('active', 'verified') or (t.status = 'pending' and t.reporter_id = v_uid))
        and t.geom && st_expand(v_geom, 0.002)
        and st_dwithin(t.geom::geography, v_geog, 150)
      order by distance_m, t.id
      limit 3
    ) s;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'kind', 'request', 'type', s.category,
                                                 'distance_m', s.distance_m, 'support_count', s.support_count,
                                                 'mine', s.mine, 'can_support', s.can_support, 'supported', s.supported)
                              order by s.distance_m, s.id), '[]'::jsonb)
    into v_items
    from (
      select r.id, r.category, round(st_distance(r.geom::geography, v_geog))::integer as distance_m,
             r.support_count,
             (r.requester_id is not distinct from v_uid) as mine,
             -- las mismas reglas que toggle_request_vote: pública, aprobada o en proceso, y no propia
             (r.is_public and r.status in ('approved', 'in_progress') and r.requester_id is distinct from v_uid) as can_support,
             exists (select 1 from public.request_votes v where v.request_id = r.id and v.user_id = v_uid) as supported
      from public.citizen_requests r
      where r.kind = 'incident'
        and r.category = p_type
        and r.municipality_id = v_muni
        and r.geom is not null
        and r.created_at > now() - interval '90 days'
        and ((r.is_public and r.status in ('approved', 'in_progress'))
             or (r.requester_id = v_uid and r.status in ('pending', 'under_review', 'approved', 'in_progress')))
        and r.geom && st_expand(v_geom, 0.002)
        and st_dwithin(r.geom::geography, v_geog, 150)
      order by distance_m, r.id
      limit 3
    ) s;
  end if;

  return jsonb_build_object('status', 'ok', 'items', v_items);
end $$;

revoke all on function public.find_similar_reports(text, text, double precision, double precision) from public, anon;
grant execute on function public.find_similar_reports(text, text, double precision, double precision) to authenticated;
