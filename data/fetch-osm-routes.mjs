// Traza rutas reales sobre la red de caminos de OpenStreetMap (enrutador peatonal FOSSGIS / OSRM)
// entre puntos reales de la provincia, y las guarda en data/osm/routes.geojson.
// La geometría sigue calles, caminos y senderos que existen en OSM (© colaboradores de OpenStreetMap, ODbL).
// Uso: node data/fetch-osm-routes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// [lng, lat] de puntos de OSM (data/osm/pois-raw.json y geo-raw.json)
export const ROUTES = [
  {
    slug: 'moncion-presa', name: 'De Monción a la Presa', kind: 'ecologica',
    description: 'Caminata desde el Parque Central de Monción hasta la Presa de Monción, sobre el río Mao. El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.',
    via: [[-71.1502, 19.4109], [-71.1191, 19.4057]],
  },
  {
    slug: 'sabaneta-mata-del-jobo', name: 'Sabaneta al Parador de Mata del Jobo', kind: 'cultural',
    description: 'Recorrido desde el Parque Central de San Ignacio de Sabaneta hasta el Parador Fotográfico de Mata del Jobo. El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.',
    via: [[-71.3418, 19.4757], [-71.3111, 19.4537]],
  },
  {
    slug: 'sabaneta-caimito', name: 'Sabaneta al Parador de Caimito', kind: 'aventura',
    description: 'Ruta larga desde el Parque Central de Sabaneta hasta el Parador Fotográfico de Caimito. El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.',
    via: [[-71.3418, 19.4757], [-71.2823, 19.4958]],
  },
];

async function route(via) {
  const coords = via.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SR-Conecta/1.0 (github.com/Pavel0990/CERTIC-MAPS-SR)' } });
  const j = await res.json();
  if (j.code !== 'Ok') throw new Error(`enrutador: ${j.code} ${j.message ?? ''}`);
  return j.routes[0];
}

const features = [];
for (const r of ROUTES) {
  const out = await route(r.via);
  features.push({
    type: 'Feature',
    properties: { slug: r.slug, name: r.name, kind: r.kind, description: r.description, distance_m: Math.round(out.distance) },
    geometry: out.geometry,
  });
  console.log(`${r.name}: ${(out.distance / 1000).toFixed(1)} km, ${out.geometry.coordinates.length} puntos`);
}
fs.writeFileSync(path.join(root, 'data/osm/routes.geojson'), JSON.stringify({ type: 'FeatureCollection', features }, null, 1));
