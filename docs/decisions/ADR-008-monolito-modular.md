# ADR-008 · Monolito modular

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §15 |

## Contexto

Equipo de 1 a 5 personas, 5 semanas de construcción y una fundación que heredará el código.

## Decisión

Un repositorio, un despliegue y módulos por dominio que solo se comunican por su `index.ts`.

## Alternativas descartadas

- Microservicios
- Serverless fragmentado por función
- Backend separado

## Consecuencias

**A favor:**

- Velocidad, un solo pipeline, transacciones simples, bajo costo operativo.

**En contra:**

- Despliegue acoplado.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| "Gran bola de lodo" | Reglas de lint de fronteras (`eslint-plugin-boundaries` o `import/no-restricted-paths`) y revisión de dependencias en PR. |
