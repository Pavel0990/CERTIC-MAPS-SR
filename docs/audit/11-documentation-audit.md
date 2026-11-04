# 11 · Auditoría de documentación (Fase 1, solo lectura)

> 04/11/2026 · rama `auto/auditoria-integral` (base `bfa7c18`) · worktree `ui-admin`.
> Alcance: los 39 `.md` versionados (`git ls-files '*.md'`, sin `docs/audit/`).
> Comprobaciones automáticas: (1) cada enlace relativo `](…)` existe en disco; (2) cada ruta entre comillas invertidas que empieza por `src/`, `scripts/`, `supabase/`, `tests/`, `docs/`, `public/` o `data/` existe (46 rutas); (3) cada `npm run <x>` documentado existe en `package.json`; (4) cada comando de la CLI de Supabase lleva `--remote`; (5) variables de entorno documentadas frente a `src/config/*.ts`; (6) `TODO`, `FIXME`, `HACK`, `XXX`.

## Diagnóstico inicial

La documentación es extensa, en buen español y casi toda correcta: **0 enlaces relativos rotos**, **0 `TODO/FIXME/HACK/XXX`** en el repositorio, todos los `npm run` documentados existen, y los comandos de la CLI v3 en DEPLOYMENT.md y ESTADO-Y-PENDIENTES.md ya llevan `--remote`.

El problema principal es de **cifras**: DATABASE.md se declara "el único lugar del repositorio con estas cifras", pero las cifras están copiadas en README, ARCHITECTURE, ESTADO-Y-PENDIENTES y el guion de la demo, y **ninguna coincide entre sí ni con el código**. Hay también instrucciones que inducen a error (variables de entorno que el código no lee, una CLI sin versión fija).

## Hallazgos

