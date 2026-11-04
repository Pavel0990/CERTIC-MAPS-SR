-- =====================================================================
-- SR Conecta · Contenido de DEMOSTRACIÓN para staging
-- Lugares turísticos: sitios reales de la provincia (del prototipo de diseño); textos por validar.
-- Negocios, promociones, reportes y consultas: FICTICIOS, marcados con "(demostración)".
-- Idempotente. Requiere haber cargado los límites (supabase/ops/load_osm_boundaries.sql).
-- Quitar todo: supabase/ops/remove_demo_content.sql
-- Uso: npx supabase db query --linked -f supabase/ops/seed_demo_content.sql
-- =====================================================================

-- Lugares turísticos (publicados)
insert into public.tourism_places (province_id, municipality_id, slug, name, kind, description, services, accessibility, opening_info, geom, status)
select l.province_id, l.municipality_id, s.slug, s.name, s.kind, s.description, s.services::jsonb, s.accessibility, s.opening_info,
       extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326), 'published'
from (values
  ('presa-de-moncion', 'Presa de Monción', 'naturaleza', 19.4335, -71.1795,
   'El gran espejo de agua del río Mao, rodeado de lomas. Miradores, pesca artesanal y atardeceres. Texto de demostración, pendiente de validar con el municipio.',
   '{"parqueo": true, "comida": true, "guia": false, "banos": false}', 'Acceso en vehículo hasta el mirador principal.', 'Todo el día'),
  ('parque-duarte-sabaneta', 'Parque Duarte', 'cultural', 19.4752, -71.3412,
   'Corazón de San Ignacio de Sabaneta y punto de encuentro del pueblo. Texto de demostración, pendiente de validar con el municipio.',
   '{"parqueo": true, "comida": true, "banos": false}', 'Plaza a nivel de calle.', 'Todo el día'),
  ('balneario-rio-inaje', 'Balneario Río Inaje', 'rio_balneario', 19.4585, -71.3585,
   'Pozas de agua fría entre piedras y sombra, a pocos minutos del centro. Texto de demostración, pendiente de validar con el municipio.',
   '{"parqueo": true, "comida": false}', 'Camino de tierra en el último tramo.', 'De día'),
  ('mirador-los-almacigos', 'Mirador Los Almácigos', 'mirador', 19.4165, -71.4355,
   'Vista abierta sobre los valles de la Cordillera Central. Texto de demostración, pendiente de validar con el municipio.',
   '{"parqueo": false, "guia": true}', 'Subida corta a pie.', 'Todo el día')
) as s(slug, name, kind, lat, lng, description, services, accessibility, opening_info)
cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
on conflict do nothing;

-- Rutas (publicadas). Trazados aproximados entre puntos conocidos: reemplazar por GPX reales.
insert into public.eco_routes (province_id, municipality_id, slug, name, kind, difficulty, duration_min, description, services, geom, status)
select l.province_id, l.municipality_id, s.slug, s.name, s.kind, s.difficulty, s.duration_min, s.description, s.services::jsonb,
       extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(s.geojson), 4326)), 'published'
from (values
  ('ruta-del-casabe', 'Ruta del Casabe', 'cultural', 'baja', 180,
   'Recorrido por la presa, una casabería artesanal y un café de altura. Trazado aproximado de demostración.',
   '{"comida": true, "parqueo": true}',
   '{"type":"LineString","coordinates":[[-71.1795,19.4335],[-71.1760,19.4260],[-71.1712,19.4128],[-71.1652,19.4168]]}'),
  ('sendero-del-inaje', 'Sendero del Inaje', 'ecologica', 'media', 90,
   'Del parque central al balneario del río Inaje a pie. Trazado aproximado de demostración.',
   '{"agua": true}',
   '{"type":"LineString","coordinates":[[-71.3412,19.4752],[-71.3470,19.4700],[-71.3530,19.4640],[-71.3585,19.4585]]}')
) as s(slug, name, kind, difficulty, duration_min, description, services, geojson)
cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(
  (s.geojson::jsonb -> 'coordinates' -> 0 ->> 0)::float8, (s.geojson::jsonb -> 'coordinates' -> 0 ->> 1)::float8), 4326)) l
on conflict do nothing;

-- Negocios (aprobados, FICTICIOS)
insert into public.businesses (province_id, municipality_id, category_id, slug, name, description, geom, phone, whatsapp, status)
select l.province_id, l.municipality_id, c.id, s.slug, s.name, s.description, extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326),
       s.phone, s.phone, 'approved'
