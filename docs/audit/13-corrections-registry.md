# 13 · Registro de correcciones

> Rama `auto/auditoria-integral`, commits `f13a356` (ronda 1) y `8cc71df` (ronda 2), sobre `bfa7c18`.
> La migración `20261104120000_audit_review_fixes.sql` se aplicó en staging el 04/11, con copia previa (`backups/staging-202611041559.json`).

## Corregido

| Id | Prioridad | Archivo | Problema | Causa raíz | Solución | Prueba |
|---|---|---|---|---|---|---|
| S-01 / B-01 | P2 (seguridad, escalamiento vertical) | migración `20261104120000` → `change_request_status`, `revoke_role` | Un moderador al que le quitaban el rol podía pasar a «en proceso» o «resuelto» las consultas que tenía asignadas, y su nota le llegaba al vecino como respuesta oficial | La cláusula `assigned_to = v_uid` no comprobaba el rol, y `revoke_role` no liberaba la asignación | La asignación exige `user_has_role` en el municipio; `revoke_role` libera las consultas abiertas; la migración limpia las asignaciones colgadas | RV3, RV4 en `supabase/tests/run.mjs` ✅ |
| DB-02 | P2 (integridad de datos) | migración → `traffic_reports.published_at`, trigger, `kpi_summary`, `report_hotspots` | Las alertas que vencían sin revisar se contaban como publicadas en el mapa de calor público y en los indicadores y el PDF | `expired` mezclaba «caducó después de publicarse» con «nadie la revisó» | Columna `published_at`, sellada por un trigger al pasar a active o verified y rellenada con la auditoría y la moderación; los conteos filtran `published_at is not null` | RV1, RV2 ✅ |
| DB-04 | P2 (datos personales) | migración → grants de `audit_logs` | La administración municipal leía la IP y el navegador de los vecinos | `grant select` de tabla completa | Grant por columna (`id, created_at, province_id, municipality_id, actor_id, actor_role, action, entity_type, entity_id, result`) | RV5, RV6 ✅ |
| F-01 | P1 (frontend) | `src/modules/admin/server/queries.ts` | Si la base fallaba, la bandeja decía «Nada pendiente» y el menú mostraba 0 | Las lecturas descartaban `error` y devolvían `data ?? []` | `must()` y `mustCount()`: un error lanza y aparece la pantalla de error con «Intentar otra vez» | tsc, E2E 32/32 ✅ (el caso de falla no se simuló) |
| F-02 | P2 | 6 componentes del panel (`action-button`, `cards`, `team-controls`, `catalog-editor`, `download-button`, `generate-form`) | Sin red, la Server Action lanzaba y tumbaba la pantalla entera | Sin manejo del rechazo | `.catch(() => ({ status: 'rejected', reason: 'unavailable' }))` y aviso en palabras | tsc ✅ |
| F-03 | P2 | `consultas/[id]/vote-button.tsx` | Sin red, el voto optimista se quedaba sumado | `fetch` sin `catch` | Se deshace el voto y se avisa | tsc ✅ |
| F-04 | P2 | `admin/actions.ts` | El campo de motivo admitía 1000 letras y la acción validaba 500, con un falso «No pudimos conectar» | Límites distintos entre el campo y la acción | La acción valida 1000, igual que el campo y la base | tsc ✅ |
| A-01 | P2 (rendimiento) | `getPanelCounts` | `cache()` nunca acertaba: 14 consultas en lugar de 7 por carga del panel | La clave era un cliente nuevo en cada llamada | La clave es el municipio y el cliente se crea dentro | tsc, E2E ✅ |
| A11Y 2.4.11 | P2 (accesibilidad) | `globals.css` | En el teléfono, la barra inferior tapaba el control enfocado | Barra fija sin `scroll-padding` | `scroll-padding-bottom` en pantallas de menos de 768 px | E2E 32/32 ✅ (no hay prueba específica) |
| A11Y foco | P2 | `kpi-parts.tsx` (HelpTip) | El «?» de los indicadores no tenía un foco visible para la auditoría | Anillo con 30 % de opacidad | Anillo sólido del color de la marca | — |
| UX tope | P2 | `admin/bandeja/page.tsx` | La bandeja cortaba en 100 elementos sin decirlo | `limit(100)` silencioso | Aviso: «Se muestran los 100 primeros. Usa los filtros…» | — |
| D-01..D-05 | P1/P2 (documentación) | DATABASE, guion-demo, ARCHITECTURE, README, DEPLOYMENT | Cifras viejas (195 pruebas, 51 funciones), el guion de la demo decía 195, y había variables de Google Maps que el código no lee | Las cifras no se actualizaron junto con las migraciones | Cifras al día (33 migraciones, 52 funciones, 206 pruebas), §5.25 nueva, «más de 200» en el guion y se quitaron las variables de Google | — |

## Corregido tras la revisión cruzada (12-cross-review.md)

| Id | Problema | Solución | Prueba |
|---|---|---|---|
| N-02 (regresión, P2) | Una alerta publicada y después rechazada volvía a contar en el mapa de calor y en «publicadas» | Los conteos filtran `published_at is not null and status <> 'rejected'` | RV2b ✅ (207/207) |
| N-01 (P2) | Los motivos de contenido y el rechazo de consultas tienen tope de 500 en la base; el campo admitía 1000 | El campo y `review` validan 500; las notas de tránsito y de estado (tope de 1000) quedan dentro | tsc ✅ |
| N-05 (P3) | Si fallaban los contadores del menú, se caía todo el panel | El layout muestra el menú sin números | tsc, E2E ✅ |
| N-07 (P3) | El import dinámico de `outbox-sync` no ahorraba nada y podía perder fotos si fallaba la carga del chunk | Revertido | E2E ✅ |

