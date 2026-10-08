# Documentación de SR Conecta

Qué leer según quién seas. Todos los documentos describen el sistema **tal como está construido** y en línea en https://sr-conecta.vercel.app.

## Si evalúas el proyecto (jurado)

| Documento | Para qué |
|---|---|
| [README](../README.md) | Qué es, cómo funciona y el estado de cada funcionalidad del reto (F1–F6) |
| [ARCHITECTURE.md](../ARCHITECTURE.md) §1–§3 | El reto, la solución en una página y los principios |
| [Decisiones (ADR)](decisions/README.md) | Por qué se eligió cada pieza y qué alternativas se descartaron |
| [DATABASE.md · Estado verificado](../DATABASE.md#estado-verificado) | Migraciones, funciones y pruebas, con cómo comprobarlas |
| [SECURITY.md](../SECURITY.md) | Modelo de seguridad y pendientes conocidos |

## Si trabajas en el municipio

| Documento | Para qué |
|---|---|
| [Manual administrativo](manual-administrativo.md) | Roles, bandeja, validaciones, informes, equipo, auditoría y catálogos |

## Si desarrollas

Orden recomendado para empezar:

1. [README](../README.md): ejecutar en tu computadora, cuentas de prueba, comprobaciones.
2. [ARCHITECTURE.md](../ARCHITECTURE.md) §4 (stack), §5 (capas), §15 (estructura y reglas de módulos).
3. [DATABASE.md](../DATABASE.md): tablas, RPC, RLS y cómo se escribe una migración.
4. [Reparto del trabajo](REPARTO-DE-TRABAJO.md), sección "Reglas técnicas": ramas, migraciones primero, publicación.

| Si vas a… | Mira |
|---|---|
| Añadir una pantalla | ARCHITECTURE §6 y §12.3 (Server Actions); un módulo de ejemplo: `src/modules/citizen-reports` |
| Cambiar una regla de negocio | La RPC en `supabase/migrations` (DATABASE §6) y su prueba en `supabase/tests/run.mjs` |
| Tocar el mapa | ARCHITECTURE §7 y [ADR-022](decisions/ADR-022-maplibre-openfreemap.md) |
| Tocar la cola, el push o el PDF | ARCHITECTURE §11 y [ADR-016](decisions/ADR-016-cola-trabajos.md) |
| Actualizar los datos de OSM | [data/README.md](../data/README.md) |

## Si operas o publicas

| Documento | Para qué |
|---|---|
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Supabase, Vercel, correo, primer arranque, copias de seguridad, traspaso de cuentas |
| [ARCHITECTURE.md](../ARCHITECTURE.md) §13 | Entornos, CI/CD, observabilidad y costos |

## Hasta la entrega (equipo)

| Documento | Para qué |
|---|---|
| [Reparto del trabajo](REPARTO-DE-TRABAJO.md) | Quién hace qué del 7 al 27 de octubre |
| [Prueba con vecinos](prueba-con-vecinos.md) | Cómo probar la app con personas reales (20 puntos) |
| [Guion de la demo](guion-demo.md) | Los 25 minutos, el plan B y las comprobaciones a mano |

## Reglas de esta documentación

- **El SQL manda.** Si un documento y una migración discrepan, vale la migración; luego se corrige el documento.
- **Las cifras viven en un solo lugar:** [DATABASE.md · Estado verificado](../DATABASE.md#estado-verificado). Los demás documentos enlazan, no copian.
- **Una decisión no se edita en silencio.** Si cambia, su ADR pasa a "sustituida" o "revisada" y se registra en ARCHITECTURE §18.1.
- **Documentar en el mismo commit** que el cambio de código.
