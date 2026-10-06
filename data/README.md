# Datos geográficos

Todo lo de esta carpeta es **real** y viene de OpenStreetMap (© colaboradores de OpenStreetMap, [ODbL 1.0](https://www.openstreetmap.org/copyright)). La atribución aparece en el mapa y en los listados de la app.

| Archivo | Qué es | Se carga con |
|---|---|---|
| `osm/santiago-rodriguez.geojson` | Límites de la provincia y de sus 3 municipios | `node data/import-osm-boundaries.mjs` → `supabase/ops/load_osm_boundaries.sql` |
| `osm/pois-raw.json` | Comercios, servicios, salud, alojamiento, parques, reservas y monumentos (consulta: `osm/pois.overpassql`) | `node data/import-osm-content.mjs` → `supabase/ops/load_osm_content.sql` |
| `osm/geo-raw.json` | Presas, embalses y ríos (consulta: `osm/geo.overpassql`) | ídem |
| `osm/routes.geojson` | Rutas trazadas por el enrutador peatonal de OSM sobre calles y caminos reales, entre puntos reales | `node data/fetch-osm-routes.mjs` |

## Actualizar los datos

```bash
# 1. Descargar de nuevo (Overpass pide identificarse con un User-Agent)
curl -H "User-Agent: SR-Conecta/1.0" -H "Accept: application/json" --data-urlencode "data@data/osm/pois.overpassql" https://overpass-api.de/api/interpreter -o data/osm/pois-raw.json
curl -H "User-Agent: SR-Conecta/1.0" -H "Accept: application/json" --data-urlencode "data@data/osm/geo.overpassql" https://overpass-api.de/api/interpreter -o data/osm/geo-raw.json
# 2. Rutas y SQL
npm run data:osm
# 3. Copia de seguridad y carga (idempotente: no duplica)
npm run backup
npx supabase db query --linked -f supabase/ops/load_osm_content.sql
```

## Limpieza que hace el importador

- **Descarta** nombres genéricos ("Farmacia", "Cafetería", "Supermercado"), duplicados a menos de 40 m, bancas de apuestas, funerarias, puntos de información, y lo que cae fuera de los municipios.
- **Escribe** en formato normal los nombres que vienen en MAYÚSCULAS y da formato `809-000-0000` a los teléfonos.
- **Marca** cada registro con `-osm` en su slug.

## Lo que falta y se completa desde la app

- **Descripciones, fotos y horarios:** OSM casi no los tiene. La administración los completa desde las fichas y los negocios al registrarse ("¿Es tu negocio?").
- **Rutas de senderismo:** OSM no tiene ninguna en la provincia. Las 3 rutas actuales siguen caminos reales, pero hay que **validarlas con el municipio**. Las nuevas se proponen desde **Proponer una ruta**, dibujándolas o con un GPX.
- **Datos abiertos oficiales:** cuando la organización entregue los de la provincia, reemplazan a estos (los límites primero).
