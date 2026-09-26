# ADR-009 · PWA en lugar de app nativa

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §6.4 |

## Contexto

Las bases admiten "móvil o web progresiva". Hay que llegar a teléfono, tablet y PC con un solo código.

## Decisión

PWA con Serwist. Offline solo para el shell, contenido visto, borradores y cola de reportes. Tres modos visibles: ONLINE, DEGRADED y OFFLINE.

## Alternativas descartadas

- React Native / Expo
- Capacitor

## Consecuencias

**A favor:**

- Un solo código, sin tiendas de aplicaciones.

**En contra:**

- Sin GPS en segundo plano.
- En iOS, push solo con la PWA instalada y la instalación es manual.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Usuarios de iPhone sin la PWA instalada no reciben push | Notificaciones in-app siempre y guía de instalación. El canal email para notificaciones llega en Fase 2. |
