# ADR-005 · Supabase como plataforma de datos

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §4, §8 |

## Contexto

Se necesita PostgreSQL con PostGIS, autenticación, archivos, planificador y secretos, sin operar servidores.

## Decisión

Supabase: PostgreSQL + PostGIS, Auth con SMTP propio, Storage, RLS, `pg_cron`, `pg_net`, Vault y Realtime **solo Broadcast para tránsito** (ADR-012). Sin Edge Functions en el MVP.

## Alternativas descartadas

- Firebase
- Postgres gestionado (Neon/RDS) + Auth.js + S3
- Backend propio con NestJS

## Consecuencias

**A favor:**

- Postgres real con PostGIS; Auth y Storage integrados.
- Planificador y secretos dentro de la base.
- Código abierto y autoalojable: hay salida del lock-in.

**En contra:**

- El plan Free pausa el proyecto tras 7 días sin actividad y no tiene backups.
- La Data API expone `public` a cualquier usuario autenticado (ver ADR-018).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mal uso de `service_role` | Módulo `server-only`, uso restringido al worker y al cron, revisión en PR. |
