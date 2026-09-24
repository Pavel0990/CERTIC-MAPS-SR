-- =====================================================================
-- SR Conecta · seed de DESARROLLO / DEMO
-- ⚠ Los límites municipales son RECTÁNGULOS APROXIMADOS alrededor de cada cabecera, solo para desarrollo.
--   En staging/producción se reemplazan por los límites oficiales de los datos abiertos de la provincia
--   (data/import-municipalities: ogr2ogr → staging → ST_MakeValid → public.municipalities).
-- =====================================================================
set search_path = public, extensions;

insert into public.provinces (code, name) values ('SR', 'Santiago Rodríguez')
on conflict (code) do nothing;

insert into public.municipalities (province_id, code, name, geom, geom_simplified)
select p.id, m.code, m.name,
       st_multi(st_makeenvelope(m.min_lng, m.min_lat, m.max_lng, m.max_lat, 4326)),
       st_multi(st_makeenvelope(m.min_lng, m.min_lat, m.max_lng, m.max_lat, 4326))
from public.provinces p,
     (values ('SAB', 'San Ignacio de Sabaneta', -71.40, 19.43, -71.30, 19.52),
             ('MON', 'Monción',                 -71.22, 19.37, -71.12, 19.46),
             ('VLA', 'Villa Los Almácigos',     -71.48, 19.37, -71.405, 19.45)) as m(code, name, min_lng, min_lat, max_lng, max_lat)
where p.code = 'SR'
on conflict (province_id, code) do nothing;
