# Hallazgos y plan de corrección — sr-conecta

**Fecha:** 20/10/2026
**Base:** análisis integral del proyecto (código, 25 migraciones, workflows de GitHub, documentación).
**Complemento:** [PLAN-PRODUCCION.md](./PLAN-PRODUCCION.md) — plan de acción de las 3 prioridades para producción (CI, Resend+captcha, Supabase prod + backups).

---

## Hallazgos verificados

### 🔴 Altos

1. **Producción usa la BD de staging** — `main` publica en `sr-conecta.vercel.app` apuntando al Supabase de staging; `deploy.yml` está apagado (`DEPLOY_ENABLED` ausente) y falta crear el proyecto de producción (deuda declarada en DEPLOYMENT.md).
2. **E2E y accesibilidad fuera del CI** — `ci.yml` solo corre `check` (lint + typecheck + unit + boundaries) y `test:db`. Playwright/axe (ADR-025) son manuales: una regresión funcional o de accesibilidad no bloquea PRs.
3. **`tsc --noEmit` no cubre `tests/`** — `tsconfig.json` incluye solo `src/**`; los specs de `tests/e2e` pueden romperse sin aviso.
4. **Riesgo de doble despliegue** — al activar `deploy.yml` falta `git.deploymentEnabled.main: false` en `vercel.json` (lo pide DEPLOYMENT.md §4.5).

### 🟡 Medios

5. **Documentación desfasada del repo**: ARCHITECTURE.md (v3.0, 07/10) dice 17 migraciones → hay **25** (última 17/10, `security_hardening`); "35 funciones public" → **47**; "113 pruebas" → **153**; referencias a "migración 240/300" inexistentes (numeración real por timestamp); índice con ancla rota (§20).
6. **DATABASE.md se contradice a sí mismo** (§1 dice 35, su tabla verificada dice 47) y su tabla §12 lista 17 de 25 migraciones; §5.7 dice `pdf_weekly` "sin productor" → obsoleto.
7. **Posible duplicidad de rutas**: `/negocio/[id]/*` y `/negocios/[id]/*` coexisten.
8. **`import-osm-content.mjs` bypasea moderación** — inserta `status='approved'/'published'` como `postgres` (rol con privilegios, sin RLS) y usa categorías `banco`/`gasolinera` ausentes en los seeds.
9. **Captcha pendiente** antes de abrir al público (ARCHITECTURE §10.1, README).

### 🟢 Bajos / cosméticos

10. `README` dice "4 recorridos" e2e → hay 7 `test()` en 3 specs.
11. §15 ARCHITECTURE promete `server/(queries,commands)` en todos los módulos → no todos lo cumplen (`traffic` solo `commands`); "12 módulos" en changelog vs 11 reales.
12. `.gitignore` con reglas duplicadas (`.vercel`, `.env*`); sin cobertura de código (Vitest/Playwright sin %).
13. `backup.yml` hardcodea ref de proyecto/pooler (`sdhhuacuevkfvefesapu`); `backups/` JSON contienen datos personales de staging (fuera de git, bien).
14. `RESEND_API_KEY`/`SENTRY_DSN` en `.env.example` pero no activos; correo con Gmail personal.

### ✅ Verificado correcto

- Fronteras del monolito modular (ESLint + prueba de regresión con fixtures).
- 4 clientes Supabase bien separados con `server-only` (server/client/anon/admin).
- Auth por `getClaims()`; `proxy.ts` explícitamente no es autorización.
- RLS en las 27 tablas (31 políticas) con suite PGlite de 153 pruebas.
- Cola `private.jobs` + worker/cron con secretos; PWA/service worker propio.
- Secretos fuera de git (`.env.local`, `.vercel/`, `backups/` ignorados).
- 25 ADRs coherentes con la implementación.

---

## Plan de corrección

### Fase 1 — Calidad en CI (alta, baja fricción)

1. **Cubrir `tests/` en typecheck**
   - Incluir `tests/**/*.ts` en `tsconfig.json` (o crear `tsconfig.tests.json` referenciado por un script `typecheck:tests`).
   - Corregir cualquier tipado roto que aparezca en specs.
2. **`npm run check` ampliado**: añadir `typecheck:tests`.
3. **Cobertura mínima** (opcional): `vitest run --coverage` con umbral conservador (p. ej. 70% en `src/lib` y `src/modules/**`).

### Fase 2 — Rutas duplicadas

4. **Auditar `/negocio/[id]` vs `/negocios/[id]`**: determinar cuál es la canónica (aparentemente `/negocio/[id]` es la usada por admin/outbox y `/negocios/[id]` la de detalle público).
5. **Unificar**: dejar una ruta y redirección 301 en `proxy.ts` o `redirect()` para la otra; actualizar enlaces (`href` en `src/modules/notifications/href.ts`, outbox, docs, e2e).

### Fase 3 — Pipeline OSM

6. **`data/import-osm-content.mjs`**: dejar de insertar `status='approved'/'published'` directo; importar como `pending` y dejar que la moderación valide (o documentar explícitamente como operación de arranque administrativa con `supabase/ops/`).
7. **Categorías fantasma** (`banco`, `gasolinera`): añadirlas a los seeds de migración (aditiva, ADR-017) o mapearlas a categorías existentes en el importador.

### Fase 4 — Documentación (desfase)

8. **ARCHITECTURE.md**: actualizar §8.1 (25 migraciones, 47 funciones, 153 pruebas), eliminar referencias a "migración 240/300" (usar timestamps reales), corregir ancla del índice §20, "12 → 11 módulos".
9. **DATABASE.md**: reconciliar §1 (47/35), completar tabla §12 con las 8 migraciones faltantes, actualizar §5.7 (`pdf_weekly` ya tiene productor).
10. **README**: "4 recorridos" → 7 casos e2e en 3 specs.
11. **§15 ARCHITECTURE**: matizar que no todos los módulos tienen `server/(queries,commands)`.

### Fase 5 — Seguridad operativa

12. **`vercel.json`**: añadir `git.deploymentEnabled` listo para activar junto con `deploy.yml` (evita doble despliegue).
13. **`.gitignore`**: eliminar reglas duplicadas.
14. **`backup.yml`**: mover ref de proyecto/pooler a variables (`vars.*`) en vez de hardcodear.
15. **Captcha**: trackear como precondición de apertura pública (issue/checklist, no código aún).

### Fase 6 — Pendientes de entorno (fuera del repo, checklist)

16. Crear Supabase de producción + separar BD de staging (DEPLOYMENT.md §2).
17. Activar `DEPLOY_ENABLED`/`BACKUP_ENABLED` y verificar runners por pooler (ARCHITECTURE §20 #10).
18. Traspasar secretos a gestor de la organización; activar Resend (hoy Gmail personal).

---

## Verificación por fase

- **Fases 1–2:** `npm run check`.
- **Fase 2:** e2e manual (`npm run test:e2e`).
- **Fase 3:** `npm run data:osm` en staging.
- **Fase 4:** revisión de diff de docs.
- **Fase 5:** `workflow_dispatch` de `deploy.yml` en staging.

**Orden recomendado:** Fase 1 → 2 → 4 (rápidas y sin riesgo) → 3 → 5 → 6.
