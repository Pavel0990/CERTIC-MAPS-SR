# Decisiones de arquitectura (ADR)

Cada archivo registra una decisión: contexto, decisión, alternativas, consecuencias y riesgos.
Una decisión no se edita en silencio: si cambia, su estado dice "revisada" o "retirada" con la fecha y el motivo.

| ADR | Decisión | Estado |
|---|---|---|
| [001](ADR-001-react.md) | React para la interfaz | Aceptada |
| [002](ADR-002-nextjs-app-router.md) | Next.js 16 con App Router | Aceptada |
| [003](ADR-003-typescript-strict.md) | TypeScript estricto | Aceptada |
| [004](ADR-004-google-maps.md) | Google Maps como mapa base, detrás de un adaptador | Sustituida por ADR-022 (05/10/2026) |
| [005](ADR-005-supabase.md) | Supabase como plataforma de datos | Aceptada |
| [006](ADR-006-postgresql-unica.md) | PostgreSQL como única base de datos | Aceptada |
| [007](ADR-007-postgis.md) | PostGIS con SRID 4326 | Aceptada |
| [008](ADR-008-monolito-modular.md) | Monolito modular | Aceptada |
| [009](ADR-009-pwa.md) | PWA en lugar de app nativa | Aceptada · nota de implementación del 02/10/2026 |
| [010](ADR-010-misiones.md) | Misiones | Retirada (24/09/2026) |
| [011](ADR-011-recompensas.md) | Recompensas | Retirada (24/09/2026) |
| [012](ADR-012-realtime.md) | Tiempo real solo para alertas de tránsito | Aceptada · revisada el 24/09/2026 |
| [013](ADR-013-notificaciones.md) | Notificaciones: in-app + Web Push por la cola | Aceptada · revisada el 24/09/2026 |
| [014](ADR-014-pdf.md) | PDF semanal con @react-pdf/renderer | Aceptada |
| [015](ADR-015-vercel-supabase.md) | Despliegue en Vercel + Supabase con cuentas de la organización | Aceptada |
| [016](ADR-016-cola-trabajos.md) | Cola de trabajos en PostgreSQL (outbox) | Aceptada |
| [017](ADR-017-evolucion-sin-rupturas.md) | Evolución sin rupturas | Aceptada |
| [018](ADR-018-base-de-datos-barrera.md) | La base de datos es la barrera de seguridad | Aceptada |
| [019](ADR-019-orden-despliegue.md) | Orden de despliegue y bases por PR | Aceptada · E2E revisadas por ADR-025 |
| [020](ADR-020-sin-super-admin.md) | Sin rol super_admin | Aceptada |
| [021](ADR-021-descarga-pdf-auditada.md) | Descarga del PDF con auditoría obligatoria | Aceptada |
| [022](ADR-022-maplibre-openfreemap.md) | MapLibre + OpenFreeMap como mapa base | Aceptada |
| [023](ADR-023-server-actions.md) | Server Actions para la interfaz; Route Handlers solo donde hace falta HTTP | Aceptada |
| [024](ADR-024-datos-osm.md) | OpenStreetMap como fuente provisional de datos reales | Aceptada |
| [025](ADR-025-e2e-contra-staging.md) | E2E con Playwright contra staging, fuera del CI | Aceptada |

Resumen y contexto general: [ARCHITECTURE.md §18](../../ARCHITECTURE.md#18-decisiones-de-arquitectura-adr).
