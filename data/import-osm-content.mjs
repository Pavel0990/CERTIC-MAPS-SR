// Genera supabase/ops/load_osm_content.sql: negocios, lugares turísticos y rutas REALES de la provincia
// a partir de OpenStreetMap (© colaboradores de OpenStreetMap, ODbL 1.0).
//
// Entradas (descargadas con Overpass y el enrutador de OSM; cómo actualizarlas: data/README.md):
//   data/osm/pois-raw.json  comercios, servicios, salud, alojamiento, parques, reservas, monumentos
//   data/osm/geo-raw.json   presas y embalses
//   data/osm/routes.geojson rutas trazadas sobre caminos reales (node data/fetch-osm-routes.mjs)
//
// Limpieza: descarta nombres genéricos ("Farmacia", "Cafetería"), duplicados a menos de 40 m,
// categorías que no sirven a vecinos ni turistas, y pasa a formato normal los nombres en MAYÚSCULAS.
// El SQL es idempotente (upsert por slug) y cada fila lleva "osm" en el slug para poder quitarla.
// Uso: node data/import-osm-content.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const pois = read('data/osm/pois-raw.json').elements;
const geo = read('data/osm/geo-raw.json').elements;
const routes = read('data/osm/routes.geojson').features;

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const GENERIC = /^(cafeter[ií]a|farmacia|supermercado|colmado|restaurante|bar|hotel|banco|parque)$/i;
const SMALL = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'a', 'en']);
const tidy = (name) => {
  const n = name.trim().replace(/\s+/g, ' ');
  if (n !== n.toUpperCase() || !/[A-ZÁÉÍÓÚÑ]{4}/.test(n)) return n;
  return n.toLowerCase().split(' ').map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
};
const phone = (t) => {
  const raw = (t.phone ?? t['contact:phone'] ?? '').split(/[;,]/)[0].replace(/[^\d+]/g, '');
  const d = raw.replace(/^\+?1/, '');
  return /^8[024]9\d{7}$/.test(d) ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : null;
};
const website = (t) => {
  const w = t.website ?? t['contact:website'];
  return w && /^https:\/\//i.test(w) && w.length <= 300 ? w : null;
};
const point = (e) => [e.lon ?? e.center?.lon, e.lat ?? e.center?.lat];
const meters = ([a, b], [c, d]) => Math.hypot((a - c) * 104_900, (b - d) * 111_000); // a 19° N

// --- Negocios -------------------------------------------------------------------------------
const BUSINESS = (t) => {
  if (['convenience', 'supermarket'].includes(t.shop)) return 'colmado';
  if (['restaurant', 'fast_food', 'bar'].includes(t.amenity)) return 'restaurante';
  if (['cafe', 'ice_cream'].includes(t.amenity)) return 'cafeteria';
  if (['hotel', 'motel', 'guest_house'].includes(t.tourism)) return 'hotel';
  if (['pharmacy', 'clinic', 'hospital', 'doctors'].includes(t.amenity) || t.shop === 'chemist') return 'salud';
  if (t.amenity === 'bank') return 'banco';
  if (t.amenity === 'fuel' || t.shop === 'gas') return 'gasolinera';
  if (['hardware', 'car_repair', 'motorcycle_repair', 'computer', 'electronics', 'mobile_phone', 'beauty', 'travel_agency'].includes(t.shop)) return 'servicios';
  if (['gift', 'clothes'].includes(t.shop)) return 'otro';
  return null; // bookmaker, e-cigarette, funerarias, información turística…
};
const CATEGORY_TEXT = { colmado: 'Colmado o supermercado', restaurante: 'Comida y bebida', cafeteria: 'Cafetería y heladería', hotel: 'Alojamiento', salud: 'Salud', banco: 'Banco o cooperativa', gasolinera: 'Estación de combustible', servicios: 'Servicios', otro: 'Tienda' };

const businesses = [];
for (const e of pois) {
  const t = e.tags ?? {};
  const cat = BUSINESS(t);
  if (!cat || !t.name || GENERIC.test(t.name.trim())) continue;
  const p = point(e);
  const name = tidy(t.name);
  const key = slugify(name);
  // duplicado: mismo lugar (≤ 40 m) con nombre igual o casi igual (p. ej. "Club" / "Clud")
  if (businesses.some((b) => meters(b.p, p) <= 40 && (b.key === key || b.key.slice(4) === key.slice(4)))) continue;
  businesses.push({ key, p, name, cat, osm: `${e.type[0]}${e.id}`, phone: phone(t), website: website(t), opening: t.opening_hours ?? null });
}

// --- Lugares turísticos ---------------------------------------------------------------------
const PLACE = (t) => {
  if (t.leisure === 'nature_reserve' || t.boundary === 'protected_area') return ['naturaleza', 'Área natural protegida'];
  if (t.waterway === 'dam') return ['naturaleza', 'Presa y embalse'];
  if (t.tourism === 'artwork' && /parador/i.test(t.name)) return ['mirador', 'Parador fotográfico'];
  if (t.historic === 'monument' || t.tourism === 'artwork') return ['historico', 'Monumento'];
  if (t.leisure === 'park') return ['cultural', 'Parque'];
  if (t.amenity === 'place_of_worship') return ['cultural', 'Templo'];
  return null;
};
const places = [];
for (const e of [...pois, ...geo]) {
  const t = e.tags ?? {};
  const kind = PLACE(t);
  if (!kind || !t.name || GENERIC.test(t.name.trim())) continue;
  const p = point(e);
  const name = tidy(t.name);
  if (places.some((x) => x.key === slugify(name))) continue; // la presa aparece como presa y como embalse
  places.push({ key: slugify(name), p, name, kind: kind[0], label: kind[1], osm: `${e.type[0]}${e.id}`, opening: t.opening_hours ?? null });
}

