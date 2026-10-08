# ADR-025 · Pruebas E2E con Playwright contra staging, fuera del CI

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 05/10/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §14.2 · revisa en parte [ADR-019](ADR-019-orden-despliegue.md) |

## Contexto

ADR-019 preveía E2E en el CI contra un Supabase local levantado con las migraciones del PR. Eso exige Docker en el runner y la CLI de Supabase en modo local, y tarda varios minutos por PR. A la vez, el recorrido que más importa probar ("un vecino reporta → el moderador publica → aparece en el mapa") necesita Auth, Storage, Realtime y la cola **reales**, que PGlite no tiene.

## Decisión

- **El CI corre lo que no necesita cuentas ni servicios:** lint (con fronteras), tipos, unitarias, la prueba de fronteras y las pruebas de la base en PGlite. Estas últimas incluyen ataques directos y todas las reglas de negocio.
- **Las E2E (`npm run test:e2e`) se corren a mano** contra la app local y el Supabase de **staging**:
  - entran con códigos de un solo uso generados para las cuentas de prueba;
  - usan Edge en Windows, sin descargar navegadores;
  - **borran lo que crean**.
- **Lo que depende del teléfono** (GPS real, cámara, push, quitar la señal) se prueba a mano con la tabla del guion de la demo.

## Alternativas descartadas

- **Supabase local con Docker en el CI (ADR-019):** costo y tiempo altos para un equipo de 2–3 personas durante el reto. Queda para la Fase 2, junto con Supabase Branching.
- **E2E en el CI contra staging:** pondría el `service_role` de staging en GitHub Actions de un repositorio público y crearía datos en cada PR.

## Consecuencias

**A favor:**

- Prueba real del recorrido central.
- Ningún secreto en el CI.

**En contra:**

- Las E2E dependen de que alguien las corra. Mitigación: lo exige la regla de [REPARTO-DE-TRABAJO.md](../REPARTO-DE-TRABAJO.md) antes de subir a `main`.
