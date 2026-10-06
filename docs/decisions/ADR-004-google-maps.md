# ADR-004 · Google Maps como mapa base, detrás de un adaptador

| Estado | Fecha | Referencia |
|---|---|---|
| **Sustituida** por [ADR-022](ADR-022-maplibre-openfreemap.md) el 05/10/2026 | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §7.3 |

## Contexto

El mapa es el producto. La demo es con datos reales y los usuarios dominicanos conocen Google Maps. A la vez, Google tiene costo variable y términos restrictivos.

## Decisión

Google Maps JavaScript API con AdvancedMarkerElement y MarkerClusterer. Places solo para Autocomplete de direcciones. Navegación por enlace (sin Routes API). TrafficLayer opcional. Toda la app habla con un adaptador propio (`modules/map/provider`), y los datos son 100 % propios en PostGIS.

| Criterio | Google Maps | MapLibre / Leaflet + OSM |
|---|---|---|
| Calidad en Santiago Rodríguez | Buena cartografía vial y satelital; familiar | OSM rural depende de la comunidad; calidad variable |
| Búsqueda de direcciones | Líder, con lugares locales | Geocodificador aparte; menor calidad en RD |
| Tráfico | TrafficLayer (cobertura rural incierta) | No disponible |
| Datos propios (GeoJSON, rutas) | Suficiente (Data Layer, polylines) | Nativo y muy flexible |
| Costo | Cuota gratuita por SKU, luego pago por uso | Tiles gratuitos limitados o de pago |
| Dependencia | Alta: su contenido no puede mostrarse sobre otros mapas | Baja |

## Alternativas descartadas

- Leaflet o MapLibre GL + tiles OSM (MapTiler/Stadia) + geocodificador Nominatim/Photon + OSRM

## Consecuencias

**A favor:**

- Calidad cartográfica y búsqueda local en la demo.
- Experiencia conocida por el usuario.

**En contra:**

- Costo variable y lock-in.
- Términos: no cachear contenido ni usarlo sobre mapas no-Google.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Facturación inesperada | Cuotas diarias por API, alertas de presupuesto, field masks, cero llamadas por eventos del mapa. |
| Cambio de precios o términos | Revisión trimestral; plan B MapLibre cambiando solo el adaptador. |
