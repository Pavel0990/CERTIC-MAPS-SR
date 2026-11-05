# Plan de producción — 3 prioridades (sr-conecta)

**Fecha:** 20/10/2026
**Complemento de:** [HALLAZGOS-Y-PLAN.md](./HALLAZGOS-Y-PLAN.md)
**Orden:** 3 (CI, sin dependencias externas) → 2 (Resend + captcha, días) → 1 (producción, requiere cuenta/secretos nuevos).

---

## Prioridad 1 — Supabase de producción + backups automáticos

**Objetivo:** separar BD de staging y tener backups diarios activos.

1. **Crear proyecto Supabase de producción** (región East US, plan Pro o Free con antifraz) — fuera del repo, manual, según DEPLOYMENT.md §2.
2. **Aplicar esquema**: `supabase link --project-ref <prod>` + `supabase db push --include-all` (25 migraciones).
3. **Cargar datos base**: `supabase/ops/load_osm_boundaries.sql` + `load_osm_content.sql` (ADR-024) y `grant_provincial_admin.sql` para el admin inicial.
4. **Vars de entorno en Vercel (producción)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `JOBS_SECRET`, VAPID, `APP_TIMEZONE`, etc. (lista exacta = `.env.example`).
5. **Configurar Auth/SMTP Resend** en el nuevo proyecto + `worker_url`/`jobs_secret` en Vault (para `pg_net`).
6. **Activar backups**: `vars.BACKUP_ENABLED=true` + secretos `SUPABASE_DB_URL` (o `SUPABASE_DB_PASSWORD` + `POOLER_*`), probar con `workflow_dispatch`.
7. **Cambiar `HEALTH_URL`** al dominio final cuando exista; activar `vars.DEPLOY_ENABLED=true` **junto con** `git.deploymentEnabled.main:false` en `vercel.json` (Fase 5 de HALLAZGOS-Y-PLAN.md).

**Verificación:** `supabase db push` idempotente → `/api/v1/health` OK → `supabase/ops/smoke_remote.sql` sin errores → backup manual descifrado restaurable en local.

---

## Prioridad 2 — Captcha + Resend (correo transaccional)

**Objetivo:** cerrar los dos huecos marcados "antes de abrir al público".

### Resend

1. Crear API key en Resend + dominio verificado (SPF/DKIM) → `RESEND_API_KEY` en Vercel.
2. Verificar que Supabase Auth usa el SMTP de Resend (plantillas ya en español en `supabase/config.toml`).
3. Probar magic link end-to-end (`npm run test:e2e` cubre signIn por OTP).

### Captcha (decisión técnica pendiente — requiere ADR nuevo)

- **Opción A (recomendada, sin backend nuevo): Turnstile de Cloudflare** en `/entrar`, `/reportar`, `/proponer`:
  - widget en cliente + verificación server-side en las Server Actions correspondientes (`src/app/(app)/entrar/actions.ts`, `reportar`, `proponer/actions.ts`) con `zod`.
- **Opción B:** hCaptcha/reCAPTCHA v3 (más pesado, política de datos).
- Añadir `TURNSTILE_SECRET_KEY`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` a `.env.example`.
- Exigir captcha también en las RPC de alto volumen si se detecta abuso (rate limit ya existe en BD).

### Docs

4. Actualizar ARCHITECTURE §10.1 y README (marcar ítems como hechos) + **ADR-026** captcha.

**Verificación:** e2e de signIn sigue pasando (captcha en modo test key con hostname permitido `localhost`); intento sin token → Server Action rechaza.

---

## Prioridad 3 — E2E + typecheck de tests en CI

**Objetivo:** que las regresiones funcionales y de accesibilidad bloqueen PRs.

1. **`typecheck` cubra `tests/`**
   - Ampliar `tsconfig.json` `include` con `tests/**/*.ts` (o `tsconfig.tests.json` + script `typecheck:tests`).
   - Corregir errores de tipos que aparezcan en specs.
2. **Job de e2e en CI** (`.github/workflows/ci.yml`, job nuevo `e2e`):
   - `npm ci` → build → `npm start` (o `next dev`) con vars de **staging** (secretos `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
   - Crear cuentas de prueba vía `scripts/staging-test-users.mjs` (idempotente).
   - `npx playwright install --with-deps chromium` (usar chromium en CI, no msedge).
   - `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.
   - `needs: check` para no correr si fallan lint/typecheck.
3. **Concurrencia**: toca la BD de staging en paralelo a los PRs → secretos dedicados de e2e o `concurrency: e2e-${{ github.ref }}`.
4. **Nota ADR-025**: actualizar ese ADR para reflejar que los e2e ahora corren en CI (o añadir nota de revisión).

**Verificación:** PR de prueba que rompa una ruta → job `e2e` en rojo; `npm run check` local incluye el typecheck de tests.
