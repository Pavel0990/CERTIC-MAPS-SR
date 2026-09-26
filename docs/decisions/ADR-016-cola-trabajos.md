# ADR-016 · Cola de trabajos en PostgreSQL (outbox)

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 24/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §11.3 |

## Contexto

Push, procesamiento de fotos, alertas y borrados son efectos lentos o externos. Muchos nacen en la base y Vercel Hobby no permite cron por minuto.

## Decisión

`private.jobs` se inserta en la misma transacción que el evento. `pg_cron` despierta cada minuto, vía `pg_net`, un worker HTTP en Next.js que consume con `FOR UPDATE SKIP LOCKED`, reintentos exponenciales, estado `dead` tras N intentos y `dedupe_key`.

## Alternativas descartadas

- Envío inline (pierde eventos)
- Inngest / QStash (proveedor extra)
- `pgmq` (válido; Fase 3)
- Edge Functions (segundo runtime)

## Consecuencias

**A favor:**

- Evento y efecto atómicos, sin proveedores nuevos.
- Contrato estable: cambiar el consumidor no toca a los productores.

**En contra:**

- Latencia de ~1 minuto por defecto.
- El worker compite con el tiempo máximo de las funciones serverless (lotes pequeños).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cola detenida | `worker_queue_health`, `/api/v1/health` y alerta cuando un job pasa a `dead`. |
