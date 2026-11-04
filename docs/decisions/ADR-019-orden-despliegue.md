# ADR-019 · Orden de despliegue y bases por PR

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 24/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §13.3 |

## Contexto

La integración Git de Vercel despliega al hacer merge, mientras la migración puede esperar aprobación. Los previews compartían una base sin las migraciones del PR.

## Decisión

Producción la despliega una GitHub Action que primero migra y después ejecuta `vercel deploy --prod` (auto-deploy de `main` desactivado). E2E en CI contra Supabase local con las migraciones del PR; Supabase Branching en Fase 2. Migraciones siempre compatibles con el código anterior.

## Alternativas descartadas

- Migrar desde el build de Vercel
- Base compartida para todos los PR

## Consecuencias

**A favor:**

- Nunca hay código nuevo sobre un esquema viejo.
- Cada PR se prueba con su propio esquema.

**En contra:**

- El despliegue ya no es "automático al hacer merge".

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Fallo entre la migración y el deploy | Migraciones compatibles hacia atrás mantienen funcionando el código anterior; Instant Rollback. |

## Revisión (07/10/2026)

- **E2E en el CI contra Supabase local:** sustituido por [ADR-025](ADR-025-e2e-contra-staging.md). Las E2E se corren a mano contra staging.
- **Despliegue de producción:** mientras haya un solo proyecto Supabase (staging), publica la integración Git de Vercel desde `main`, con la regla "migración primero" (`db push` antes de subir el código). El workflow `deploy.yml` (migrar → publicar) está listo y se activa con `DEPLOY_ENABLED=true` cuando exista el proyecto de producción. Entonces se desactiva la publicación automática de `main` en Vercel. Pasos: [DEPLOYMENT.md §4](../../DEPLOYMENT.md).
