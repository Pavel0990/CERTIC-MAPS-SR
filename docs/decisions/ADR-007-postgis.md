# ADR-007 · PostGIS con SRID 4326

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §7.4 |

## Contexto

Pertenencia a municipio, viewport, rutas y cercanía son el núcleo del producto.

## Decisión

PostGIS con SRID 4326 en todas las columnas (`geometry(<Tipo>, 4326)`) y cast a `geography` con índices de expresión para distancias en metros. La pertenencia la calcula `private.locate()` en cada RPC.

## Alternativas descartadas

- Cálculos en JavaScript (Turf)
- Distancias con Google
- Almacenar en UTM 19N (EPSG:32619)

## Consecuencias

**A favor:**

- Consultas espaciales indexadas y gratuitas.
- Importación directa de los datos abiertos de la provincia.

**En contra:**

- Curva de aprendizaje de SQL espacial.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Geometrías inválidas al importar | `ST_MakeValid` y validación en tablas de staging. |
| Fronteras con huecos al simplificar | Simplificación topológica en la importación. |
