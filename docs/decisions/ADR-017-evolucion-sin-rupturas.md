# ADR-017 · Evolución sin rupturas

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 24/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §3 principio 9 |

## Contexto

El proyecto pasará de piloto a producción provincial y quizá regional, heredado por otro equipo. Reescribir el esquema es el costo más alto de esa evolución.

## Decisión

Adoptar desde el MVP las medidas de costo casi nulo hoy y alto después (tabla abajo).

| Medida desde el MVP | Evita en el futuro |
|---|---|
| `provinces` y `province_id` con FK compuesta territorial | Migración multi-provincia con backfill y reescritura de todas las políticas RLS |
| Estados `text` + `CHECK` y tablas de transiciones | `enum` que no permite quitar ni renombrar valores |
| Catálogos en tablas (tipos de tránsito, categorías, rate limits) | Deploys para cambiar reglas operativas |
| Cola con contrato estable (`kind`, `payload`, `dedupe_key`) | Reescribir productores al cambiar a `pgmq` o Inngest |
| `audit_logs` con PK `(created_at, id)` | Reescribir la tabla para particionarla |
| Snapshots de KPIs inmutables por ejecución | Perder la trazabilidad entre un PDF y sus datos |
| `translations jsonb` | Tablas de traducción añadidas después |
| Storage: solo `bucket` + `path` en la base | Migrar URLs al cambiar de dominio o CDN |
| API `/api/v1` solo aditiva | Romper PWAs instaladas con código viejo en caché |
| Adaptadores en las fronteras (mapa, canales) | Tocar el dominio al cambiar de proveedor |
| `feature_flags` por territorio | Ramas largas para pilotos por municipio |
| `slug` público separado del `uuid` | Romper enlaces compartidos al renombrar |

## Alternativas descartadas

- YAGNI estricto: construir lo mínimo y migrar después

## Consecuencias

**A favor:**

- Las fases 2 y 3 se construyen agregando piezas.

**En contra:**

- Algo más de complejidad inicial en RLS (filtro por provincia).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Sobre-diseño | Solo medidas de costo casi nulo; tiles propios, réplicas y `pgmq` siguen postergados. |
