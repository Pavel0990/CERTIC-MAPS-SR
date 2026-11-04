// Genera supabase/ops/load_osm_boundaries.sql desde data/osm/santiago-rodriguez.geojson.
// Fuente: OpenStreetMap (© colaboradores de OpenStreetMap, ODbL 1.0), relaciones administrativas
// R3412368 (provincia, DO-26), R7390991 (San Ignacio de Sabaneta), R7390993 (Villa Los Almácigos),
// R7391002 (Monción). Descarga: Nominatim /lookup?polygon_geojson=1.
// Son límites PROVISIONALES: se reemplazan por los datos abiertos oficiales cuando la organización los entregue.
// Uso: node data/import-osm-boundaries.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = JSON.parse(fs.readFileSync(path.join(root, 'data/osm/santiago-rodriguez.geojson'), 'utf8'));

const CODES = { 7390991: 'SAB', 7391002: 'MON', 7390993: 'VLA' };
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

const municipalities = src.features.filter((f) => CODES[f.properties.osm_id]);
if (municipalities.length !== 3) throw new Error(`se esperaban 3 municipios, hay ${municipalities.length}`);

const rows = municipalities.map((f) => `  (${quote(CODES[f.properties.osm_id])}, ${quote(f.properties.name)}, ${quote(JSON.stringify(f.geometry))})`);

const sql = `-- =====================================================================
-- SR Conecta · Límites de la provincia y sus municipios (PROVISIONALES, OpenStreetMap)
-- Generado por data/import-osm-boundaries.mjs. No editar a mano.
-- Datos © colaboradores de OpenStreetMap, ODbL 1.0 (https://www.openstreetmap.org/copyright).
-- Se reemplazan por los límites oficiales de los datos abiertos de la provincia cuando estén disponibles.
-- Idempotente: se puede ejecutar varias veces (actualiza la geometría si el municipio ya existe).
-- Uso: npx supabase db query --linked -f supabase/ops/load_osm_boundaries.sql
-- =====================================================================
insert into public.provinces (code, name) values ('SR', 'Santiago Rodríguez')
on conflict (code) do nothing;

with src (code, name, geojson) as (values
${rows.join(',\n')}
), geo as (
  select code, name,
         extensions.st_multi(extensions.st_collectionextract(extensions.st_makevalid(
           extensions.st_setsrid(extensions.st_geomfromgeojson(geojson), 4326)), 3)) as geom
  from src
)
insert into public.municipalities (province_id, code, name, geom, geom_simplified)
select p.id, g.code, g.name, g.geom,
       -- ~30 m de tolerancia: suficiente para el zoom de provincia. PostGIS 3.3 (Supabase) no tiene
       -- ST_CoverageSimplify; la simplificación por polígono puede dejar huecos imperceptibles a ese zoom.
       extensions.st_multi(extensions.st_simplifypreservetopology(g.geom, 0.0003))
from geo g cross join public.provinces p
where p.code = 'SR'
on conflict (province_id, code) do update
  set name = excluded.name, geom = excluded.geom, geom_simplified = excluded.geom_simplified;

select code, name, extensions.st_isvalid(geom) as valida,
       round((extensions.st_area(geom::extensions.geography) / 1e6)::numeric, 1) as km2,
       extensions.st_npoints(geom) as puntos, extensions.st_npoints(geom_simplified) as puntos_simplificados
from public.municipalities order by code;
`;
fs.writeFileSync(path.join(root, 'supabase/ops/load_osm_boundaries.sql'), sql);
console.log('supabase/ops/load_osm_boundaries.sql', (sql.length / 1024).toFixed(0), 'KB');
