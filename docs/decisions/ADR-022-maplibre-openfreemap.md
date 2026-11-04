# ADR-022 · MapLibre + OpenFreeMap como mapa base (sustituye a ADR-004)

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 05/10/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §7.3 · sustituye a [ADR-004](ADR-004-google-maps.md) |

## Contexto

ADR-004 eligió Google Maps detrás de un adaptador (`modules/map/provider`), con MapLibre como plan B. Durante la construcción, el plan B se convirtió en la implementación real:

- **El mapa funciona hoy con MapLibre GL 6 y el estilo `liberty` de OpenFreeMap.** Están hechos y probados el tránsito en vivo, los clústeres, las rutas, la selección de puntos y el modo sin conexión.
- **Las bases del reto no exigen Google** ("stack libre; se evalúa el resultado").
- **Quedan 3 semanas para la entrega.** Integrar Google implicaría un adaptador nuevo, facturación con tarjeta, un Map ID, claves restringidas y revisar sus términos. Además, sus términos prohíben cachear sus mapas, y eso rompe el modo sin conexión de ADR-009.
- **Los datos reales de la provincia salieron de OpenStreetMap** (límites, negocios, lugares, rutas). Mostrarlos sobre un mapa base de OSM es coherente, y la atribución ODbL ya aparece en el mapa.

## Decisión

MapLibre GL JS con teselas vectoriales de **OpenFreeMap** (gratis, sin cuenta ni clave, sin límite de uso razonable) como mapa base **definitivo** del MVP. El adaptador `modules/map/provider` se mantiene, así que un cambio futuro de proveedor sigue tocando un solo módulo.

| Criterio | MapLibre + OpenFreeMap (elegido) | Google Maps (ADR-004) |
|---|---|---|
| Estado | Hecho y probado | Por construir |
| Costo | 0, sin tarjeta | Cuota gratuita y luego pago por uso |
| Sin conexión (ADR-009) | Se puede cachear | Prohibido por sus términos |
| Datos de OSM encima | Coherente, atribución única | Sus términos limitan mezclar con otros mapas |
| Búsqueda | Sobre nuestros datos (`search_all`), tolerante a errores | Places Autocomplete (pago) |
| Cartografía rural | Depende de la comunidad OSM | Mejor cobertura y fotos satelitales |

## Alternativas descartadas

- **Google Maps (ADR-004):** por costo, por términos que rompen el uso sin conexión, y porque falta tiempo para integrarlo.
- **Teselas raster de OSM (tile.openstreetmap.org):** su política de uso no permite tráfico de producción.

## Consecuencias

**A favor:**

- Cero costo y cero claves que proteger.
- El modo sin conexión es posible.
- Una sola fuente de cartografía y de datos.

**En contra:**

- No hay vista satelital ni Street View.
- La calidad rural depende de OSM. Mitigación: el municipio y los vecinos añaden y corrigen lugares desde la app.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| OpenFreeMap deja de servir teselas | El estilo es una URL en `modules/map/provider`. Se cambia a MapTiler, Stadia o teselas propias (PMTiles en Storage) sin tocar el resto de la app |
| Un evaluador espera Google | Explicar en la demo: sin conexión, sin costo y datos abiertos de la provincia |
