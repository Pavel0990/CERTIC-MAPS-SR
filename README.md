# SR Conecta

Plataforma geográfica para la provincia Santiago Rodríguez (República Dominicana). Conecta a ciudadanos, turistas, emprendedores, comercios y autoridades alrededor de un mapa. Incluye:

- negocios y turismo;
- rutas ecoturísticas;
- alertas de tránsito en tiempo real;
- incidencias y consultas municipales con votación de prioridades;
- panel municipal con KPIs;
- informe semanal en PDF.

Proyecto para el reto TechEmprende SR Conecta 2026.

> **Estado actual del repositorio:**
> - arquitectura definida;
> - base de datos escrita y verificada con pruebas;
> - prototipo interactivo de diseño.
>
> La aplicación Next.js todavía no existe: su diseño está en [ARCHITECTURE.md](ARCHITECTURE.md).

## Contenido

| Ruta | Qué es |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura (v2.1): requisitos del reto, stack, módulos, seguridad, API, operación, plan y riesgos |
| [docs/decisions/](docs/decisions) | 21 decisiones de arquitectura (ADR), una por archivo, con contexto, alternativas y riesgos |
| [DATABASE.md](DATABASE.md) | Backend y base de datos: capas, convenciones, modelo, catálogo de RPC, matriz RLS |
| [supabase/migrations/](supabase/migrations) | 17 migraciones SQL (PostgreSQL + PostGIS): la fuente de verdad del modelo |
| [supabase/tests/](supabase/tests) | 113 pruebas de la base de datos |
| [supabase/seed.sql](supabase/seed.sql) | Semilla de desarrollo (municipios rectangulares de demostración) |
| [supabase/ops/](supabase/ops) | Scripts de operación (crear el administrador provincial) |
| [project/Main.dc.html](project/Main.dc.html) | Prototipo interactivo: app ciudadana y panel municipal, con datos de demostración |
| [project/sr-core.js](project/sr-core.js) | Datos de demostración y utilidades del prototipo |
| [project/support.js](project/support.js) | Runtime del lienzo de diseño. Archivo **generado**: no editar |
| [project/canvas.json](project/canvas.json) | Configuración del lienzo de diseño |

## Probar la base de datos

No requiere Docker ni una cuenta de Supabase: usa PostgreSQL 18 + PostGIS en WebAssembly (PGlite).

```bash
cd supabase/tests
npm install
npm test        # 113/113 pruebas · 17 migraciones
```

## Ver el prototipo

No necesita instalación ni servidor. Abre `project/Main.dc.html` en un navegador moderno, con conexión a internet para las teselas del mapa y las fuentes.

- Arriba a la derecha se alterna entre **App ciudadana** y **Panel municipal**.
- La columna izquierda lleva directo a cada flujo:
  - explorar el mapa, buscar y ver un negocio;
  - obtener una ruta;
  - crear un reporte y ver su estado;
  - panel, actividad y reporte semanal.

**Limitaciones del prototipo.** Son intencionales; el producto las resuelve según la arquitectura:

| En el prototipo | En el producto |
|---|---|
| Datos de demostración en memoria; se reinician al recargar | PostgreSQL + PostGIS en Supabase |
| Mapa base de Esri | Google Maps detrás de un adaptador (ARCHITECTURE.md §7.3) |
| Rutas con el servidor demo público de OSRM; si falla, estimación marcada con "≈" | Enlace de navegación de Google Maps |
| Sin inicio de sesión; cualquiera abre el panel | Supabase Auth + roles + RLS (§10) |
| "Generar PDF" es una simulación | PDF semanal automático (§9.6) |
| Negocios generados al azar | Datos abiertos de la provincia y negocios verificados |
| Los reportes de tránsito no muestran línea de tiempo de estados | Estados, moderación y vencimiento (§9.2) |
| No hay consultas tipo *inquiry* ni propuestas de lugares y rutas | Ambos flujos (§9.2, §9.4) |

**Lo que el prototipo sí respeta del diseño final:**
- un solo origen de datos para panel, actividad y PDF, así que los números coinciden;
- estados de las incidencias que avanzan un paso a la vez, con aprobación y rechazo;
- separación entre tránsito (vence solo, sin votos) y servicios municipales (con votos);
- promociones informativas;
- atribución de mapas;
- teclado, foco visible y movimiento reducido.

## Alcance

**Incluido:**
- las seis funcionalidades obligatorias de las bases (mapa, negocios, rutas, tránsito, consultas, PDF semanal);
- panel municipal;
- notificaciones y alertas por municipio;
- PWA responsive;
- roles y auditoría.

Detalle y trazabilidad en ARCHITECTURE.md §1 y §16.

**Fuera de alcance:** misiones y recompensas.

## Roles

`visitor` (sin sesión), `citizen`, `entrepreneur`, `moderator` y `municipal_admin` (con alcance de municipio o provincial). No existe `super_admin`. Matriz completa en ARCHITECTURE.md §10.2.

## Antes de programar

1. **Hacer público este repositorio** antes de la entrega: las bases exigen un "repositorio público en GitHub".
2. Crear las cuentas de Google Cloud, Supabase y Vercel **a nombre de la organización**, no de un integrante.
3. Semana 1: aplicar las migraciones en un proyecto Supabase real y resolver lo pendiente de verificar (ARCHITECTURE.md §20).
4. Seguir el plan por semanas (ARCHITECTURE.md §16.3). Calendario de las bases: desarrollo hasta el 27/10/2026; demo del 28 al 30/10/2026.

La instalación de la aplicación, las variables de entorno y el manual de despliegue (`DEPLOYMENT.md`) se escribirán cuando exista el código. Su diseño está en ARCHITECTURE.md §13.

## Licencia

Por definir: MIT o Apache-2.0, según las bases del reto.
