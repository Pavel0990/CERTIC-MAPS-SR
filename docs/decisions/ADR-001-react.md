# ADR-001 · React para la interfaz

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §4, §6 |

## Contexto

La aplicación es una interfaz rica de mapa, formularios y paneles, construida por un equipo pequeño y heredada después por otro equipo.

## Decisión

Toda la interfaz se construye con React y TypeScript.

## Alternativas descartadas

- Vue / Nuxt
- Svelte / SvelteKit
- Flutter Web

## Consecuencias

**A favor:**

- Ecosistema de mapas maduro (`@vis.gl/react-google-maps`) y de componentes (shadcn/ui).
- Mayor oferta de desarrolladores para quien herede el proyecto.

**En contra:**

- Más código repetitivo que Svelte.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Re-renderizados costosos del mapa | Aislar el estado del mapa (Zustand) del resto de la interfaz. |
