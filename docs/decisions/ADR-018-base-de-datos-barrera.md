# ADR-018 · La base de datos es la barrera de seguridad

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 24/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §10.3 |

## Contexto

Con Supabase, la anon key es pública y PostgREST expone `public` a cualquier usuario autenticado. Next.js no puede impedir llamadas directas.

## Decisión

Toda RPC es autosuficiente (identidad, rol, alcance y entradas). Las tablas críticas no admiten escritura directa. Los rechazos de negocio se devuelven, no se lanzan, para que el rate limit y la auditoría persistan. El captcha se aplica en Supabase Auth. Zod en Next.js es UX y defensa temprana.

## Alternativas descartadas

- Revocar `EXECUTE` a `authenticated` y llamar todo con `service_role` desde Next.js

## Consecuencias

**A favor:**

- Una sola barrera real, verificable con pruebas que atacan la API directamente.

**En contra:**

- Más lógica en SQL; exige pruebas de base de datos sólidas.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Una RPC omite una validación | Lista de revisión de RPC y pruebas de ataque directo en CI. |
