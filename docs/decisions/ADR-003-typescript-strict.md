# ADR-003 · TypeScript estricto

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §4, §13.3 |

## Contexto

Los contratos entre base de datos, API y cliente deben ser explícitos y verificables.

## Decisión

TypeScript en modo `strict`, tipos de la base generados con `supabase gen types` y Zod en todas las fronteras (formularios, Route Handlers, variables de entorno).

## Alternativas descartadas

- JavaScript

## Consecuencias

**A favor:**

- Errores en compilación, refactor seguro, contratos claros.

**En contra:**

- Curva inicial para quien no conoce TypeScript.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Tipos desincronizados con la base | Regenerar los tipos en CI y fallar si hay diferencias. |
