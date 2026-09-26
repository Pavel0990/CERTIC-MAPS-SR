# ADR-014 · PDF semanal con @react-pdf/renderer

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §9.6 |

## Contexto

F6 exige informes automáticos en PDF. Vercel Hobby solo permite cron diario.

## Decisión

Generación en Route Handler (runtime Node) desde snapshots inmutables de `kpi_summary`, con un chequeo diario de Vercel Cron que genera si falta. Versionado en `report_runs` con toma atómica y hasta 5 intentos. Solo el administrador provincial regenera (nueva versión, nunca sobrescribe).

## Alternativas descartadas

- Puppeteer / Chromium headless
- pdf-lib
- Servicio externo

## Consecuencias

**A favor:**

- Componentes React, sin navegador headless.
- Panel y PDF salen de la misma función: las cifras coinciden por construcción.

**En contra:**

- CSS limitado al layout de la librería.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Tiempo de ejecución si el PDF crece | Mover la generación a la cola (job `pdf_weekly`, reservado). |
