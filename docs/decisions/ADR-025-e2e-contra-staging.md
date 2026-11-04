# ADR-025 · Pruebas E2E con Playwright contra staging, a mano y en un workflow opcional

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada · revisada el 21/10/2026 | 05/10/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §13.3 y §14.2 · revisa en parte [ADR-019](ADR-019-orden-despliegue.md) |

## Contexto

ADR-019 preveía E2E en el CI contra un Supabase local levantado con las migraciones del PR. Eso exige Docker en el runner y la CLI de Supabase en modo local, y tarda varios minutos por PR. A la vez, el recorrido que más importa probar ("un vecino reporta → el moderador publica → aparece en el mapa") necesita Auth, Storage, Realtime y la cola **reales**, que PGlite no tiene.

## Decisión

- **El CI (`ci.yml`) corre lo que no necesita cuentas ni servicios:** lint (con fronteras), tipos, unitarias, la prueba de fronteras y las pruebas de la base en PGlite. Estas últimas incluyen ataques directos y todas las reglas de negocio.
- **Las E2E (`npm run test:e2e`) corren contra staging** con las cuentas de prueba de `scripts/staging-test-users.mjs`:
  - entran con códigos de un solo uso generados para esas cuentas;
  - usan Edge en Windows, sin descargar navegadores, y Chromium en Linux;
  - **borran lo que crean**;
  - **se pueden repetir:** antes de cada corrida, `tests/e2e/global-setup.ts` reinicia los límites por hora (`e2e_reset_rate_limits`, solo `service_role` y solo cuentas `@example.com`) y la reputación de las cuentas de prueba.
- **Se corren a mano antes de subir** y, desde la revisión del 21/10, también en **`.github/workflows/e2e.yml`**:
  - construye la app en el runner (`next build` + `next start`) y prueba con Chromium contra staging, incluidas las de axe en claro y oscuro y la de navegación rápida;
  - en cada PR del propio repositorio (no de forks ni de Dependabot), en cada push a `main` y a pedido;
  - **apagado** hasta que exista la variable `E2E_ENABLED=true`;
  - los secretos viven en el entorno `e2e-staging`, no en los del repositorio; `CRON_SECRET` y `JOBS_SECRET` se generan al azar en cada corrida;
  - una sola corrida a la vez (`concurrency: e2e-staging`), porque las cuentas son compartidas;
  - si falla, sube el reporte HTML y las trazas como artefacto (14 días).
- **Lo que depende del teléfono** (GPS real, cámara, push, quitar la señal) se prueba a mano con la tabla del guion de la demo.

## Alternativas descartadas

- **Supabase local con Docker en el CI (ADR-019):** costo y tiempo altos para un equipo de 2–3 personas durante el reto. Queda para la Fase 2, junto con Supabase Branching.
- **Probar contra la vista previa de Vercel:** la vista previa usa staging igual, pero el workflow tendría que esperar el despliegue y saltar la protección de las vistas previas. Construir en el runner prueba exactamente el código del PR.
- **Una cuenta nueva por corrida** en lugar de reiniciar los límites: también sería repetible, pero dejaría cuentas que borrar y el moderador y la administración necesitan roles asignados.

## Consecuencias

**A favor:**

- Prueba real del recorrido central, ahora en cada PR.
- Se pueden correr varias veces seguidas sin tocar la base.

**En contra:**

- **El `service_role` de staging pasa a estar en GitHub Actions.** La versión del 05/10 lo descartaba por eso. Mitigaciones: entorno `e2e-staging` (se le puede exigir aprobación), sin acceso para forks ni Dependabot, apagado por defecto. Mientras la app publicada use la base de staging (ARCHITECTURE.md §13.1), ese secreto da acceso a datos reales: lo ideal es activar el workflow después de separar la base de producción (DEPLOYMENT.md §3).
- Cada corrida crea y borra una alerta y cambia la foto de la cuenta de prueba en staging.
- Mientras el workflow esté apagado, las E2E dependen de que alguien las corra. Mitigación: lo exige la regla de [ESTADO-Y-PENDIENTES.md §7](../ESTADO-Y-PENDIENTES.md#7-reglas-para-trabajar-en-equipo) antes de subir a `main`.