// --- SQL ------------------------------------------------------------------------------------
const bizRows = businesses.map((b) => `  (${q(`${b.key}-osm${b.osm}`)}, ${q(b.name)}, ${q(b.cat)}, ${q(CATEGORY_TEXT[b.cat])}, ${b.p[0]}, ${b.p[1]}, ${q(b.phone)}, ${q(b.website)})`);
const placeRows = places.map((x) => `  (${q(`${x.key}-osm${x.osm}`)}, ${q(x.name)}, ${q(x.kind)}, ${q(x.label)}, ${x.p[0]}, ${x.p[1]}, ${q(x.opening)})`);
const routeRows = routes.map((r) => {
  const km = r.properties.distance_m / 1000;
  const minutes = Math.round((km / 4) * 60); // a pie, 4 km/h
  const difficulty = km < 5 ? 'baja' : km < 10 ? 'media' : 'alta';
  return `  (${q(`${r.properties.slug}-osm`)}, ${q(r.properties.name)}, ${q(r.properties.kind)}, ${q(difficulty)}, ${minutes}, ${q(r.properties.description)}, ${q(JSON.stringify({ type: 'MultiLineString', coordinates: [r.geometry.coordinates.map(([x, y]) => [Number(x.toFixed(6)), Number(y.toFixed(6))])] }))})`;
});

const sql = `-- =====================================================================
-- SR Conecta · Contenido REAL de la provincia desde OpenStreetMap
-- Generado por data/import-osm-content.mjs. No editar a mano.
-- Datos © colaboradores de OpenStreetMap, ODbL 1.0 (https://www.openstreetmap.org/copyright).
-- ${businesses.length} negocios, ${places.length} lugares turísticos y ${routes.length} rutas trazadas sobre caminos reales.
-- Idempotente (upsert por slug). Los registros llevan "-osm" en el slug.
-- Lo que cae fuera de los municipios de la provincia se descarta.
-- Uso: npx supabase db query --linked -f supabase/ops/load_osm_content.sql
-- =====================================================================

-- Categorías que faltaban para lo que hay en la provincia (editables en Panel → Catálogos)
insert into public.business_categories (slug, name, icon, sort) values
  ('gasolinera', 'Gasolinera', 'fuel', 75),
  ('banco', 'Bancos y cooperativas', 'landmark', 77)
on conflict (slug) do nothing;

with src (slug, name, category, label, lng, lat, phone, website) as (values
${bizRows.join(',\n')}
), located as (
  select s.*, l.municipality_id, l.province_id, m.name as muni,
         extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326) as geom
  from src s
  cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
  join public.municipalities m on m.id = l.municipality_id
)
insert into public.businesses (province_id, municipality_id, category_id, slug, name, description, geom, phone, website, status)
select l.province_id, l.municipality_id, c.id, l.slug, l.name,
       l.label || ' en ' || l.muni || '. Datos de OpenStreetMap: si es tu negocio, regístralo en SR Conecta para completar horario, fotos y contacto.',
       l.geom, l.phone, l.website, 'approved'
from located l join public.business_categories c on c.slug = l.category
on conflict (province_id, slug) do update
  set name = excluded.name, category_id = excluded.category_id, geom = excluded.geom,
      phone = coalesce(public.businesses.phone, excluded.phone), website = coalesce(public.businesses.website, excluded.website);

with src (slug, name, kind, label, lng, lat, opening) as (values
${placeRows.join(',\n')}
), located as (
  select s.*, l.municipality_id, l.province_id, m.name as muni,
         extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326) as geom
  from src s
  cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
  join public.municipalities m on m.id = l.municipality_id
)
insert into public.tourism_places (province_id, municipality_id, slug, name, kind, description, opening_info, geom, status)
select l.province_id, l.municipality_id, l.slug, l.name, l.kind,
       l.label || ' en ' || l.muni || '. Ubicación de OpenStreetMap; la descripción la completa el municipio desde el panel.',
       l.opening, l.geom, 'published'
from located l
on conflict (province_id, slug) do update set name = excluded.name, kind = excluded.kind, geom = excluded.geom;

with src (slug, name, kind, difficulty, duration_min, description, geojson) as (values
${routeRows.join(',\n')}
), geo as (
  select s.*, extensions.st_setsrid(extensions.st_geomfromgeojson(s.geojson), 4326) as geom from src s
)
insert into public.eco_routes (province_id, municipality_id, slug, name, kind, difficulty, duration_min, description, geom, status)
select l.province_id, l.municipality_id, g.slug, g.name, g.kind, g.difficulty, g.duration_min, g.description, g.geom, 'published'
from geo g
cross join lateral private.locate(extensions.st_startpoint(extensions.st_geometryn(g.geom, 1))) l
where l.municipality_id is not null
on conflict (province_id, slug) do update
  set name = excluded.name, geom = excluded.geom, duration_min = excluded.duration_min, difficulty = excluded.difficulty, description = excluded.description;

select (select count(*) from public.businesses where slug like '%-osm%') as negocios_osm,
       (select count(*) from public.tourism_places where slug like '%-osm%') as lugares_osm,
       (select count(*) from public.eco_routes where slug like '%-osm%') as rutas_osm;
`;
fs.writeFileSync(path.join(root, 'supabase/ops/load_osm_content.sql'), sql);
console.log(`${businesses.length} negocios, ${places.length} lugares, ${routes.length} rutas → supabase/ops/load_osm_content.sql`);
const byCat = {};
for (const b of businesses) byCat[b.cat] = (byCat[b.cat] ?? 0) + 1;
console.log('por categoría:', byCat);
console.log('lugares:', places.map((p) => `${p.name} (${p.kind})`).join(', '));
