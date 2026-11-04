# 01 · Auditoría de arquitectura (Fase 1, solo lectura)

> 04/11/2026 · rama `auto/auditoria-integral` (base `bfa7c18`) · worktree `ui-admin`.
> Comandos ejecutados: `npx eslint .` (exit 0, sin avisos), `npx tsc --noEmit` (exit 0), `npx vitest run` (26 archivos, 154 pruebas, todas pasan).

## Diagnóstico inicial

La estructura es sana y coherente con ARCHITECTURE.md §15: `src/app` compone, `src/modules/*` guarda la lógica, y la regla de fronteras (`eslint.boundaries.mjs`) se cumple: **ninguna página importa el interior de un módulo** (todas las importaciones a `@/modules/<x>/…` desde `src/app` terminan en `index` o `server`; verificado con grep) y ninguna página consulta tablas directamente (`.from(` y `.rpc(` solo aparecen en módulos, en `lib/auth.ts`, `lib/catalogs.ts` y en la excepción documentada `api/v1/engagement`).

Lo que se les escapó a las revisiones anteriores (#15, #22) son problemas más finos: una memoización que nunca acierta, una ruta de API sin consumidor, lógica duplicada entre `lib/` y `lib/vocabulary.ts`, y cuatro formas distintas de "resultado de una acción".

## Hallazgos

| id | sev. | archivo:línea | problema | evidencia | corrección propuesta |
|---|---|---|---|---|---|
| A-01 | P2 | `src/modules/admin/server/queries.ts:166`; `src/app/(app)/admin/layout.tsx:9`; `src/app/(app)/admin/page.tsx:32` | `getPanelCounts` está envuelta en `cache()` de React, pero `cache` compara argumentos por identidad y cada llamada recibe un cliente nuevo de `createClient()`. La memoización **nunca acierta**: en `/admin` para moderadores se lanzan dos veces las 7 consultas `count` (14 por carga), y el layout las repite en cada página del panel. | `export const getPanelCounts = cache(async (supabase: ServerSupabase, municipalityId…` · layout: `getPanelCounts(await createClient())` · page: `getPanelCounts(supabase)` con otro cliente. `createClient()` (`lib/supabase/server.ts:11`) no está memoizada. | Memoizar `createClient` por request (`export const createClient = cache(async () => …)`) o hacer que `getPanelCounts` cree su cliente dentro y reciba solo `municipalityId`. Revisar otros `cache()` con el cliente como argumento. |
| A-02 | P2 | `src/app/api/v1/map/aggregates/route.ts`; `src/modules/map/server/queries.ts:19` | Ruta pública `GET /api/v1/map/aggregates` (y `fetchAggregates`) **sin ningún consumidor** en el cliente: superficie pública, caché del SW y RPC que nadie usa. | `grep -rn "map/aggregates\|fetchAggregates" src public tests` → solo la propia ruta, `server.ts:2` y el patrón de `public/sw.js:21`. | Confirmar con el equipo; si no hay plan en Fase 2, retirarla (ruta, export, patrón del SW, fila de ARCHITECTURE §12). Si se conserva, documentarla como "reservada". |
| A-03 | P2 | `src/lib/catalogs.ts:42-43` vs `src/lib/vocabulary.ts:54-69` | Etiquetas de tipos de lugar y de dificultad **duplicadas** y ya divergentes: `catalogs.ts` dice `media: 'Dificultad media'`, `vocabulary.ts` dice `media: 'Media'`. ARCHITECTURE §15 exige "los textos para personas en `lib/vocabulary.ts`… no se escriben a mano en otro lugar". | `const PLACE: Record<string,string> = { mirador: 'Mirador', … }` y `const DIFF = { baja: 'Fácil', media: 'Dificultad media', … }` en `getLabelMaps`. | Construir `categories` desde `PLACE_KIND` y `DIFFICULTY` de `vocabulary.ts` (misma capa `lib`, no rompe fronteras). Además, el mapa fusiona slugs de negocio, códigos de consulta y tipos de lugar en un solo objeto: una colisión de clave (p. ej. `otro`, `cultural`) pisa la etiqueta en silencio — no verificado contra los datos reales de staging. |
| A-04 | P2 | `src/types/ui.ts:5`; `src/app/(app)/_content/action-result.ts:7`; `src/app/(app)/perfil/actions.ts:12,15`; `src/lib/http.ts` (`RpcResult`) | Cuatro contratos de resultado para Server Actions: `StatusResult` (panel), `ActionResult` (contenido), `FormState` (perfil) y `RpcResult` crudo (`saveAvatar`). Cada consumidor traduce errores distinto (unos usan `reasonMessage(reason)`, otros `message`), y `invalid_input`, que devuelve `saveAvatar`, **no está en `REASON_MESSAGE`** (cae al genérico). | `grep "reason: 'invalid_input'"` → `perfil/actions.ts:16`; `vocabulary.ts:73-126` sin esa clave. | Unificar en `ActionResult` (con `message` ya traducido) o, al menos, documentar en §15 cuál usar y añadir `invalid_input` al vocabulario. |
| A-05 | P2 | `src/app/(app)/admin/actions.ts:29,40,55` | La validación Zod de la nota (`text(500).parse(note)`) se ejecuta **dentro** del `try` de `run()`, así que un texto largo lanza `ZodError` y se devuelve `unavailable` ("No pudimos conectar. Revisa tu conexión"). El formulario permite 1000 caracteres (`action-button.tsx:95` `maxLength={1000}`), así que al descartar una alerta o rechazar contenido con 501–1000 letras el moderador ve un error de conexión falso. | `return run((s) => moderateTrafficReport(s, id, expected, to, text(500).parse(note)), …)` | Validar con `safeParse` antes de `run` y devolver `rejected('invalid_field')`; alinear el `maxLength` del textarea con el límite de cada acción (500 / 1000). |
| A-06 | P3 | `src/app/(app)/admin/actions.ts:28-71` | Validación de forma incompleta en la frontera: `expected`, `to`, `category` y `role` llegan sin Zod (solo los UUID se validan). La RPC los rechaza (ADR-018), así que no es un riesgo de seguridad, pero contradice ADR-003 ("Zod en fronteras"). | `export async function grantRole(userId: string, role: StaffRole, …)` sin comprobar `role` en tiempo de ejecución. | `z.enum(STAFF_ROLES)` y `z.string().max(40)` para estados y categoría. |
| A-07 | P3 | `src/modules/*/server.ts` (11 archivos); `eslint.boundaries.mjs:3` | El comentario de la regla dice "server.ts (solo servidor, con 'server-only')", pero **ningún** `server.ts` importa `server-only`; la protección es transitiva (los archivos de `server/` sí lo importan, salvo `media/server/process-image.ts` y `reports/server/document.tsx`, que solo se alcanzan desde archivos que lo tienen). Hoy funciona; un `server.ts` que reexporte algo nuevo sin la marca quedaría importable desde el cliente. | `for f in …; grep -q server-only` → lista de los 11 `server.ts`. | Añadir `import 'server-only';` en cada `server.ts` (una línea, defensa en profundidad). |
| A-08 | P3 | `src/modules/map/index.ts:1` | Comentario cita ADR-004 (Google Maps, **sustituida** por ADR-022). | `// … Única frontera con el proveedor de mapa (ADR-004, ADR-008).` | Cambiar a ADR-022. |
| A-09 | P3 | `src/modules/reports/index.ts` (`closedWeeks`) | Calcula la fecha local con `new Date(now.toLocaleString('en-US', { timeZone }))`: depende del parseo no estándar de una cadena de locale. Funciona en Node/V8, pero es frágil y duplica lo que `utils/locale.ts` debería resolver. | `const local = new Date(now.toLocaleString('en-US', { timeZone: APP_TIMEZONE }));` | Usar `Intl.DateTimeFormat(...).formatToParts` en `utils/locale.ts` y reutilizarlo. |
| A-10 | P3 | `src/app/(app)/consultas/[id]/vote-button.tsx:23` | El voto va por Route Handler con `fetch` desde un componente de la interfaz, mientras ADR-023 dice "Route Handlers solo para el mapa, la cola offline, el worker y los cron". También `/api/v1/search`, `/engagement`, `/uploads/sign` y `/attachments` son Route Handlers usados solo por la interfaz (estos últimos sí los usa la cola offline). | `fetch(\`/api/v1/requests/${requestId}/vote\`, { method: 'POST' })` | Aceptarlo y ampliar el texto de ADR-023 (voto y búsqueda), o pasar el voto a Server Action. Decisión documental, no de código. |
| A-11 | P3 | `src/app/(app)/_content/action-result.ts`, `permissions.ts` | Piezas `server-only` (no visuales) viven en `(app)/_content/`, que §15 define como "pieza visual que usan varias páginas". | `import 'server-only'` en ambos. | Moverlas a `src/app/(app)/_lib/` o documentar que `_content` también aloja helpers de servidor de las páginas. |

### Código muerto: búsqueda realizada

Se buscaron los usos de 33 exportaciones públicas de `index.ts`, `vocabulary.ts` y `catalogs.ts` (`grep -rlw` excluyendo pruebas). Todas tienen consumidor salvo `isoWeek` (solo se usa dentro de `reports/index.ts`; exportarla es inocuo). El único código muerto confirmado es **A-02** (`/api/v1/map/aggregates` + `fetchAggregates`).

## Lo que está bien

- Fronteras reales y verificadas: lint en verde, prueba de regresión de fronteras, y cero importaciones al interior de un módulo desde `src/app`.
- Capas claras: Server Actions finas (validan con el esquema del módulo y delegan); `asRpcResult` como única traducción de la base.
- `getCatalogs` con `unstable_cache` + etiqueta invalidada por `updateTag` al editar un catálogo, y sin guardar fallos en la caché.
- `jobs` y `map` sin reglas de negocio; los handlers se registran por `kind` en la ruta del worker.
- Autorización redundante a propósito: el layout del panel y cada página llaman a `requireStaff` (no se confía solo en el layout).

## No verificado

- Si las claves de `getLabelMaps().categories` colisionan con los datos reales (requiere leer los catálogos de staging).
- Rendimiento real de A-01 (no se levantó servidor); el número de consultas sale de leer el código.
- `npm run test:boundaries` y `test:db` no se ejecutaron (fuera de los comandos permitidos).

## Puntuación: 4 / 5

Arquitectura disciplinada y comprobada por herramientas; ningún P0/P1. Resta un punto por la memoización inútil del panel (A-01), una API pública sin uso (A-02), la duplicación de textos que el propio documento prohíbe (A-03) y la dispersión de contratos de resultado (A-04/A-05), que ya produce mensajes de error engañosos.
