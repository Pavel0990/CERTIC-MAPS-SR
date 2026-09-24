-- =====================================================================
-- SR Conecta · 120 · RPC de lectura: mapa por viewport, búsqueda, "mi actividad" y KPIs
-- Referencia: DATABASE.md §6.3 · ARCHITECTURE.md §9.3, §24, §27, §29
-- =====================================================================
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Capas públicas del mapa por viewport. SECURITY INVOKER: RLS y grants por columna aplican.
-- Además filtra explícitamente lo público: el mapa general nunca muestra borradores ni datos de personal.
-- ---------------------------------------------------------------------
create or replace function public.map_features(
  p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision,
  p_layers text[] default array['business', 'tourism', 'route', 'traffic', 'request'], p_limit integer default 500)
returns jsonb
language plpgsql stable security invoker
set search_path = pg_catalog, extensions, public
as $$
declare
  v_env geometry;
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 500);
  v_features jsonb;
  v_count integer;
begin
  if p_min_lng is null or p_min_lat is null or p_max_lng is null or p_max_lat is null
     or p_min_lng not between -180 and 180 or p_max_lng not between -180 and 180
     or p_min_lat not between -90 and 90 or p_max_lat not between -90 and 90
     or p_max_lng <= p_min_lng or p_max_lat <= p_min_lat then
    return private.reject('invalid_bbox');
  end if;
  if (p_max_lng - p_min_lng) > 2 or (p_max_lat - p_min_lat) > 2 then return private.reject('bbox_too_large'); end if;
  if p_layers is null or not (p_layers <@ array['business', 'tourism', 'route', 'traffic', 'request']) then
    return private.reject('invalid_layers');
  end if;
  v_env := st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);

  with f as (
    select 'business'::text as layer, b.id, b.name as title, c.slug as category, null::smallint as severity, b.geom
    from public.businesses b join public.business_categories c on c.id = b.category_id
    where 'business' = any (p_layers) and b.geom && v_env and b.status = 'approved' and b.deleted_at is null
    union all
    select 'tourism', t.id, t.name, t.kind, null, t.geom
    from public.tourism_places t
    where 'tourism' = any (p_layers) and t.geom && v_env and t.status = 'published' and t.deleted_at is null
    union all
    select 'route', r.id, r.name, r.difficulty, null, r.start_point
    from public.eco_routes r
    where 'route' = any (p_layers) and r.geom && v_env and r.status = 'published' and r.deleted_at is null
    union all
    select 'traffic', tr.id, tt.name, tr.type, tr.severity, tr.geom
    from public.traffic_reports tr join public.traffic_report_types tt on tt.code = tr.type
    where 'traffic' = any (p_layers) and tr.geom && v_env and tr.status in ('active', 'verified') and tr.expires_at > now()
    union all
    select 'request', q.id, q.title, q.category, null, q.geom
    from public.citizen_requests q
    where 'request' = any (p_layers) and q.geom && v_env and q.is_public and q.status in ('approved', 'in_progress', 'resolved')
  ), lim as (
    select * from f limit v_limit + 1
  )
  select (select count(*) from lim),
         coalesce((select jsonb_agg(jsonb_build_object(
                     'type', 'Feature',
                     'geometry', st_asgeojson(x.geom, 6)::jsonb,
                     'properties', jsonb_strip_nulls(jsonb_build_object('id', x.id, 'layer', x.layer, 'title', x.title,
                                                                        'category', x.category, 'severity', x.severity))))
                   from (select * from lim limit v_limit) x), '[]'::jsonb)
  into v_count, v_features;

  -- se pidieron v_limit + 1 filas: si llegaron todas, hay más de las que caben
  return jsonb_build_object('type', 'FeatureCollection', 'features', v_features, 'truncated', v_count > v_limit);
end $$;

-- ---------------------------------------------------------------------
-- Búsqueda propia (ARCHITECTURE.md §29): texto completo en español + trigramas, sin acentos
-- "moncion" encuentra "Monción"; errores de tipeo por similitud.
-- ---------------------------------------------------------------------
create or replace function public.search_all(p_q text, p_limit integer default 20)
returns table (entity text, id uuid, name text, municipality_id uuid, rank real)
language sql stable security invoker
set search_path = pg_catalog, extensions, public
as $$
  with q as (
    select websearch_to_tsquery('spanish', private.f_unaccent(btrim(p_q))) as tsq,
           lower(private.f_unaccent(btrim(p_q))) as raw
    where char_length(btrim(coalesce(p_q, ''))) between 2 and 80
  ), hits as (
    select 'business'::text, b.id, b.name, b.municipality_id,
           greatest(ts_rank(b.search_vector, q.tsq), similarity(private.f_unaccent(b.name), q.raw))
    from public.businesses b, q
    where b.status = 'approved' and b.deleted_at is null
      and (b.search_vector @@ q.tsq or private.f_unaccent(b.name) % q.raw)
    union all
    select 'tourism_place', t.id, t.name, t.municipality_id,
           greatest(ts_rank(t.search_vector, q.tsq), similarity(private.f_unaccent(t.name), q.raw))
    from public.tourism_places t, q
    where t.status = 'published' and t.deleted_at is null
      and (t.search_vector @@ q.tsq or private.f_unaccent(t.name) % q.raw)
    union all
    select 'eco_route', r.id, r.name, r.municipality_id,
           greatest(ts_rank(r.search_vector, q.tsq), similarity(private.f_unaccent(r.name), q.raw))
    from public.eco_routes r, q
    where r.status = 'published' and r.deleted_at is null
      and (r.search_vector @@ q.tsq or private.f_unaccent(r.name) % q.raw)
  )
  select * from hits order by 5 desc, 3 limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- ---------------------------------------------------------------------
-- "Mi actividad": reportes y solicitudes propios (el autor no es columna visible por grants)
-- ---------------------------------------------------------------------
create or replace function public.my_activity()
returns jsonb
language sql stable security definer
set search_path = pg_catalog, extensions, public
as $$
  select jsonb_build_object(
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'category', r.category,
                                  'title', r.title, 'status', r.status, 'support_count', r.support_count,
                                  'rejection_reason', r.rejection_reason, 'resolution_note', r.resolution_note,
                                  'created_at', r.created_at) order by r.created_at desc)
                          from public.citizen_requests r where r.requester_id = (select auth.uid())), '[]'::jsonb),
    'traffic_reports', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'type', t.type, 'status', t.status,
                                  'expires_at', t.expires_at, 'created_at', t.created_at) order by t.created_at desc)
                          from public.traffic_reports t where t.reporter_id = (select auth.uid())), '[]'::jsonb),
    'votes', coalesce((select jsonb_agg(v.request_id) from public.request_votes v where v.user_id = (select auth.uid())), '[]'::jsonb))
  where (select auth.uid()) is not null
$$;

-- ---------------------------------------------------------------------
-- KPIs: ÚNICA fuente de verdad para panel y PDF (ARCHITECTURE.md §24, §27).
-- Periodo en fechas locales America/Santo_Domingo: [p_from 00:00, p_to + 1 00:00).
-- ---------------------------------------------------------------------
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
                  'published', count(*) filter (where t.status in ('active', 'verified', 'resolved', 'expired')),
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
