# SR Conecta

Plataforma geográfica para la provincia Santiago Rodríguez (República Dominicana). Conecta a ciudadanos, turistas, emprendedores, comercios y autoridades alrededor de un mapa: negocios y turismo, rutas ecoturísticas, reportes de tránsito, incidencias y consultas municipales, panel administrativo con KPIs y un informe semanal en PDF.

> **Estado actual del repositorio:** prototipo interactivo de diseño + documento de arquitectura. **Todavía no existe el código del producto** (Next.js, Supabase, base de datos, API). Todo lo que se describe como "producto" está en [ARCHITECTURE.md](ARCHITECTURE.md) y aún no está implementado.

## Contenido

| Ruta | Qué es |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica (v1.4): stack, modelo de datos, seguridad, API, despliegue, ADRs y registro de cambios |
| [project/Main.dc.html](project/Main.dc.html) | Prototipo interactivo: app ciudadana y panel municipal, con datos de demostración |
| [project/sr-core.js](project/sr-core.js) | Datos de demostración y utilidades del prototipo (proyección de mapa, distancias, KPIs) |
| [project/support.js](project/support.js) | Runtime del lienzo de diseño. Archivo **generado**: no editar |
| [project/canvas.json](project/canvas.json) | Configuración del lienzo de diseño |

## Ver el prototipo

No necesita instalación ni servidor: abre `project/Main.dc.html` en un navegador moderno (Chrome, Edge, Firefox o Safari) con conexión a internet, necesaria para las teselas del mapa y las fuentes.

- Arriba a la derecha se alterna entre **App ciudadana** y **Panel municipal**.
- La columna izquierda lleva directo a cada flujo: explorar el mapa, buscar, ver un negocio, obtener una ruta, crear un reporte, ver su estado, panel, actividad y reporte semanal.

**Limitaciones del prototipo** (intencionales; el producto real las resuelve según la arquitectura):

| En el prototipo | En el producto (ARCHITECTURE.md) |
|---|---|
| Datos de demostración en memoria; se reinician al recargar | PostgreSQL + PostGIS en Supabase |
| Mapa base de Esri (con su atribución) | Google Maps JavaScript API detrás de un adaptador (§10) |
| Rutas con el servidor demo público de OSRM; si falla, estimación marcada con "≈" | Enlace de navegación de Google Maps (§10.2) |
| Sin inicio de sesión; cualquiera abre el panel | Supabase Auth + roles + RLS (§16, §17) |
| "Generar PDF" es una simulación | PDF semanal con `@react-pdf/renderer` (§27) |
| Negocios generados al azar y valoraciones inventadas | Datos abiertos de la provincia y negocios verificados |

Lo que el prototipo sí respeta del diseño final: un solo origen de datos para panel, actividad y PDF (los números coinciden); ciclo de estados de reportes con aprobación y rechazo, avanzando un paso a la vez; separación entre tránsito y servicios municipales; promociones informativas de los comercios; atribución de mapas; teclado, foco visible y movimiento reducido.

## Alcance

Incluido: mapa interactivo y geolocalización; negocios y comercio local (con promociones informativas); turismo y rutas ecoturísticas; reportes de tránsito; incidencias y consultas municipales; usuarios, perfiles y roles; panel municipal con moderación; KPIs y PDF semanal; PWA responsive; imágenes; auditoría.

**Fuera de alcance:** misiones y recompensas (retiradas en la arquitectura v1.3; ver ADR-010 y ADR-011).

## Stack objetivo (resumen)

Next.js 16 + TypeScript · Tailwind + shadcn/ui · Google Maps JavaScript API · Supabase (PostgreSQL + PostGIS, Auth, Storage, `pg_cron`, `pg_net`, Vault) · Zod + React Hook Form · Recharts · Serwist (PWA) · Web Push · Vercel · GitHub Actions. Detalle y justificación en ARCHITECTURE.md §3 y §41.

## Roles

`visitor` (sin sesión), `citizen`, `entrepreneur`, `moderator` y `municipal_admin` (con alcance de municipio o provincial). No existe `super_admin` (ADR-020). Matriz completa en ARCHITECTURE.md §16.

## Pendiente antes de programar

1. Copiar en ARCHITECTURE.md §43 las 6 funcionalidades obligatorias de las bases del reto (conectasr.com).
2. Verificar en la documentación oficial los puntos marcados en el Anexo E.
3. Crear las cuentas de Google Cloud, Supabase y Vercel **a nombre de la organización**, no de un integrante.
4. Empezar por el paso (0) "Cimientos" del orden de construcción (§48).

La instalación, las variables de entorno, las migraciones, las pruebas y el despliegue se documentarán aquí cuando exista el código. Su diseño ya está en ARCHITECTURE.md §36 y §37.

## Licencia

Por definir: MIT o Apache-2.0, según las bases del reto.
