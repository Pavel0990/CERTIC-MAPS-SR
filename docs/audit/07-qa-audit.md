# 07 · QA: pruebas ejecutadas

> Rama `auto/auditoria-integral` (`8cc71df`). Solo se marca PASS lo que se ejecutó de verdad.

| Prueba | Comando | Resultado | Estado |
|---|---|---|---|
| Lint | `npx eslint .` | Sin errores ni avisos | PASS |
| Tipos (app y pruebas) | `npx tsc --noEmit` y `-p tsconfig.tests.json` | Sin errores | PASS |
| Unitarias | `npx vitest run` | 154/154 | PASS |
| Fronteras de módulos | `npm run test:boundaries` | 8/8 | PASS |
| Base de datos (PGlite: RLS, ataques, migraciones) | `npm run test:db` | **207/207** con 33 migraciones (7 nuevas: RV1–RV6 y RV2b) | PASS |
| Build de producción | `npm run build` | Compila | PASS |
| E2E contra el build de producción local | `E2E_BASE_URL=http://localhost:3200 npx playwright test` | **32 pasan**, 9 omitidas (6 del captcha sin clave y 3 que esperan cuentas externas) | PASS |
| Roles por URL directa | `tests/e2e/roles.spec.ts` | visitante → entrar; vecino → sin permiso; moderación no entra a equipo, auditoría, informes ni catálogos; administración entra a todo | PASS |
| Sin conexión | `tests/e2e/sin-conexion.spec.ts` | Lo visitado se ve sin red; lo nuevo muestra «Estás sin conexión» | PASS |
| Accesibilidad (axe, claro y oscuro) | `accesibilidad*.spec.ts` + 86 análisis del agente de UI | Una sola infracción: el botón de atribución de MapLibre (2.5.8), en un archivo del PR #25 | PASS con observación |
| Responsive de 320 a 1920 px | Agente de UI: 30 pantallas × 6 anchos | 0 desbordes, 0 elementos fuera de la pantalla | PASS |
| Seguridad en vivo (sin destruir) | Agente de seguridad contra producción | RLS, CSRF, secretos, `?next=`, cabeceras y `npm audit` correctos | PASS |

## No ejecutado (y por qué)

- **E2E contra producción con la migración nueva:** la migración no está aplicada todavía.
- **Falla simulada de la base** para ver la pantalla de error del panel (F-01): solo se verificó por tipos y por código.
- **INP de interacciones pesadas** y «Ver más»: no se midieron (ver 08).
- **Fichas y pantallas de edición** en el análisis automático de la UI: el script las midió como 404 (ver 03).
- **Captcha real y envío de correos:** necesitan las claves de Cloudflare y Resend.
