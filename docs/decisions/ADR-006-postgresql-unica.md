# ADR-006 · PostgreSQL como única base de datos

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §8 |

## Contexto

Estados, auditoría, KPIs y geografía deben ser consistentes entre sí.

## Decisión

Una sola base relacional. Nada de Firestore, Mongo ni Redis en el MVP.

## Alternativas descartadas

- Base documental
- Caché Redis para el mapa

## Consecuencias

**A favor:**

- Transacciones ACID para estados y auditoría.
- Joins y reporting sobre una sola copia de la verdad.

**En contra:**

- Escalar escrituras masivas requiere trabajo (irrelevante a esta escala).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Consultas lentas | Índices, advisors de Supabase y `EXPLAIN` en cada PR con consultas nuevas. |