| id | sev. | archivo:línea | problema | evidencia | corrección propuesta |
|---|---|---|---|---|---|
| D-01 | **P1** | `DATABASE.md:10-16` | La "fuente única de cifras" está desactualizada: dice **51 funciones** y **195 pruebas de la base**. Su propio comando de verificación da **52**, y ESTADO-Y-PENDIENTES.md:36 y el inventario dicen **200** pruebas (tras las dos migraciones del 03/11). Cabecera "Versión 1.4 · 7 de octubre" que "complementa ARCHITECTURE.md (v3.0)", cuando ARCHITECTURE va por la 3.3. | `grep -ohE "function public\.[a-z_]+" supabase/migrations/*.sql \| sort -u \| wc -l` → `52`. | Actualizar la tabla (52 funciones, 200 pruebas tras correr `npm run test:db`) y la cabecera. Añadir a la CI un paso que compare la cifra de funciones con el grep. |
| D-02 | **P1** | `docs/guion-demo.md:54` | El **guion de la demo ante el jurado** dice "195 pruebas de la base de datos"; la cifra vigente es 200. Es la frase que se dirá en voz alta en el criterio de calidad técnica. | `"195 pruebas de la base de datos, con ataques directos incluidos…"` | Cambiar a la cifra vigente o, mejor, a "más de 200" para no volver a desincronizarla; enlazar DATABASE.md. |
| D-03 | P2 | `ARCHITECTURE.md:1242,1244`; `README.md:90` | Cifras de pruebas viejas: "127 pruebas" unitarias (hoy **154** en 26 archivos, `npx vitest run`) y E2E "23 pruebas en 9 archivos" (hoy **17** archivos `.spec.ts` en `tests/e2e/`). | `ls tests/e2e/*.spec.ts \| wc -l` → `17`; vitest → `Tests 154 passed`. | Quitar las cifras de ARCHITECTURE y README y enlazar a la tabla de DATABASE.md / ESTADO, como promete DATABASE.md:10. |
| D-04 | P2 | `docs/ESTADO-Y-PENDIENTES.md:36`; `docs/audit/00-project-inventory.md` | Tres cuentas distintas de E2E: ESTADO dice "37 pruebas en 14 archivos", el inventario "16 archivos", el disco tiene **17**. (No se pudo contar las pruebas sin ejecutar Playwright; un grep de `test(` da ~43, incluye las saltadas.) | `ls tests/e2e/*.spec.ts` → 17. | Contar con `npx playwright test --list` y fijar la cifra en un solo lugar. |
| D-05 | P2 | `DEPLOYMENT.md:101,172-181` | La tabla de variables marca `NEXT_PUBLIC_GOOGLE_MAPS_KEY` y `NEXT_PUBLIC_GOOGLE_MAP_ID` como "Opcional", y la §7 dice "ponla en Vercel… y vuelve a desplegar". **El código no lee esas variables** y no existe adaptador de Google: seguir los pasos no cambia nada (y obliga a crear un proyecto con facturación). | `grep -rn GOOGLE src` → sin resultados. | Quitar las dos filas de la tabla y reducir §7 a una línea: "volver a Google exige escribir un adaptador nuevo en `modules/map/provider/` (ADR-004, sustituida)". |
| D-06 | P2 | `package.json:23`, `scripts/db-audit.mjs:19`, `scripts/backup-snapshot.mjs:15`, DEPLOYMENT.md, ESTADO §7; `.github/workflows/deploy.yml:50-51` | **La CLI de Supabase no tiene versión fija** en local: no es dependencia (`node_modules/.bin` no la tiene), así que cada `npx supabase …` descarga la última. Fue exactamente lo que rompió los scripts con la v3. A la vez, `deploy.yml` fija `supabase@2.119.0` y hace `db push --include-all --yes` **sin `--remote`**: hoy funciona (v2), pero si alguien lo sube a v3 siguiendo la documentación, el push iría a la base local del runner y el despliegue publicaría código sin migrar (justo lo que ADR-019 prohíbe). | `ls node_modules/.bin \| grep supabase` → vacío; `deploy.yml:51` sin `--remote`. | Añadir `supabase` como `devDependency` con versión exacta (v3) y usarla en scripts y workflows; en `deploy.yml`, pasar a v3 con `db push --remote` (o `--db-url`) y anotarlo en DEPLOYMENT.md. |
| D-07 | P2 | `data/README.md:22` | Único comando de la CLI que usa `--linked` en lugar de `--remote`, contra la regla de DEPLOYMENT.md:50 ("sin `--remote` … no toca el proyecto vinculado"). No se pudo verificar si `--linked` sigue existiendo en la v3. | `npx supabase db query --linked -f supabase/ops/load_osm_content.sql` | Igualar a DEPLOYMENT.md:192 (`--remote`). |
| D-08 | P2 | `docs/ESTADO-Y-PENDIENTES.md:101`; `ARCHITECTURE.md:1341` | Dice que quedó "un solo `StatusResult` para las acciones del panel y del perfil", y §15 lo nombra como fuente única. En el código, el perfil usa `FormState` (`perfil/actions.ts:12`) y `saveAvatar` devuelve `RpcResult` (`:15`); el contenido usa `ActionResult`. Ver A-04 en 01. | `export type FormState = { ok?: boolean; error?: string };` | Unificar el código o corregir el texto: hoy hay cuatro contratos. |
| D-09 | P2 | `ARCHITECTURE.md:1051-1071` (§12.2), `DATABASE.md` | Funcionalidad sin documentar: `GET /api/v1/map/hotspots` y la RPC `report_hotspots` (migración `20261028130000`, capa "Zonas con más reportes") **no aparecen** en la tabla de endpoints ni en DATABASE.md; solo en ESTADO-Y-PENDIENTES.md:95,153. Al revés, `/api/v1/map/aggregates` está documentado pero nada lo usa (A-02). | `grep -c report_hotspots DATABASE.md ARCHITECTURE.md` → `0` y `0`. | Añadir la fila del endpoint en §12.2 y la función en DATABASE.md §6. |
| D-10 | P3 | `ARCHITECTURE.md:379` | Ruta inexistente: `src/app/(app)/_components/explorer.tsx` (hoy `_components/explorer/explorer.tsx`, tras el PR #22). | Comprobación (2): única ruta de 46 que no existe (aparte de la histórica `_contenido/`, ya marcada como hecha). | Corregir la ruta. |
| D-11 | P3 | `ARCHITECTURE.md:237,1459`; `docs/decisions/ADR-002-nextjs-app-router.md:13` | "`proxy.ts` solo para sesión", mientras §15 (`:1336`) y el inventario dicen "sesión + CSP con nonce". | `src/proxy.ts` genera el nonce y la CSP (`lib/csp.ts`). | "`proxy.ts`: sesión y CSP con nonce (no es autorización)". |
| D-12 | P3 | `DEPLOYMENT.md:97` | `APP_TIMEZONE` aparece como variable configurable, pero el código usa la constante `APP_TIMEZONE = 'America/Santo_Domingo'` (`src/utils/locale.ts:2`) y nunca lee el entorno. | `grep -rn "process.env.APP_TIMEZONE" src` → vacío. | Quitarla de la tabla (o leerla en `utils/locale.ts`). |
| D-13 | P3 | `ARCHITECTURE.md` §6.3 | Promete errores por campo con `aria-describedby` y foco al primer error en todos los formularios; los asistentes muestran un único aviso general (ver F-11 en 02). | `setError(parsed.error.issues[0]?.message …)` | Ajustar el texto o el código. |
| D-14 | P3 | `src/modules/map/index.ts:1`, `src/modules/map/types.ts:1` | Comentarios de código que citan ADR-004 (sustituida) como vigente. | `(ADR-004, ADR-008)` | Citar ADR-022. |
| D-15 | P3 | `docs/audit/00-project-inventory.md` | El inventario pone `/sin-permiso` "aparte" junto a `/offline`, pero está dentro de `(app)/` (con su layout); y cuenta 16 archivos E2E (son 17). | `src/app/(app)/sin-permiso/page.tsx` | Corregir en la próxima versión del inventario. |

## Lo que está bien

- 0 enlaces relativos rotos en 39 documentos y 244 enlaces; 45 de 46 rutas de archivo citadas existen.
- 0 `TODO`, `FIXME`, `HACK` o `XXX` en todo el repositorio.
- AGENTS.md es correcto: `node_modules/next/dist/docs/` y `generate-agent-files.js` existen.
- Los ADR tienen archivo propio, estado explícito (sustituida, retirada) y la tabla §18.1 de "decisiones que cambiaron" es una buena práctica poco común.
- DEPLOYMENT.md:50 explica bien la trampa de la CLI v3 (`--remote`) y los procedimientos de ESTADO §7 la respetan.

## No verificado

- El número real de pruebas de la base (`npm run test:db`) y de E2E (`playwright test --list`): no se ejecutaron, por las reglas de esta fase.
- Si `--linked` sigue siendo una opción válida en la CLI v3 (D-07): no hay CLI instalada localmente y no se descargó.
- Anclas `#…` de los enlaces internos (solo se comprobó el archivo, no la sección).
- Contenido funcional de `docs/manual-administrativo.md`, `docs/prueba-con-vecinos.md` y `docs/plan-de-operacion.md` frente a cada pantalla: solo se verificaron rutas y comandos.

## Puntuación: 3,5 / 5

Documentación rica, enlazada y sin deudas marcadas. Pierde puntos porque la regla "las cifras viven en un solo lugar" no se cumple y ese lugar está desactualizado (D-01), con la cifra equivocada en el guion para el jurado (D-02); y porque hay instrucciones que no producen efecto (D-05, D-12) o que pueden llevar a desplegar sin migrar al actualizar la CLI (D-06).
