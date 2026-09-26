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