## Intentado sin efecto

| Id | Qué se hizo | Resultado medido |
|---|---|---|
| PERF JS inicial | `OutboxSync` cargaba el subidor de fotos con `import()` dinámico (revertido, N-07) | El JS de `/negocios` sigue en 878 KB sin comprimir, con un chunk de 363 KB que incluye el cliente de Supabase. Llega por otra importación compartida que no se identificó. Queda **abierto**: hace falta analizar el bundle |

## No corregido en esta rama (con su motivo)

| Id | Motivo |
|---|---|
| PERF fuentes (`layout.tsx`), LCP de la portada (`discover.tsx`), MapLibre en inglés y el tamaño del botón de atribución (`maplibre-canvas.tsx`), foco del buscador (`search-box`) | Esos archivos están en los PR abiertos #25 y #26 de otra sesión. Corregirlos aquí causaría conflictos. Quedan para después de fusionar esos PR |
| S-02 captcha, DB-01 base de pruebas = producción, DB-03 copia de Storage, OPS-02/03/04/06 (secretos de GitHub, rama de Vercel, Sentry) | Necesitan cuentas o permisos del dueño |
| DB-05 moderación lee perfiles de toda la provincia | Restringir la política afecta la búsqueda de personas al dar roles. Es una decisión de diseño que queda para el dueño |
| DB-06 `find_similar_reports` lento en los picos | Hace falta EXPLAIN con permisos de ejecución; el usuario de solo lectura no puede |
| F-05 idempotencia de las propuestas, A-02..A-04, errores de los formularios no asociados al campo, P3 | De menor impacto; quedan documentados en sus informes |

> Las filas de los PR #25 y #26 se corrigieron en `b0747ba`, una vez fusionados. A-03, A-04 y los errores por campo, en la ronda del 09/11 (abajo).

## Corregido el 09/11/2026 (rama `Veneno`, solo código, sin migraciones)

| Id | Problema | Solución | Prueba |
|---|---|---|---|
| A-03 | Etiquetas de tipo de lugar y de dificultad copiadas en `catalogs.ts`, ya distintas de `vocabulary.ts` | `getLabelMaps` usa `PLACE_KIND` y `DIFFICULTY.phrase`; `phrase` («Dificultad media») sirve donde la palabra va sola | tsc ✅ |
| A-04 (parte) | `invalid_input` caía al mensaje genérico | Agregado a `REASON_MESSAGE` | tsc ✅ |
| A-05 / A-06 | Zod lanzaba dentro del `try` (falso «No pudimos conectar») y estados, categoría y rol llegaban sin validar | `safeParse` antes de `run`; códigos con `^[a-z0-9_-]{2,60}$` y `isStaffRole` | tsc, E2E ✅ |
| A-07 | Ningún `server.ts` llevaba `server-only` | `import 'server-only'` en los 11 | build ✅ |
| A-08 | Comentario citaba ADR-004 (sustituida) | ADR-022 | — |
| F-07 | «Mi negocio» se marcaba en `/negocios` | Coincidencia exacta con `/negocio` y `/negocio/…` | tsc ✅ |
| F-08 | «Ir al mapa» llevaba a Inicio | «Volver al inicio» y «Ver negocios» | — |
| F-09 | El título de la consulta en la bandeja recargaba la app | `Link` | E2E ✅ |
| F-10 | «Volver» decidía con `document.referrer`, que en una SPA no cambia | `NavigationTracker` en el layout anota si se navegó dentro de la app desde la última carga | E2E ✅ |
| F-11 / A11Y-04 | Los asistentes mostraban un solo error al pie del paso | `useFieldErrors`: cada error en su `Field` (aria-invalid y aria-describedby), vuelve al paso del campo, abre el `<details>` si hace falta y enfoca el primero. En registrar negocio, proponer lugar y proponer ruta | tsc ✅ (no se simuló un error a mano) |
| F-12 | «Archivar» un negocio aprobado no pedía confirmación | `confirm` como en «Quitar rol» | tsc ✅ |
| A11Y-07 | `main` anidado e `id` duplicado en «no encontrado» y en el error de la app; la pestaña decía «Negocio» | `(app)/not-found.tsx` y `error.tsx` con `<div>`; la raíz conserva su `<main>`; título «Página no encontrada» también en las fichas | Medido: 1 `main` en ambos casos ✅ |
| A11Y-08 | Al abrir un asistente el foco saltaba al `h1` y el primer Tab se saltaba «Saltar al contenido» | `useFocusOnChange`: el foco va al título solo al cambiar de paso | Medido: el primer Tab cae en «Saltar al contenido» ✅ |
| A11Y-09 | Bandeja: de `h1` a `h3` | `h2` visualmente oculto con la pestaña activa | — |
| A11Y-10 | Avisos que se borraban a los 4 s y botón de cerrar de 24 px | Los errores se quedan hasta cerrarlos; los demás duran 7 s y se pausan con el puntero o el foco; botón de 44 px | E2E ✅ |
| PERF-05 | Cada ficha descargaba el motor de mapas aunque nadie viera el minimapa | `MapCanvas lazy`: carga al acercarse a la pantalla (300 px antes). En fichas cortas el mapa ya está en la primera pantalla y carga igual; el ahorro está en las largas | Medido ✅ |
| DB-01 (parte) | `staging-test-users.mjs` solo rechazaba `prod` en una variable que nadie definía | Exige `SUPABASE_ENV=staging` (agregado a `.env.example`) | — |

Pruebas de la ronda: `check` (154 unitarias, 8 de fronteras), `build` y E2E 36/36 contra el build de producción (9 omitidas: captcha y producción).
