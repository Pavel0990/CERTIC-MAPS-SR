# ADR-013 · Notificaciones: in-app + Web Push por la cola

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada · revisada el 24/09/2026 | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §9.5 |

## Contexto

Las bases exigen que el ciudadano "reciba notificaciones sobre el mapa". Muchos eventos nacen en triggers o en `pg_cron`, no en un request.

## Decisión

`notifications` es la fuente de verdad (centro in-app). Web Push con VAPID como canal de entrega, enviado por la cola (ADR-016). Alertas de tránsito por municipio con `worker_run_fanout_alert`. Canales detrás de una interfaz; **el canal email para notificaciones pasa a Fase 2** (revisión v2.0); en el MVP el email es solo el de Supabase Auth.

## Alternativas descartadas

- Firebase Cloud Messaging
- OneSignal
- Solo email
- Envío inline tras el commit

## Consecuencias

**A favor:**

- Sin segundo proveedor ni SDK en el cliente.
- Ningún evento de trigger o cron queda sin entregar.

**En contra:**

- iOS requiere la PWA instalada para push.
- Latencia de hasta ~1 minuto.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Suscripciones muertas | Se borran al responder 404/410. |
| Muchos destinatarios en una alerta | La función inserta todas las notificaciones en una transacción; el worker envía los push por lotes. |
