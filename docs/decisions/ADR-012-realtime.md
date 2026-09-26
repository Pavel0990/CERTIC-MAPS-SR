# ADR-012 · Tiempo real solo para alertas de tránsito

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada · revisada el 24/09/2026 | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §11.1 |

## Contexto

Las bases piden un "mapa en tiempo real" y el criterio de innovación premia el tiempo real. La v1.x también usaba Postgres Changes para la bandeja del panel.

## Decisión

Realtime **Broadcast** en un canal público por provincia (`traffic:{province_id}`), emitido por el trigger `traffic_reports_broadcast` con datos públicos (id, tipo, gravedad, coordenadas, estado), sin autor ni fotos. **El panel municipal usa sondeo cada 30 s** (revisión v2.0: se quitó Postgres Changes).

## Alternativas descartadas

- Realtime para todas las capas
- Postgres Changes con RLS para la bandeja del panel

## Consecuencias

**A favor:**

- No se publica ninguna tabla con datos personales.
- Broadcast no depende de RLS del cliente.
- Pocas conexiones, dentro de los límites del plan.

**En contra:**

- La bandeja del panel puede tardar hasta 30 s en mostrar un reporte nuevo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El canal cae | El mapa vuelve a pedir `map_features` cada 60 s. |
| Un fallo del broadcast revierte el reporte | El trigger atrapa el error: el reporte se guarda igual. |
