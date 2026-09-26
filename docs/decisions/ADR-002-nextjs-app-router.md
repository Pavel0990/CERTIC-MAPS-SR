# ADR-002 · Next.js 16 con App Router

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §5, §6, §12 |

## Contexto

Se necesitan en un solo despliegue: páginas públicas indexables, una aplicación de mapa interactiva, una API para la PWA y tareas programadas.

## Decisión

Next.js 16 con App Router. Route Handlers `/api/v1` para la PWA y la cola offline (reintentan requests HTTP), Server Actions para los formularios de los paneles, y `proxy.ts` solo para refrescar la sesión.

## Alternativas descartadas

- Vite SPA + backend aparte
- Remix / React Router
- Astro

## Consecuencias

**A favor:**

- SSR y SSG para fichas públicas; API y frontend juntos.
- Integración nativa con Vercel (previews, cron, rollback).

**En contra:**

- El modelo servidor/cliente y el caché exigen disciplina.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambios entre versiones mayores | Fijar versión y actualizar con codemods. |
| Código de servidor filtrado al cliente | Módulos con `import 'server-only'`. |
