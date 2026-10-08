# ADR-024 · OpenStreetMap como fuente provisional de datos reales

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 05/10/2026 | [data/README.md](../../data/README.md) · [ADR-022](ADR-022-maplibre-openfreemap.md) |

## Contexto

La demo del reto es "con datos reales" y un jurado de la provincia nota en segundos un negocio inventado. Las bases dicen que la organización entregará datos geográficos abiertos, pero no llegaron a tiempo para construir. Hasta el 05/10, el mapa mostraba datos de demostración, y de la provincia solo tenía los límites de los municipios.

## Decisión

Usar **OpenStreetMap** (ODbL) como fuente provisional:

- **Límites** de la provincia y de los 3 municipios.
- **Negocios y servicios:** comercios, salud, bancos, combustible, alojamiento, comida.
- **Lugares:** parques, áreas protegidas, monumentos, la Presa de Monción.
- **Rutas:** trazadas por el enrutador peatonal de OSM sobre caminos reales, entre puntos reales.

Importadores en `data/` que:

1. Limpian los datos: nombres genéricos, duplicados, categorías que no sirven a vecinos ni turistas.
2. Generan SQL **idempotente** (upsert por slug con la marca `-osm`) en `supabase/ops/`.
3. Descartan lo que cae fuera de los municipios con `private.locate()`.

## Alternativas descartadas

- **Datos de demostración inventados:** restan credibilidad frente a un jurado local.
- **Esperar los datos oficiales:** no dependen del equipo y no llegaron a tiempo.
- **Cargar a mano:** lento; mejor dedicar ese tiempo a completar las fichas principales.

## Consecuencias

**A favor:**

- Datos reales y verificables desde el primer día.
- Repetible (`npm run data:osm`).
- Atribución sencilla (NOTICE).

**En contra:**

- **Fichas pobres:** OSM casi no trae descripciones, fotos ni horarios. Se completan desde el panel (docs/REPARTO-DE-TRABAJO.md, Persona 1).
- **Rutas sin validar:** las 3 rutas siguen caminos reales, pero alguien de la zona tiene que confirmarlas.
- **Datos oficiales:** cuando lleguen, se importan encima (los límites primero) y los registros `-osm` que no coincidan se archivan.
