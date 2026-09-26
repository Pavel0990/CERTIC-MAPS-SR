# ADR-020 · Sin rol super_admin

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 24/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §10.2 |

## Contexto

Un rol con todos los permisos es el objetivo más valioso para un atacante y termina asignándose "por comodidad".

## Decisión

Cinco roles: `visitor`, `citizen`, `entrepreneur`, `moderator`, `municipal_admin` (de municipio o provincial). El primer administrador provincial se crea con `supabase/ops/grant_provincial_admin.sql`, ejecutado con `service_role`, revisado en PR y auditado. `assign_role` rechaza el alcance provincial (`provincial_scope_requires_operation_script`).

## Alternativas descartadas

- `super_admin` con 2FA

## Consecuencias

**A favor:**

- Mínimo privilegio y trazabilidad de todo cambio de poder.

**En contra:**

- Crear otro administrador provincial requiere un PR y alguien con acceso de operación.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Quedarse sin administradores provinciales | El script está documentado y se prueba en `staging`. |
