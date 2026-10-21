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

## Lugares turísticos: descripciones y fotos libres

`data/lugares-contenido.json` completa las fichas que OSM deja vacías. Cada dato lleva su fuente con enlace (Wikipedia con la revisión exacta, Wikidata, OSM, prensa). Lo que no se pudo confirmar está en `por_confirmar` (sin coordenada fiable) o `sin_fuente` (sin texto que citar): **no se carga**.

| Parte del JSON | Qué es |
|---|---|
| `places` | Lugares que se crean o se completan: slug (con el id de OSM o de Wikidata), coordenada y su fuente, descripción, acceso, fotos y fuentes |
| `routes` | Rutas que se completan; `osm_description` es el texto que puso la carga de OSM |
| `images` | Fotos de Wikimedia Commons: archivo, página, autor y licencia (solo CC0, CC BY, CC BY-SA o dominio público) |
| `por_confirmar`, `sin_fuente`, `routes_sin_fuente` | Lo que falta: ubicarlo con alguien de la zona, buscar una fuente o tomar fotos propias |

Las áreas protegidas que pasan el límite de la provincia (Armando Bermúdez, Piky Lora, Río Cana) se ubican en un punto interior de la parte que cae en el municipio (polígono de OSM ∩ municipio, calculado con PostGIS).

### Repetir la carga

```bash
npm run backup                      # 1. copia de seguridad
npm run data:lugares -- --dry-run   # 2. qué se crearía o completaría (no escribe nada)
npm run data:lugares                # 3. carga; al final comprueba que otra pasada no cambiaría nada
```

Usa la CLI de Supabase vinculada (como `npm run backup`) y `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` para subir las fotos.

- **Idempotente:** identifica cada lugar por su slug o por nombre + municipio, y cada foto por un id fijo derivado del archivo de Commons. Correrlo dos veces no duplica nada.
- **Nunca borra ni sobrescribe:** solo llena campos vacíos (o con el texto de OSM). Si el municipio ya escribió una descripción, la deja y lo avisa con `!` en la salida; en ese caso tampoco agrega la foto libre, porque quedaría sin crédito.
- **Publicado:** los lugares quedan `published` (como `load_osm_content.sql`) y las fotos `approved` en `public-media/processed/{id}.webp`, procesadas como las del worker: WebP calidad 80, sin metadatos, máximo 1600 px por lado.
- **Crédito:** va al final de la descripción («Foto: autor, licencia, Wikimedia Commons.»). Antes de subir, el script comprueba en Commons que la licencia siga siendo la del JSON.
- **Registro para revertir:** cada carga real deja `backups/load-places-<fecha>.json` con los lugares creados, las fotos subidas y los valores anteriores de lo que completó.
- `load_osm_content.sql` ya no reemplaza la descripción de una ruta si alguien la completó.

Para cambiar un texto ya cargado, se edita en el panel: la carga no toca lo que ya tiene texto. Para agregar un lugar, se añade al JSON con su fuente y se repiten los 3 pasos.
