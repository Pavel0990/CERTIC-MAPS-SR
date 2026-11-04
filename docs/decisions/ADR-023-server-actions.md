# ADR-023 · Server Actions para la interfaz, Route Handlers solo donde hace falta HTTP

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 07/10/2026 (registra una práctica vigente desde el 28/09) | [ARCHITECTURE.md](../../ARCHITECTURE.md) §12 · complementa [ADR-002](ADR-002-nextjs-app-router.md) |

## Contexto

El diseño inicial (§12, v2.x) preveía una API REST completa: `/me/activity`, `/me/notifications`, `/me/notification-preferences`, `/businesses`, `/proposals/*`, `/reports/:id/download` y otros. Al construir la app, casi todo eso lo usaba **solo la propia interfaz**, desde páginas con sesión.

## Decisión

- **Server Actions** para toda operación que solo se hace desde la interfaz: perfil, preferencias, push, alta y panel del negocio, propuestas, edición de lugares y rutas, y todo el panel municipal.
- **Server Components** para las lecturas de páginas, a través de `modules/<dominio>/server.ts`.
- **Route Handlers** (`/api/v1`) solo donde hace falta HTTP de verdad:
  - el mapa y la búsqueda, públicos y cacheables en CDN;
  - la cola de reportes sin conexión, que reenvía con `fetch` e `Idempotency-Key`;
  - fotos (URL firmada y registro);
  - votos y métricas;
  - el worker, el cron y la salud.

En los dos casos, la autorización y la regla de negocio están en la **RPC** (ADR-018). La Server Action o el handler solo valida la forma con Zod y traduce el resultado.

## Alternativas descartadas

- **API REST completa para todo:** duplica cada operación (handler + cliente `fetch` + tipos), aumenta la superficie pública que hay que proteger y no aporta nada mientras no exista otro cliente, como una app nativa.

## Consecuencias

**A favor:**

- Menos endpoints públicos.
- Las acciones heredan la protección de Next.js frente a orígenes cruzados.
- Formularios con `useActionState`, que funcionan sin JavaScript.

**En contra:**

- Un cliente externo (app nativa, integración municipal) no puede usar esas operaciones. Mitigación: añadir un Route Handler sobre la **misma RPC** cuando haga falta. No hay lógica que mover.