from (values
  ('cafe-moncion-demo', 'Café Monción', 'cafeteria', 19.4168, -71.1652, 'Café de altura tostado en la provincia (demostración).', '8095550101'),
  ('casaberia-dona-mercedes-demo', 'Casabería Doña Mercedes', 'restaurante', 19.4128, -71.1712, 'Casabe de yuca hecho a mano en burén (demostración).', '8095550102'),
  ('restaurante-el-puente-demo', 'Restaurante El Puente', 'restaurante', 19.4726, -71.3448, 'Cocina criolla del día (demostración).', '8095550103'),
  ('hotel-sabaneta-plaza-demo', 'Hotel Sabaneta Plaza', 'hotel', 19.4771, -71.3381, 'Hotel céntrico a una cuadra del parque (demostración).', '8095550104'),
  ('la-lomita-cafe-demo', 'La Lomita Café', 'cafeteria', 19.4102, -71.4418, 'Café de los productores de la zona alta (demostración).', '8095550105')
) as s(slug, name, category, lat, lng, description, phone)
join public.business_categories c on c.slug = s.category
cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
on conflict do nothing;

-- Horario de los negocios de demostración: lunes a sábado 8:00–18:00
insert into public.business_hours (business_id, weekday, opens, closes)
select b.id, d, time '08:00', time '18:00'
from public.businesses b cross join generate_series(1, 6) d
where b.slug like '%-demo'
on conflict do nothing;

-- Promociones activas (FICTICIAS)
insert into public.promotions (business_id, title, description, valid_from, valid_until, status)
select b.id, s.title, s.description, current_date, current_date + 60, 'active'
from (values
  ('cafe-moncion-demo', '10% en desayunos', 'De lunes a viernes antes de las 10:00 a. m. (demostración).'),
  ('restaurante-el-puente-demo', '15% de lunes a jueves', 'En el plato del día (demostración).')
) as s(slug, title, description)
join public.businesses b on b.slug = s.slug
where not exists (select 1 from public.promotions p where p.business_id = b.id and p.title = s.title);

-- Alertas de tránsito activas (FICTICIAS)
insert into public.traffic_reports (province_id, municipality_id, type, severity, description, geom, status, expires_at)
select l.province_id, l.municipality_id, s.type, s.severity, s.description, extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326),
       'active', now() + s.ttl::interval
from (values
  ('bache', 2::smallint, 19.4744, -71.3428, 'Bache profundo en la calle Duarte (demostración).', '7 days'),
  ('calle_cerrada', 3::smallint, 19.4148, -71.4460, 'Derrumbe en el camino vecinal (demostración).', '2 days'),
  ('semaforo', 2::smallint, 19.4712, -71.3355, 'Semáforo intermitente en la entrada (demostración).', '2 days')
) as s(type, severity, lat, lng, description, ttl)
cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
where not exists (select 1 from public.traffic_reports t where t.description = s.description);

-- Consultas ciudadanas públicas (FICTICIAS) con su historial
with ins as (
  insert into public.citizen_requests (province_id, municipality_id, kind, category, title, description, geom, status, is_public, resolution_note)
  select l.province_id, l.municipality_id, 'incident', s.category, s.title, s.description,
         extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326), s.status, true, s.note
  from (values
    ('alumbrado', 'Poste sin luz', 'El poste de la avenida lleva una semana apagado y la calle queda oscura (demostración).', 19.4786, -71.3366, 'approved', null),
    ('basura', 'Vertedero improvisado', 'Se acumula basura a la salida del pueblo (demostración).', 19.4190, -71.1600, 'resolved', 'Se limpió el área y se colocó un contenedor (demostración).'),
    ('infraestructura', 'Acera rota frente a la escuela', 'La acera tiene un hueco grande y los niños pasan por la calle (demostración).', 19.4760, -71.3430, 'in_progress', null)
  ) as s(category, title, description, lat, lng, status, note)
  cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
  where not exists (select 1 from public.citizen_requests r where r.title = s.title and r.description like '%(demostración)%')
  returning id, status
)
insert into public.request_status_history (request_id, from_status, to_status, note)
select i.id, h.from_status, h.to_status, h.note
from ins i
cross join lateral (values
  (null::text, 'pending', 'Reporte recibido'),
  ('pending', 'under_review', null),
  ('under_review', 'approved', null),
  ('approved', 'in_progress', 'Asignado a la brigada municipal'),
  ('in_progress', 'resolved', 'Resuelto')
) as h(from_status, to_status, note)
where array_position(array['pending','under_review','approved','in_progress','resolved'], h.to_status)
   <= array_position(array['pending','under_review','approved','in_progress','resolved'], i.status);

select 'tourism_places' t, count(*) from public.tourism_places union all
select 'eco_routes', count(*) from public.eco_routes union all
select 'businesses', count(*) from public.businesses union all
select 'promotions', count(*) from public.promotions union all
select 'traffic_reports', count(*) from public.traffic_reports union all
select 'citizen_requests', count(*) from public.citizen_requests;
