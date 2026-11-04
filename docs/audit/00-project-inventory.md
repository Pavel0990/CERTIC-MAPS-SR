# 00 · Inventario del proyecto (Fase 0, solo lectura)

> Levantado el 03/11/2026 sobre `main` en `bfa7c18`, a partir del código real y no de la documentación.
> Producción: https://sr-conecta.vercel.app (Vercel publica desde `feat/app-mvp`, que se mantiene igual a `main`).

## Tecnología real

| Capa | Qué hay |
|---|---|
| Framework | Next.js 16.4.3 (App Router, Server Components, Server Actions, `src/proxy.ts` con CSP y nonce), React 19.3.1, TypeScript 6 `strict` |
| Estilos | Tailwind CSS 4 con tokens en `src/app/globals.css` (claro y oscuro); tipografía Lexend y Nunito |
| Datos | Supabase (Postgres 17 + PostGIS, Auth, Storage, RLS); proyecto `staging`, que hoy también sirve a producción |
| Mapa | MapLibre GL 6.16 + OpenFreeMap; el worker se copia a `public/vendor/maplibre/<versión>` en `prebuild` |
| Otros | `@react-pdf/renderer` (PDF semanal), `sharp` (fotos), `web-push`, `zod` 4.6.7 |
| Dependencias | 14 de producción y 15 de desarrollo |

## Estructura

- `src/app/(app)/`: **28 pantallas**:
  - visitante: inicio, mapa, listas y fichas de negocios, turismo y rutas, entrar;
  - vecino: actividad, perfil, notificaciones, reportar, proponer, registrar negocio, consultas;
  - dueño de negocio: `/negocio`;
  - personal del municipio: `/admin` y las secciones bandeja, validaciones, informes, equipo, auditoría y catálogos, más la edición de lugares y rutas.
  Aparte: `/offline` y `/sin-permiso`.
- `src/app/api/v1/`: **15 rutas**: subida de fotos, adjuntos, cron del PDF, métricas, salud, worker de la cola, mapa (features, agregados, zonas con más reportes, capas fijas), reportes (y reporte parecido), consultas y votos, y búsqueda.
- `src/modules/`: **11 módulos** con su `index.ts` y su parte `server`: admin, businesses, citizen-reports, jobs, map, media, notifications, reports, routes, tourism y traffic. Las fronteras se verifican con `eslint-boundaries` (8 pruebas).
- Base de datos: **32 migraciones** en `supabase/migrations`, pruebas en PGlite (`supabase/tests/run.mjs`) y SQL de operación en `supabase/ops/`.
- En total: 269 archivos TS/TSX en `src`, 40 archivos Markdown y 6 workflows de GitHub (ci, security, e2e, deploy, backup, uptime).

## Pruebas existentes

| Tipo | Cantidad | Comando |
|---|---|---|
| Unitarias (Vitest) | 26 archivos, 154 pruebas | `npm test` |
| Fronteras de módulos | 8 | `npm run test:boundaries` |
| Base de datos (PGlite, incluye ataques de RLS) | 200 | `npm run test:db` |
| E2E (Playwright, contra staging) | 16 archivos: 32 se ejecutan sin la clave del captcha, 6 de captcha y 3 pendientes de las cuentas externas | `npm run test:e2e` |
| Auditoría de seguridad de la base en línea | Reglas en `supabase/ops/security_audit.sql` | `npm run db:audit` |
| Simulacro de restauración de la copia | Conteos por tabla y claves foráneas huérfanas | `npm run backup:check` |

## Auditorías previas que sirven de base (no reemplazan esta)

- `SECURITY.md`: revisiones del 17/10 y del 21/10, el aviso de Next.js del 23/10, el de Zod del 26/10 y el de minimatch del 03/11.
- `DATABASE.md` §5 y la revisión de redundancias del 03/11.
- Revisión de UX del 21/10 (PR #13), responsive a 320 px y en horizontal (PR #20), rediseño del panel (PR #21) y auditoría visual automática del 03/11 (84 combinaciones de pantalla, rol y ancho).

## Bloqueos conocidos (necesitan a una persona o una cuenta)

- Supabase de producción separado, Resend con dominio propio, Cloudflare para el captcha y los secretos de GitHub para las E2E en la CI.
- La rama de producción en Vercel (*Settings → Git*) requiere una cuenta dueña del equipo.
- Fotos propias de 18 sitios: no hay fotos con licencia libre (ver `docs/ESTADO-Y-PENDIENTES.md`).
