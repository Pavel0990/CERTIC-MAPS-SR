# SR Conecta — Arquitectura

> **Versión 3.0 · 7 de octubre de 2026 · arquitectura tal como está construida.**
> Plataforma geográfica para la provincia Santiago Rodríguez (República Dominicana), para el reto TechEmprende SR Conecta 2026.
> Describe el sistema que funciona hoy en https://sr-conecta.vercel.app. Las decisiones y sus alternativas están en [`docs/decisions/`](docs/decisions); lo que cambió respecto del diseño inicial, en §18.1. Las cifras verificadas (migraciones, funciones, pruebas) viven solo en [DATABASE.md](DATABASE.md#estado-verificado), para que no se desincronicen.

---

## Índice

0. [Cómo leer este documento](#0-cómo-leer-este-documento)
1. [Contexto y requisitos](#1-contexto-y-requisitos)
2. [La solución en una página](#2-la-solución-en-una-página)
3. [Principios](#3-principios)
4. [Stack](#4-stack)
5. [Arquitectura del sistema](#5-arquitectura-del-sistema)
6. [Frontend y experiencia de uso](#6-frontend-y-experiencia-de-uso)
7. [Mapa y geografía](#7-mapa-y-geografía)
8. [Backend y datos](#8-backend-y-datos)
9. [Módulos funcionales](#9-módulos-funcionales)
10. [Seguridad y privacidad](#10-seguridad-y-privacidad)
11. [Tiempo real, trabajos asíncronos y tareas programadas](#11-tiempo-real-trabajos-asíncronos-y-tareas-programadas)
12. [API](#12-api)
13. [Operación](#13-operación)
14. [Calidad: pruebas y rendimiento](#14-calidad-pruebas-y-rendimiento)
15. [Estructura del repositorio](#15-estructura-del-repositorio)
16. [Alcance, plan y fases](#16-alcance-plan-y-fases)
17. [Riesgos](#17-riesgos)
18. [Decisiones de arquitectura (ADR)](#18-decisiones-de-arquitectura-adr)
19. [No hacer](#19-no-hacer)
20. [Pendiente de verificar](#20-pendiente-de-verificar)

---

## 0. Cómo leer este documento

| Si necesitas… | Ve a |
|---|---|
| Entender qué se construye y por qué | §1, §2, §3 |
| Saber qué tecnología usar | §4 |
| Implementar una funcionalidad | §9 (módulo) + §12 (API) + [DATABASE.md](DATABASE.md) (RPC y tablas) |
| Revisar permisos o seguridad | §10 |
| Desplegar u operar | §13 |
| Saber qué entra en el MVP | §16 |

**Jerarquía de fuentes.** Si dos fuentes discrepan, manda la primera:

1. El SQL de [`supabase/migrations/`](supabase/migrations). Es ejecutable y está probado (§14.1).
2. [DATABASE.md](DATABASE.md): explica el SQL (tablas, RPC, RLS, índices).
3. Este documento: arquitectura, módulos, operación y decisiones.

Este documento no repite columnas ni firmas de funciones: las nombra y remite a DATABASE.md.

**Etiquetas de fase:**
- **[MVP]**: se entrega para la demo del reto (28–30/10/2026).
- **[Fase 2]**: producción municipal.
- **[Fase 3]**: escala regional.

Si una capacidad no tiene etiqueta, es [MVP].

**Otros documentos.** Índice por público (jurado, municipio, desarrollo, operación): [docs/README.md](docs/README.md).

**Estado (07/10/2026):**

| Pieza | Estado |
|---|---|
| Base de datos aplicada en Supabase staging y verificada ([cifras](DATABASE.md#estado-verificado)) | ✅ |
| Las 6 funcionalidades del reto (F1–F6), panel municipal y catálogos editables | ✅ En línea |
| Worker de la cola, informe PDF, PWA sin conexión, Web Push | ✅ |
| Datos reales de la provincia (OpenStreetMap) y listados para quien no usa el mapa | ✅ |
| CI en cada push, pruebas E2E, copia de seguridad diaria (por activar) | ✅ / ⏳ activar |
| Dominio propio, correo con dominio, Supabase de producción, captcha | ⏳ Necesitan cuentas |

---

## 1. Contexto y requisitos

### 1.1 El reto

Fuente: bases oficiales de conectasr.com (endpoint público `/api/convocatoria`), leídas el 24/09/2026.

| Hecho | Consecuencia para la arquitectura |
|---|---|
| Provincia Santiago Rodríguez, con 3 municipios: San Ignacio de Sabaneta (cabecera), Monción y Villa Los Almácigos | Territorio pequeño: cientos a pocos miles de puntos. No se optimiza para millones. |
| La organización entrega **datos geográficos abiertos** de la provincia | Se importan a PostGIS, que es la fuente de verdad territorial. Mientras llegan, se usa OpenStreetMap (ADR-024). |
| Demo en vivo de **25 minutos con datos reales** | Semilla reproducible, guion de demo y plan B si falla un servicio externo. |
| El ganador libera el código con **MIT o Apache 2.0** y lo transfiere a FUNDESER | Todas las dependencias deben tener licencia compatible. Cuentas de la organización desde el día uno, nunca personales. |
| Stack libre; se evalúa el resultado | Se prioriza lo que se demuestra bien y se puede mantener. |
| "Cualquier ciudadano ingresa datos y **recibe notificaciones** sobre el mapa" | Notificaciones in-app obligatorias, alertas de tránsito por municipio y push como canal adicional. |
| Entregables: MVP, mapa integrado, panel municipal, PDF semanal, **repositorio público en GitHub** con documentación técnica y manual de despliegue, demo de 25 min | El repositorio se hace público antes de la entrega (hoy es privado). |
| Calendario: desarrollo hasta el **27/10/2026**; demo del **28 al 30/10/2026** | Unas 5 semanas de construcción (§16.3). |

**Criterios de evaluación (100 puntos):**

| Criterio | Puntos | Cómo lo atiende la arquitectura |
|---|---|---|
| MVP funcional | 25 | Las 6 funcionalidades obligatorias en el alcance mínimo (§16.1) |
| UX/UI para **baja alfabetización digital** | 20 | Reglas de lenguaje e interacción (§6.2) y prueba con vecinos |
| Innovación (geolocalización, tiempo real, IA o automatización) | 20 | Alertas de tránsito en vivo (§11.1), alertas por municipio (§9.5), PDF automático (§9.6) |
| Pertinencia territorial | 15 | Datos abiertos de la provincia, municipios como unidad de gestión |
| Sostenibilidad: el municipio opera sin el equipo | 10 | Catálogos editables sin deploy, manuales, costos bajos (§13) |
| Código y documentación | 10 | Base de datos probada, ADRs, este documento |

### 1.2 Las seis funcionalidades obligatorias

Texto literal de las bases:

| F | Funcionalidad | Texto de las bases |
|---|---|---|
| F1 | Mapa Interactivo Ciudadano | "Mapa en tiempo real donde cualquier usuario puede ver y agregar puntos de interés, negocios, rutas y alertas georreferenciadas." |
| F2 | Negocios Turísticos y Locales | "Registro abierto de negocios locales y establecimientos turísticos con categorías, fotos, horarios y datos de contacto." |
| F3 | Rutas de Ecoturismo | "Trazado y consulta de rutas ecológicas, culturales y de aventura con información de dificultad, duración y servicios disponibles." |
| F4 | Reporte de Tránsito | "Sistema colaborativo de alertas viales: accidentes, cierres, baches, semáforos dañados y desvíos en tiempo real." |
| F5 | Consultas Ciudadanas | "Canal digital para que los ciudadanos reporten problemas comunitarios, voten prioridades y den seguimiento a sus solicitudes." |
| F6 | Reportes Semanales Automáticos | "Generación automática de informes en PDF con métricas de uso, reportes por municipio y estado de solicitudes." |

### 1.3 Trazabilidad: requisito → diseño

| Requisito | Módulo | Piezas en la base de datos | Estado |
|---|---|---|---|
| F1 ver el mapa | §7, §9.1 | `map_features`, `map_aggregates`, `search_all` | ✅ SQL probado |
| F1 agregar puntos de interés y rutas | §9.4 | `propose_place`, `propose_route`, `review_content` | ✅ |
| F1 agregar negocios | §9.3 | `submit_business` | ✅ |
| F1 alertas georreferenciadas en tiempo real | §9.2, §11.1 | `create_traffic_report`, trigger `traffic_reports_broadcast` | ✅ (canal Realtime: verificar en Supabase, §20) |
| F2 registro abierto con categorías y contacto | §9.3 | `submit_business`, `update_business` | ✅ |
| F2 fotos | §9.3, §10.5 | `register_attachment`, `worker_attachment_*` | ✅ |
| F2 horarios | §9.3 | `set_business_hours`, tabla `business_hours` | ✅ |
| F3 trazado y consulta | §9.4 | `propose_route` (GeoJSON), `update_route` | ✅ |
| F3 dificultad, duración y servicios | §9.4 | columnas `difficulty`, `duration_min` y `services` de `eco_routes` | ✅ |
| F4 los cinco tipos de alerta | §9.2 | catálogo `traffic_report_types` | ✅ |
| F4 colaborativo | §9.2 | reputación y moderación en `moderate_traffic_report` | ✅ |
| F5 reportar problemas | §9.2 | `create_citizen_request` | ✅ |
| F5 votar prioridades | §9.2 | `toggle_request_vote`, `request_votes` | ✅ |
| F5 dar seguimiento | §9.2 | `my_activity`, `request_status_history`, notificaciones | ✅ |
| F6 PDF automático | §9.6 | `weekly_report_begin`/`weekly_report_finish`, `kpi_summary`, `authorize_report_download` | ✅ SQL · ⏳ generación del PDF |
| "Recibe notificaciones sobre el mapa" | §9.5 | `notifications`, `worker_run_fanout_alert` | ✅ SQL · ⏳ envío push |
| Panel municipal | §9.7 | RPC de moderación, `kpi_summary` | ✅ SQL · ⏳ interfaz |

---

## 2. La solución en una página

SR Conecta es un **monolito modular**:
- **Aplicación:** Next.js 16 (App Router) con TypeScript, desplegada en Vercel.
- **Datos:** Supabase (PostgreSQL + PostGIS, Auth, Storage).
- **Mapa base:** MapLibre GL con teselas de OpenFreeMap, detrás de un adaptador propio (ADR-022, que sustituye a ADR-004).

Tres ideas sostienen todo el diseño:

1. **PostgreSQL es la fuente de verdad y la barrera de seguridad.** Toda operación que cambia estado, permisos o contadores es una función SQL (RPC) que valida todo por sí misma. Cualquiera puede llamar la API de Supabase directamente, sin pasar por Next.js (ADR-018).
2. **El mapa base solo pinta; los datos son nuestros.** Negocios, rutas, reportes y consultas viven en PostGIS. OpenFreeMap solo dibuja calles y relieve, y "Cómo llegar" es un enlace externo, sin API.
3. **Todo efecto lento o externo va por una cola.** Push, procesamiento de fotos y alertas se encolan en la misma transacción que los origina y los ejecuta un worker con reintentos (ADR-016).

```mermaid
flowchart LR
    U[Ciudadano · turista · comercio · municipio] --> PWA[PWA Next.js]
    PWA -->|teselas del mapa base| G[OpenFreeMap]
    PWA -->|/api/v1 · Server Actions| NX[Next.js en Vercel]
    PWA -.->|alertas en vivo · Broadcast| RT[Supabase Realtime]
    NX -->|JWT del usuario| DB[(PostgreSQL + PostGIS<br/>RLS + RPC)]
    DB -->|encola| Q[(private.jobs)]
    CRON[pg_cron cada minuto] -->|pg_net| W[Worker /api/v1/internal/jobs/run]
    W --> Q
    W -->|VAPID| PUSH[Web Push]
    W --> ST[Supabase Storage]
    VC[Vercel Cron diario] --> PDF[PDF semanal] --> ST
    DB -->|realtime.send| RT
```

---

## 3. Principios

1. **La base de datos decide.** El cliente propone (ubicación, fotos, texto) y la RPC valida y decide. Zod en Next.js es UX y defensa temprana, no la barrera.
2. **Una operación crítica es una transacción.** Nunca "leer en JS, decidir en JS, escribir en JS".
3. **Rechazar no es fallar.** Un rechazo de negocio (límite alcanzado, transición no válida) se **devuelve** como `{status:'rejected', reason}` y hace commit, para que el contador de rate limit y la auditoría persistan. `RAISE EXCEPTION` queda solo para errores de programación.
4. **Mínimo privilegio.** No hay `super_admin` (ADR-020). Cada rol tiene alcance territorial, y las columnas personales están ocultas por grants.
5. **Servicios externos por intención del usuario, nunca por evento del mapa** (p. ej. "Cómo llegar" abre la app de navegación solo al tocarlo).
6. **Privacidad por defecto.** Ubicación puntual ligada a una acción, nunca rastreo. Sin EXIF en las fotos. Sin autor en el mapa público.
7. **Todo cambio relevante deja rastro:** historial de estados, acciones de moderación y auditoría.
8. **Reintentar es seguro.** Idempotencia en creaciones reintentables, compare-and-set en cambios de estado y bloqueo optimista en ediciones.
9. **Evolución aditiva.** Esquema, API y eventos crecen agregando, nunca renombrando ni borrando en el mismo release. Lo que costará caro después y poco hoy se prepara ya: `province_id`, estados como texto, catálogos en tablas y PK particionables (ADR-017).
10. **Diseñar para transferir.** Otro equipo debe poder operar la plataforma con lo que hay en el repositorio.

---

## 4. Stack

Lo que está instalado y en uso. Las versiones exactas están en `package.json`.

| Área | Tecnología | Nota |
|---|---|---|
| Framework | Next.js 16.3 (App Router) + React 19.3 + TypeScript 6.0 `strict` | `proxy.ts` (antes `middleware.ts`) refresca la sesión y aplica la CSP. TypeScript 6.0 y no 7: `typescript-eslint` exige < 6.1 |
| Lint | ESLint 9 + `eslint-config-next` + `typescript-eslint` + `eslint-plugin-boundaries` | ESLint 9 y no 10: los plugins de `eslint-config-next` aún no soportan ESLint 10 |
| UI | Tailwind CSS 4 + componentes propios (`src/components/ui`) + `lucide-react` | Sin librería de componentes: pocos componentes, escritos a medida para la UX de §6.2 |
| Formularios | `useActionState` + Server Actions + Zod 4 | Zod valida la forma; la RPC decide (§3) |
| Estado del cliente | Estado de React y la URL (filtros, capas) | Sin librería de estado: no hizo falta |
| Gráficos del panel | HTML y CSS (barras simples) | Sin librería de gráficos |
| Mapa | MapLibre GL 6 + estilo `liberty` de OpenFreeMap; clústeres en el cliente | Detrás de `modules/map/provider` ([ADR-022](docs/decisions/ADR-022-maplibre-openfreemap.md)) |
| Búsqueda | `search_all` sobre nuestros datos (FTS + `pg_trgm` + `unaccent`) | Sin geocodificador externo |
| Navegación | Enlace "Cómo llegar" (`google.com/maps/dir/?api=1&destination=…`) | Abre la app de navegación del teléfono; sin API ni clave |
| Base de datos | Supabase PostgreSQL 17 + PostGIS + `pg_trgm` + `unaccent` + `pgcrypto` | Las pruebas corren en PGlite (PostgreSQL 18 + PostGIS 3.6) |
| Lógica crítica | RPC PL/pgSQL + RLS + grants por columna | ADR-018 |
| Auth | Supabase Auth: código de un solo uso o enlace por correo | Sin contraseñas. Captcha pendiente ([SECURITY.md](SECURITY.md)) |
| Correo | SMTP propio en Supabase Auth (hoy Gmail; Resend con dominio al publicar) | El SMTP por defecto de Supabase solo envía 2 por hora |
| Archivos | Supabase Storage: `report-evidence` (privado), `public-media` (público), `reports-pdf` (privado) | §10.5 |
| Fotos | `sharp` en el worker: WebP, sin EXIF, máximo 4 096 px | §10.5 |
| Tiempo real | Supabase Realtime **Broadcast**, solo alertas de tránsito públicas | ADR-012 |
| Cola y planificador | `private.jobs` + `pg_cron` + `pg_net` + Vault | ADR-016 |
| PWA | Manifest + service worker propio (`public/sw.js`) | ADR-009 (nota de implementación) |
| Push | Web Push + VAPID (`web-push`) | Sin Firebase |
| PDF | `@react-pdf/renderer` en el worker y en el cron | ADR-014 |
| Errores | `instrumentation.ts` (`onRequestError`): registro estructurado en Vercel; Sentry si se configura `SENTRY_DSN` | §13.6 |
| Pruebas | PGlite (base), Vitest (unitarias), `node:test` (fronteras), Playwright (E2E) | §14 |
| CI/CD | GitHub Actions (CI en cada push y PR) + integración Git de Vercel (`main` → producción) | `deploy.yml` (migrar → publicar) y `backup.yml` listos, apagados hasta tener producción ([ADR-019](docs/decisions/ADR-019-orden-despliegue.md)) |
| Hosting | Vercel Hobby + Supabase Free | Pro cuando haya producción municipal (§13.7) |
| **No usar** | Firebase, Redux, Express/NestJS, microservicios, Kubernetes, Edge Functions | §19 |

---

## 5. Arquitectura del sistema

### 5.1 Despliegue

```text
┌──────────────────────── Dispositivo (PWA) ─────────────────────────┐
│ Next.js client · Mapa (MapLibre GL) · Service Worker (propio)       │
│ Borradores y cola offline (IndexedDB) · Web Push · canal Broadcast  │
└──────────────┬──────────────────────────────┬───────────────────────┘
               │ HTTPS (cookie de sesión)       │ teselas vectoriales
               ▼                                ▼
┌──────────── Vercel ─────────────┐   ┌──────── OpenFreeMap ─────────┐
│ Next.js 16                      │   │ Teselas del mapa base (OSM)   │
│ · Server Components (páginas)   │   └──────────────────────────────┘
│ · Route Handlers /api/v1        │
│ · Server Actions (paneles)      │
│ · proxy.ts (solo sesión)        │
│ · Vercel Cron diario → PDF      │
│ · Worker /api/v1/internal/jobs  │◄──── pg_net (pg_cron, cada minuto)
└──────────────┬──────────────────┘
               │ supabase-js con el JWT del usuario
               │ (service_role solo en worker y cron)
               ▼
┌──────────────────────── Supabase ─────────────────────────┐
│ PostgreSQL + PostGIS + pg_trgm + unaccent                   │
│ RLS · RPC SECURITY DEFINER · grants por columna · triggers  │
│ private.jobs · pg_cron · pg_net · Vault                     │
│ Auth (SMTP propio) · Storage · Realtime Broadcast           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Capas del backend

No hay un servidor de aplicación separado. Son **cuatro capas con una sola autoridad**:

| # | Capa | Responsabilidad | No debe |
|---|---|---|---|
| 1 | Route Handler / Server Action | Transporte HTTP, sesión (`getUser()`), validación de forma con Zod, traducción de `reason` a HTTP | Decidir permisos o estados; usar `service_role` en requests de usuario |
| 2 | Servicio TS (`modules/<dominio>/server`) | Orquestar, combinar lecturas, firmar URLs de Storage | Encadenar varias escrituras esperando atomicidad (entre RPC no hay transacción) |
| 3 | **RPC en `public`** | Regla de negocio completa y atómica: identidad, rol, alcance, entradas, rate limit, historial, auditoría, encolado | Llamar servicios externos de forma síncrona |
| 4 | Tablas | Invariantes: `CHECK`, FK, `UNIQUE`, RLS, grants por columna, triggers de derivados | Contener reglas de negocio ocultas |

**Lecturas:**
- Las simples van a las tablas con el JWT del usuario, y RLS filtra.
- Las compuestas o públicas van por RPC `SECURITY INVOKER` (`map_features`, `map_aggregates`, `search_all`), así RLS sigue aplicando.

**Escrituras:** siempre por RPC. Las únicas excepciones son las filas propias de preferencias, suscripciones push, marcar una notificación como leída y 4 columnas del perfil (DATABASE.md §7).

### 5.3 Dónde corre cada cosa

| Lugar | Qué hace |
|---|---|
| Navegador | Render, ubicación (con permiso), compresión de fotos, borradores y cola offline, validación temprana |
| Next.js (Vercel) | Páginas, API `/api/v1`, Server Actions, firma de URLs de Storage, worker de la cola (procesamiento de fotos, push, alertas), PDF |
| PostgreSQL | Reglas de negocio, pertenencia territorial, transiciones, historial, auditoría, rate limits, encolado, broadcast |
| OpenFreeMap | Teselas del mapa base. "Cómo llegar" abre la app de navegación del teléfono por enlace |

---

## 6. Frontend y experiencia de uso

### 6.1 Organización

- **Un solo grupo de rutas, `(app)/`,** con un layout común (barra inferior en el móvil, lateral en el escritorio):
  - públicas: inicio, `/mapa`, `/negocios`, `/turismo` y `/rutas` con sus fichas, y `/consultas/[id]`;
  - con cuenta: `/reportar`, `/actividad`, `/perfil`, `/notificaciones`, `/negocio` (panel del comercio) y `/proponer`;
  - personal: `/admin/*` (panel municipal).
- **Fuera del grupo:** `/offline`, que guarda el service worker, y `/auth/callback`.
- **El mapa se carga solo en el cliente** detrás de un esqueleto; la primera pintura no espera a las teselas.
- **Todo lo que está en el mapa tiene equivalente en lista:** `/negocios`, `/turismo`, `/rutas` y la lista del explorador. Es un requisito de accesibilidad y el plan B si el mapa falla.
- **Filtros en la URL** (`?capas=…`, `?municipio=…&tipo=…`), para poder compartir enlaces.
- **Idioma:** español, con los textos de estados y errores centralizados en `src/lib/vocabulary.ts`. El inglés llega en Fase 2 con la columna `translations`, que ya existe.

### 6.2 Baja alfabetización digital (criterio de 20 puntos)

- Lenguaje simple y en segunda persona: "Reportar un problema", no "Crear incidencia".
- Cada acción lleva ícono **y** texto. Las categorías usan íconos grandes.
- Flujos de 3 pasos como máximo, con una decisión por pantalla.
- Un reporte se puede enviar solo con tipo, ubicación y foto, sin escribir texto.
- Los estados se explican con palabras ("Lo están revisando"), no con códigos.
- El texto base mide 16 px o más, y los objetivos táctiles al menos 44×44 px.
- Antes de la demo se prueba con al menos 5 vecinos reales.

### 6.3 Estados de pantalla, formularios y accesibilidad

- **Estados de pantalla.** Toda vista con datos implementa `LOADING` (esqueleto), `EMPTY` (explica por qué y qué hacer), `ERROR` (mensaje claro y botón de reintentar, sin detalles internos), `DISABLED` (con motivo, por ejemplo "sin conexión"), `UNAUTHORIZED` y `NOT FOUND`.
- **Formularios:**
  - el botón se desactiva mientras se envía, y la `idempotency_key` evita duplicados;
  - los errores van por campo, asociados con `aria-describedby`;
  - el foco pasa al primer error.
- **Responsive, mobile-first,** con cortes en 640 / 768 / 1024 / 1280 px:
  - móvil: mapa a pantalla completa, barra inferior y bottom sheets;
  - escritorio: panel lateral fijo.
- **WCAG 2.1 AA:**
  - controles reales (`<button>`, `<a>`) y foco visible;
  - se respeta `prefers-reduced-motion`, también en las animaciones del mapa;
  - el contraste AA se verifica con axe en los E2E.

### 6.4 PWA y modos de conexión

- **Instalación.** Manifest con `display: standalone` y `start_url: /mapa`; service worker propio en `public/sw.js` (ADR-009).
- **iPhone.** Se muestran instrucciones para "Añadir a pantalla de inicio". En iOS, Web Push solo funciona con la PWA instalada (iOS 16.4+).
- **Modos de conexión.** Siempre visibles en la barra superior; nunca se simula un offline que no existe:

| Modo | Cuándo | Funciona | Se bloquea (con explicación) |
|---|---|---|---|
| **ONLINE** | Red y API responden | Todo | — |
| **DEGRADED** | Hay red, pero falla un servicio (teselas, API con 5xx, Storage) | Lista en lugar de mapa; caché con aviso "datos de hace X min"; borradores y cola | Lo que dependa del servicio caído |
| **OFFLINE** | Sin red | Shell, pantallas visitadas, última lista de lugares y rutas, borradores de reporte y consulta con foto comprimida, cola de envío, "mis reportes" (último estado sincronizado) | Teselas del mapa no visitadas, búsqueda, alta de negocios, panel |

**Cola offline:**
- cada item lleva una `idempotency_key` generada en el cliente;
- se envía al abrir la app y al volver la conexión (`OutboxSync`); no se usa Background Sync, que no existe en iPhone;
- si la sesión expiró, el item queda como "requiere iniciar sesión" y nunca se descarta en silencio.

**Actualizaciones.** Aviso "nueva versión disponible" y recarga, sin `skipWaiting` silencioso durante un formulario.

**Caché:**

| Tipo de recurso | Estrategia |
|---|---|
| Estáticos (`/_next/static`, íconos, `vendor`) | `CacheFirst` versionado |
| Capas públicas del mapa (`/api/v1/map/*`) | `StaleWhileRevalidate`, máximo 80 respuestas |
| Páginas públicas y `/reportar` | `NetworkFirst`; nunca se guardan redirecciones |
| Datos de usuario, auth, panel | `NetworkOnly`; al salir de la cuenta se borra lo guardado |

---

## 7. Mapa y geografía


### 7.1 Capas

| Capa | Geometría | Volumen | Carga |
|---|---|---|---|
| Municipios (3) | MultiPolygon | 3 | Una vez por sesión: `geom_simplified`, con caché CDN larga |
| Rutas de ecoturismo | MultiLineString | decenas | Una vez por sesión (simplificadas); geometría completa al abrir la ruta |
| Lugares turísticos | Point | decenas–cientos | Por viewport (`map_features`, capa `tourism`) |
| Negocios aprobados | Point | cientos → miles | Por viewport (capa `business`) |
| Alertas de tránsito | Point | decenas | Por viewport (capa `traffic`): solo `active`/`verified` no vencidas, sin autor. Además, en vivo por Broadcast (§11.1) |
| Consultas públicas | Point | cientos | Por viewport (capa `request`): solo `is_public` en `approved`, `in_progress` o `resolved`, sin autor |

Las consultas **no públicas** no están en el mapa público:
- el ciudadano ve las suyas en "Mi actividad" (`my_activity`);
- el personal las ve en la bandeja del panel, que lee las tablas filtradas por RLS.

No existe un endpoint de mapa autenticado aparte.

### 7.2 Zoom y viewport

| Vista | Qué se muestra | Fuente |
|---|---|---|
| Provincia | Límites de los 3 municipios y rutas simplificadas | `GET /api/v1/map/static-layers` (una vez por sesión, caché CDN) |
| Cualquier zoom | Puntos agrupados en clústeres hasta el zoom 15; al tocar un clúster, el mapa se acerca | `map_features` + clustering de MapLibre en el cliente |
| Calle (≥ 15) | Todos los puntos con su ícono | `map_features`; la ficha se pide al tocar un punto |

`map_aggregates` (conteos por municipio) está disponible en `/api/v1/map/aggregates` para una vista provincial con cifras; hoy la UI no la usa.

**Flujo de consulta** (`src/app/(app)/_components/explorer.tsx`):
1. El mapa avisa al terminar de moverse; se esperan 300 ms (debounce).
2. El bbox se redondea hacia afuera a una rejilla de 0,01° (`snapBBox`), para compartir caché.
3. No se consulta si el bbox está contenido en uno ya cargado con las mismas capas (`containsBBox`).
4. `map_features` rechaza bbox inválidos o de más de 2° por lado, y devuelve como máximo 500 features, con `truncated: true` cuando hay más.
5. La respuesta lleva solo `id`, capa, categoría, coordenadas y título. Fotos, horario y descripción se piden al abrir la ficha.

**[Fase 2/3]:** si los negocios superan ~20 000, vector tiles propios (`ST_AsMVT`) con caché CDN.

### 7.3 Mapa base y navegación ([ADR-022](docs/decisions/ADR-022-maplibre-openfreemap.md))

- **Teselas:** OpenFreeMap, estilo `liberty`. Gratis, sin clave y sin límite de uso razonable. El worker de MapLibre se sirve desde `public/vendor/` (`scripts/copy-vendor.mjs`) para cumplir la CSP.
- **Adaptador:** toda la app usa `MapCanvas` (`modules/map`), nunca `maplibregl.*` directamente. Cambiar de proveedor (MapTiler, Stadia, PMTiles propios) toca solo `modules/map/provider`.
- **Datos:** 100 % propios en PostGIS, devueltos como GeoJSON neutral. El mapa base solo pinta calles y relieve.
- **"Cómo llegar":** enlace a la app de navegación del teléfono, sin API. Se cuenta como métrica (`track_engagement`).
- **Atribución:** © OpenStreetMap, visible en el mapa y en los listados ([NOTICE](NOTICE)).

### 7.4 PostGIS

| Tema | Decisión |
|---|---|
| SRID | 4326 (WGS84) en todas las columnas, con typmod `geometry(<Tipo>, 4326)` |
| Distancias en metros | Cast a `geography`, con índice GiST de expresión `((geom::geography))` |
| Viewport | `geom && ST_MakeEnvelope(...)` con índice GiST |
| Pertenencia a municipio | `private.locate(geom)`, **llamada dentro de cada RPC** que crea o mueve un punto: el municipio que cubre el punto (`ST_Covers`, el borde cuenta). Si ninguno lo cubre, el más cercano a ≤ 2 km. Si tampoco hay, ninguno |
| Fuera de la provincia | Un reporte de tránsito queda `out_of_area`, visible solo para el alcance provincial. Una consulta o propuesta se rechaza con `out_of_area`. Una consulta sin ubicación exige que el ciudadano elija el municipio |
| Rutas | `municipality_id` = municipio del punto de inicio. `municipality_ids` = todos los municipios que cruza (trigger `eco_routes_municipalities`). `distance_km`, `start_point` y `geom_simplified` son columnas generadas. Entre 2 y 5 000 vértices |
| Provincia | `province_id` en toda tabla territorial, con FK compuesta `(municipality_id, province_id)`: es imposible guardar un municipio de otra provincia |
| Importación | Hoy: OpenStreetMap con scripts propios ([data/README.md](data/README.md)): límites (`ST_MakeValid` en la carga), negocios, lugares y rutas, en SQL idempotente. Cuando lleguen los datos abiertos oficiales: `ogr2ogr` → staging → validación → tablas finales, con simplificación topológica para que las fronteras compartidas no queden con huecos |

`supabase/seed.sql` trae municipios **rectangulares** solo para las pruebas locales. Staging tiene los límites reales de OpenStreetMap (`supabase/ops/load_osm_boundaries.sql`).

**Consultas espaciales tipo.** Son patrones para funciones nuevas; hoy el SQL usa el viewport y la pertenencia:

| Pregunta | Patrón | Índice que usa |
|---|---|---|
| Objetos visibles en pantalla | `geom && ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326)` + filtros + `LIMIT 500` | GiST de `geom` |
| Negocios a 1 km de un punto | `ST_DWithin(geom::geography, punto::geography, 1000)` + `ORDER BY geom <-> punto` + `LIMIT` | GiST de expresión `(geom::geography)` |
| Lugares turísticos a 2 km | El mismo patrón, con 2000 | Ídem |
| Rutas cercanas | `ST_DWithin(ruta.geom::geography, punto::geography, 3000)` | Ídem |
| Reportes dentro de una zona dibujada | `ST_Intersects(r.geom, zona)` | GiST de `geom` |
| Clustering en servidor (si el cliente no alcanza) | `ST_SnapToGrid(geom, tamaño_de_celda_por_zoom)` + `count(*)` agrupado | GiST de `geom` |

---

## 8. Backend y datos

Resumen. El detalle (columnas, índices, políticas, matriz de grants) está en [DATABASE.md](DATABASE.md).

### 8.1 Cifras del esquema verificado

| | |
|---|---|
| Migraciones | 17 (`20260924120000` a `20260925120000`) |
| Tablas | 27 en `public` (todas con RLS) y 6 en `private` |
| Funciones | 35 en `public` (32 `SECURITY DEFINER`, 3 `SECURITY INVOKER`) y 34 en `private` |
| Seguridad | 31 políticas RLS + 4 de Storage; grants por columna; `EXECUTE` explícito por función |
| Índices | 109, incluidos GiST, GIN y parciales |
| Triggers | 16 |
| Pruebas | 113, todas pasan (§14.1) |

### 8.2 Esquemas y roles de base de datos

| Esquema | Expuesto por la Data API | Contenido |
|---|---|---|
| `public` | Sí | Tablas de negocio con RLS y las RPC invocables |
| `private` | No | Helpers de RLS, transiciones, rate limit, cola, mantenimiento. Los helpers que usan las políticas tienen `EXECUTE` concedido a `anon`/`authenticated`, porque las políticas se evalúan con el rol del usuario |
| `extensions` | No | PostGIS, `pg_trgm`, `unaccent`, `pgcrypto`, `pg_net`. Con `USAGE` concedido, para que las funciones INVOKER vean los tipos de PostGIS |

| Rol de Postgres | Quién |
|---|---|
| `anon` | Visitante sin sesión |
| `authenticated` | Usuario con sesión. Su rol de negocio real sale de `user_roles` |
| `service_role` | Solo el worker y el cron, en el servidor |

### 8.3 Contrato de las RPC

1. La identidad sale de `auth.uid()`, nunca de un parámetro.
2. Cada RPC asume que la llaman directamente con la anon key y valida todo por sí misma.
3. Los rechazos se devuelven (`{status:'rejected', reason}`), no se lanzan.
4. **Idempotencia** con `p_idempotency_key` y `UNIQUE (autor, clave)` en las tres creaciones que se reintentan desde la cola offline o un doble envío: `create_traffic_report`, `create_citizen_request` y `submit_business`. Las demás creaciones se protegen con rate limit y restricciones únicas (`request_votes`, `business_hours`) o con `FOR UPDATE` (`escalate_traffic_report` devuelve la incidencia existente).
5. **Compare-and-set** en cambios de estado: `p_expected_status`. Si otro se adelantó, se devuelve `stale_state` con el estado actual.
6. **Bloqueo optimista** en ediciones: `p_version`. Si no coincide, se devuelve `version_conflict`. Lo usan `update_business`, `update_place` y `update_route`.
7. Los efectos secundarios se encolan con `private.enqueue()` en la misma transacción.
8. `SECURITY DEFINER` siempre con `search_path` fijo:
   - RPC de `public`: `pg_catalog, extensions, public`, porque usan tipos de PostGIS;
   - helpers internos: `''`, con nombres totalmente calificados.

**Mapeo de `reason` a HTTP** (capa 1):

| Resultado | HTTP |
|---|---|
| `status: ok` | 200 / 201 |
| `not_authenticated` | 401 |
| `forbidden`, `own_request` | 403 |
| `not_found` | 404 |
| `stale_state`, `version_conflict`, `conflict` | 409 |
| Errores de validación (`invalid_*`, `*_required`, `out_of_area`, `not_votable`, `no_changes`, `unknown_field`, `bbox_too_large`, …) | 422 |
| `rate_limited` | 429 |
| Excepción no controlada | 500 sin detalles; el detalle va a Sentry |

### 8.4 Modelo de datos (resumen)

```mermaid
erDiagram
    provinces ||--|{ municipalities : agrupa
    profiles ||--o{ user_roles : tiene
    municipalities ||--o{ user_roles : "alcance (NULL = provincia)"
    business_categories ||--o{ businesses : clasifica
    businesses ||--o{ business_members : "dueños y personal"
    profiles ||--o{ business_members : administra
    businesses ||--o{ business_hours : horario
    businesses ||--o{ promotions : publica
    municipalities ||--o{ businesses : contiene
    municipalities ||--o{ tourism_places : contiene
    municipalities ||--o{ eco_routes : "inicio (y cruza)"
    request_categories ||--o{ citizen_requests : "categoría y tipo"
    profiles ||--o{ citizen_requests : "crea / atiende"
    citizen_requests ||--o{ request_status_history : historial
    citizen_requests ||--o{ request_votes : apoyos
    profiles ||--o{ request_votes : vota
    traffic_report_types ||--o{ traffic_reports : tipifica
    profiles ||--o{ traffic_reports : reporta
    citizen_requests |o--o| traffic_reports : "escalado desde"
    businesses ||--o{ attachments : fotos
    tourism_places ||--o{ attachments : fotos
    eco_routes ||--o{ attachments : fotos
    traffic_reports ||--o{ attachments : evidencia
    citizen_requests ||--o{ attachments : evidencia
    profiles ||--o{ notifications : recibe
    profiles ||--o| notification_preferences : configura
    profiles ||--o{ push_subscriptions : dispositivos
    report_runs ||--|{ weekly_kpi_snapshots : congela
```

Tablas que no aparecen en el diagrama porque no tienen relaciones que aporten:
- **en `public`:** `feature_flags`, `engagement_daily` (métricas diarias agregadas), `moderation_actions` y `audit_logs`;
- **en `private`:** `jobs`, `rate_limit_rules`, `rate_limit_hits` y las tres tablas de transiciones.

**Decisiones de modelo que conviene conocer antes de programar:**

| Decisión | Motivo |
|---|---|
| Estados como `text` + `CHECK`, con transiciones en tablas `private.*_transitions` | Un `enum` no permite quitar ni renombrar valores |
| Adjuntos como **arco exclusivo**: una FK real por entidad y `CHECK (num_nonnulls(...) = 1)` | Cascadas reales y ningún adjunto huérfano |
| Horario normalizado en `business_hours` (`weekday`, `opens`, `closes`) | Permite consultar "abierto ahora". Si `closes < opens`, el negocio cierra después de medianoche |
| Grants por columna: `requester_id`, `reporter_id`, `assigned_to`, `created_by`, `proposed_by` e `idempotency_key` ocultos | RLS protege filas, no columnas |
| `audit_logs` con PK `(created_at, id)` | Lista para particionado mensual sin reescribir la tabla |
| `weekly_kpi_snapshots` inmutables por `report_run_id` | Cada PDF se puede auditar contra sus propios datos |
| `UNIQUE NULLS NOT DISTINCT` donde `NULL` significa "provincia" | Sin eso, dos `NULL` no chocan y se duplican filas |
| FK hacia `profiles`: `CASCADE` en los datos propios, `SET NULL` en el historial | La baja de una cuenta no rompe estadísticas ni historial |
| `translations jsonb` en negocios, lugares, rutas y categorías | Inglés en Fase 2 sin cambiar el esquema |
| En Storage se guarda `bucket` + `path`, nunca URLs | Se puede cambiar de dominio o CDN sin migrar datos |

### 8.5 Catálogos editables sin deploy

| Catálogo | Contenido inicial |
|---|---|
| `traffic_report_types` | accidente (gravedad 3, dura 3 h) · bache (2, 7 días) · calle_cerrada (2, 12 h) · derrumbe (3, 2 días) · desvio (1, 2 días) · obra (1, 7 días) · otro (1, 6 h) · semaforo (2, 2 días) · via_inundada (3, 12 h) |
| `request_categories` | Incidencias: agua, alumbrado, basura, infraestructura, otro_incidente · Consultas: consulta, propuesta, queja |
| `business_categories` | agroturismo, artesania, cafeteria, colmado, hotel, otro, restaurante, salud, servicios |
| `private.rate_limit_rules` | §10.6 |
| `feature_flags` | Activación por provincia o municipio |

En el MVP se editan por migración o SQL de operación. La pantalla de administración de catálogos llega en **[Fase 2]**.

---

## 9. Módulos funcionales

### 9.1 Mapa y búsqueda (F1)

- **Capas y zoom:** §7.
- **Búsqueda propia:** `search_all(q, limit)`.
  - Busca en negocios aprobados, lugares publicados y rutas publicadas.
  - Relevancia: el mayor valor entre `ts_rank` sobre `search_vector` (español, sin acentos; nombre con peso A, descripción con peso C) y la similitud por trigramas sobre `f_unaccent(name)`, que tolera errores como "monsion" → Monción.
  - La consulta admite de 2 a 80 caracteres y devuelve como máximo 50 resultados.
  - No ordena por cercanía. Eso queda para **[Fase 2]** si hace falta.
- **Sin geocodificador externo:** la búsqueda cubre solo nuestros datos. Buscar direcciones arbitrarias queda para **[Fase 2]** (ADR-022).
- **Aportes ciudadanos al mapa:**
  - lugares y rutas (§9.4);
  - negocios (§9.3);
  - alertas de tránsito (§9.2).

### 9.2 Participación ciudadana (F4 y F5)

Un solo botón "Reportar", con dos grupos. El servidor enruta cada tipo a su flujo:

| Grupo | Tabla | Naturaleza |
|---|---|---|
| **Tránsito** (los tipos de `traffic_report_types`) | `traffic_reports` | Temporal: vence solo y se ve en el mapa en vivo mientras está activo |
| **Servicios municipales**: incidencias (`kind = incident`) y consultas, quejas o propuestas (`kind = inquiry`) | `citizen_requests` | La gestiona el municipio hasta resolverla; los vecinos votan prioridades |

#### Reportes de tránsito

| Aspecto | Diseño |
|---|---|
| Crear | `create_traffic_report`: idempotente, 5 por hora. Punto obligatorio; gravedad 1–3 (si no se indica, la del tipo); descripción opcional (≤ 500) |
| Estado inicial | `out_of_area` si está fuera de la provincia; `active` si el autor tiene reputación ≥ 5; en otro caso `pending`, que modera el personal |
| Transiciones (`moderate_traffic_report`, compare-and-set) | `pending → active / rejected` · `active → verified / resolved / rejected` · `verified → resolved` · `out_of_area → rejected` |
| Reputación | +1 cuando un reporte pasa a `active` o `verified`; −2 cuando se rechaza (rango −100 a 100) |
| Vencimiento | `expires_at = now() + default_ttl` del tipo. Las lecturas filtran siempre por `expires_at > now()`, así que la visibilidad no depende del job. `pg_cron` marca `expired` cada 15 minutos, para los KPIs y para avisar por Broadcast |
| Tiempo real | Cada cambio a `active`, `verified`, `resolved`, `expired` o `rejected` se emite por Broadcast (§11.1) |
| Alerta a vecinos | Al activarse un reporte de gravedad ≥ 2 se encola una alerta por municipio (§9.5) |
| Fotos | Hasta 3, en el bucket privado (§10.5) |
| Escalar | `escalate_traffic_report(id, categoría)`: el personal convierte, por ejemplo, un bache que no se resuelve solo en una incidencia municipal enlazada (`escalated_request_id`). Conserva autor y ubicación. Repetir la llamada devuelve la misma incidencia |
| "Ya no está" | **[Fase 2]**: confirmación comunitaria del ciudadano |

#### Incidencias y consultas municipales

```text
pending → under_review → approved → in_progress → resolved → archived
   │            │            │
   └────────────┴────────────┴──→ rejected   (motivo obligatorio y visible)
```

| Aspecto | Diseño |
|---|---|
| Crear | `create_citizen_request`: idempotente, 5 por hora. `incident` exige punto. `inquiry` admite punto o municipio elegido. La categoría debe coincidir con el `kind` (FK compuesta) |
| Transiciones | `change_request_status` con compare-and-set, **un paso por llamada**, según `private.request_transitions`. Personal del municipio (o el asignado) salvo `resolved → archived`, que requiere `municipal_admin`. `in_progress` exige responsable; `resolved` exige nota; `rejected` exige motivo |
| Protección del estado | El estado no se puede actualizar directamente: los usuarios no tienen permiso de `UPDATE` sobre la tabla, y la única vía es la RPC. Un ciudadano no mueve su propio reporte, y nadie salta de `pending` a `resolved` |
| Asignar | `assign_request`: el responsable debe ser personal del municipio de la consulta |
| Visibilidad | `set_request_public`: solo el personal hace pública una consulta, y el mapa la muestra sin autor |
| Votar prioridades | `toggle_request_vote`: un voto por persona (PK `(request_id, user_id)`), solo en consultas públicas en `approved` o `in_progress`, nunca en la propia, 30 por hora. `support_count` lo mantiene un trigger. El panel ordena la bandeja por apoyos |
| Archivo automático | `pg_cron` diario: `resolved` → `archived` a los 30 días |
| Seguimiento | `my_activity()` devuelve los reportes de tránsito, las consultas y los votos del usuario con su estado. El estado de negocios y propuestas llega por notificación (`content_status`). Cada cambio de estado notifica al autor (§9.5) |
| Tiempo de resolución | Se calcula desde `request_status_history` |

### 9.3 Negocios (F2)

```text
pending → under_review → approved ⇄ suspended → archived
   │            │                        (approved → archived)
   └────────────┴──→ rejected → archived
```

| Aspecto | Diseño |
|---|---|
| Alta | `submit_business`: idempotente, 3 por día. Pin, categoría y contacto (teléfono, WhatsApp, email y web validados por `CHECK`). Entra como `pending`. El estado `draft` existe en el esquema para un futuro guardado de borradores en el servidor |
| Revisión | `review_content('business', …)` con compare-and-set. El solicitante queda como `owner` en `business_members` desde el alta; al aprobarse el negocio recibe el rol `entrepreneur`. `rejected` y `suspended` exigen motivo |
| Suspensión o archivo | El negocio sale del mapa y **sus promociones activas pasan a `paused`** |
| Edición | `update_business`: lista blanca de campos, `p_version` y 30 por hora. Miembros del negocio o personal del municipio |
| Horario | `set_business_hours`: reemplaza el horario completo, validado |
| Promociones | `create_promotion`: informativas (texto y vigencia de hasta 90 días), sin stock, códigos ni canje. Entran como `pending` y se moderan: `pending → active / rejected`, `active ⇄ paused` |
| Fotos | Hasta 10 por negocio (§10.5) |
| Estadísticas del comercio | `track_engagement(entidad, id, métrica)` suma vistas, clics en "Cómo llegar" y clics en WhatsApp por día en `engagement_daily`. Nunca se guarda una fila por evento ni se identifica al visitante. El comercio ve las de su negocio. No tiene límite por usuario porque la llaman visitantes anónimos: las cifras son orientativas, y el cliente cuenta como máximo una vista por ficha y sesión |
| Origen de los datos | Los negocios importados de OpenStreetMap (ADR-024) entran aprobados y sin dueño; el comercio que se registra completa su ficha. Solo los **aprobados** aparecen en el mapa y en `/negocios` |

### 9.4 Turismo y rutas (F1 y F3)

| Aspecto | Diseño |
|---|---|
| Lugares | Tipo (mirador, río/balneario, cultural, histórico, agroturismo, naturaleza, otro), servicios (`jsonb` validado), accesibilidad, información de horario |
| Rutas | `MultiLineString` con tipo (ecológica, cultural, aventura), dificultad (baja, media, alta), duración, servicios, y distancia calculada por la base |
| Proponer | `propose_place` / `propose_route`, 5 por día. Un ciudadano propone (`pending`, `proposed_by`); si lo hace el personal, se publica directamente. La ruta llega como GeoJSON: dibujada en el mapa o convertida desde un GPX en el cliente. Se valida geometría, pertenencia a la provincia y entre 2 y 5 000 vértices |
| Revisar | `review_content('place' / 'route', …)`: `pending → published / rejected`, `published → archived`. El autor recibe una notificación |
| Editar | `update_place` / `update_route`: lista blanca, `p_version` y 30 por hora. Puede editar el personal del municipio, o el autor mientras la propuesta siga `pending`. Solo el personal cambia la geometría de una ruta |
| Cómo llegar | Enlace que abre la app de navegación del teléfono hacia el `start_point` de la ruta o el punto del lugar (sin API) |
| Fotos | Hasta 10 por lugar o ruta (§10.5) |
| Métricas | Vistas y clics en "Cómo llegar" con `track_engagement` |
| **[Fase 2]** | Descarga GPX, perfil de elevación, inglés |

### 9.5 Notificaciones

**Web Push + VAPID, sin Firebase (ADR-013).** `notifications` es la fuente de verdad: centro in-app con `read_at`. Push es un canal de entrega.

| Tema (`kind`) | Cuándo | Destinatario |
|---|---|---|
| `request_status` | Cambia el estado de una consulta | Autor |
| `traffic_status` | Se modera un reporte de tránsito | Autor |
| `content_status` | Se revisa un negocio, lugar, ruta, promoción o foto | Autor o dueño |
| `traffic_nearby` | Un reporte de gravedad ≥ 2 pasa a `active` o `verified` | Vecinos del municipio (ver abajo) |
| `system` | Avisos de operación | Según el caso |

- **Entrega:**
  - `private.notify()` inserta la notificación y, si el usuario activó push, encola un job `push`.
  - El worker envía con `web-push` y marca `sent` o `failed`, con reintentos.
  - Una suscripción que responde 404 o 410 se elimina.
- **Alertas sobre el mapa** ("recibe notificaciones sobre el mapa"):
  - Por municipio, no por ubicación en vivo.
  - El trigger `traffic_reports_alert` encola **una sola** alerta `fanout_alert` por reporte.
  - `worker_run_fanout_alert` notifica a quienes tienen ese municipio como municipio de residencia y no han configurado preferencias (el tema viene activado por defecto), y a quienes tienen el tema `traffic_nearby` con ese municipio en su lista.
  - Excluye al autor. Solo reciben push quienes lo activaron.
  - Todas las notificaciones de una alerta se insertan en una sola transacción; el worker envía los push en lotes (máximo 500 por ejecución), para no superar el tiempo máximo de una función serverless.
- **Preferencias:** `notification_preferences` (temas, municipios de interés, push, email).
- **Canales:** `modules/notifications/channels/` con `in_app` y `push` en el MVP. El canal `email` para notificaciones llega en **[Fase 2]**: el job existe en el contrato de la cola, pero todavía ningún productor lo usa. En el MVP, el email se limita a lo que envía Supabase Auth (OTP, recuperación) por el SMTP propio.
- **iOS sin PWA instalada:** solo notificaciones in-app hasta que llegue el canal email. Es una reducción consciente del MVP: la guía de instalación en iPhone es parte del flujo de registro.

### 9.6 KPIs e informe semanal (F6)

- **Una sola fuente de KPIs: `kpi_summary(desde, hasta, municipio)`.** Cubre:
  - tránsito por tipo;
  - consultas recibidas, resueltas, rechazadas y abiertas;
  - tiempo medio de resolución y consultas más apoyadas;
  - negocios, turismo y usuarios nuevos;
  - vistas.

  El panel la llama en vivo, y el PDF se genera desde snapshots de esa misma función. Una prueba verifica que el snapshot sea igual a `kpi_summary` para el mismo periodo, así que "dashboard = 72 / PDF = 69" es imposible por construcción.
- **Acceso:**
  - KPIs del panel: `municipal_admin` de su municipio, o provincial para toda la provincia. Los moderadores no ven KPIs.
  - PDF: todo `municipal_admin` puede descargarlo. El informe es provincial, con cifras agregadas y sin datos personales.

```text
Vercel Cron DIARIO 10:00 UTC (06:00 America/Santo_Domingo)
  → GET /api/v1/cron/weekly-report   (Authorization: Bearer CRON_SECRET)
  → weekly_report_begin(periodo = semana anterior, lunes a domingo)
       · ya 'succeeded' → termina (así pasa 6 de cada 7 días)
       · 'running' con más de 15 min o 'failed' con < 5 intentos → toma atómica, attempts + 1
       · guarda weekly_kpi_snapshots (provincia + cada municipio) desde kpi_summary
  → @react-pdf/renderer (runtime Node) → reports-pdf/{provincia}/{año}/semana-{nn}/v{n}.pdf
  → weekly_report_finish(ok, storage_path) → notifica a los administradores
```

- **Idempotencia:** `UNIQUE (province_id, period_start, version)`. Vercel y el respaldo de GitHub Actions pueden dispararlo dos veces sin duplicar.
- **Regenerar:** solo el **administrador provincial**, con `weekly_report_begin(periodo, p_manual => true)`. Crea `version = máx + 1` con snapshots nuevos; nunca sobrescribe.
- **Descarga auditada (ADR-021):**
  1. El servidor llama `authorize_report_download(run_id)` con el JWT del administrador. La función valida el rol, registra `report.download` en `audit_logs` y devuelve la ruta.
  2. El servidor crea la URL firmada de 5 minutos **con el JWT del mismo usuario**, nunca con `service_role`.
  3. La política de Storage `reports_pdf_read_after_audit` solo deja leer el PDF a quien registró esa descarga en los últimos 5 minutos. Sin rastro en la auditoría no hay lectura, aunque se llame a Storage directamente.
- **Contenido del PDF:**
  - portada y resumen;
  - KPIs por municipio;
  - tránsito por tipo y gravedad;
  - consultas y tiempos de resolución, con las más apoyadas;
  - negocios y turismo.
- **Zona horaria:** todos los periodos se calculan en `America/Santo_Domingo` (UTC−4, sin horario de verano) y se guardan como `timestamptz`.
- **Plan Hobby de Vercel:** el cron solo corre una vez al día. Por eso el diseño es un chequeo diario que genera el informe si falta; todo lo más frecuente vive en `pg_cron`.

### 9.7 Panel municipal y panel del comercio

**Panel municipal** (`/admin`): Server Components, con filtros en la URL. La bandeja se actualiza por **sondeo cada 30 s**, no por Realtime (ADR-012).

| Sección | Contenido | Fase |
|---|---|---|
| Resumen | `kpi_summary` del periodo; alertas (tránsito de gravedad 3 abierto, consultas antiguas) | MVP |
| Bandejas | Tránsito, consultas e incidencias: detalle, cambio de estado, asignación, escalado, historial | MVP |
| Validaciones | Cola única de negocios, lugares, rutas, promociones y fotos (`review_content`) | MVP |
| Turismo y rutas | Alta y edición (`propose_*` publica directo si lo hace el personal; `update_place`, `update_route`) | MVP |
| Usuarios y roles | `assign_role`, `revoke_role`, según la matriz de §10.2 | MVP |
| Auditoría | Consulta de `audit_logs` por alcance | MVP |
| Informes | Historial de `report_runs`, descarga auditada; regenerar (solo provincial) | MVP |
| Sistema | Estado de la cola (`worker_queue_health`), catálogos, feature flags, reintento de jobs `dead` | Fase 2 |
| Suspensión de usuarios | Bloqueo de cuentas abusivas | Fase 2 |

**Panel del comercio** (`/negocio`): datos, horario, fotos, promociones y estadísticas propias.

---

## 10. Seguridad y privacidad

### 10.1 Autenticación

- **Registro e inicio de sesión:**
  - método: código de un solo uso o enlace por correo, sin contraseñas. El correo sale por el SMTP propio con plantillas en español;
  - captcha: **pendiente** antes de abrir al público (Turnstile nativo de Supabase Auth, [SECURITY.md](SECURITY.md));
  - al registrarse, el trigger `on_auth_user_created` crea el perfil y el rol `citizen`. Si falla, el registro falla.
- **Sesión:**
  - `@supabase/ssr` con cookies `Secure` y `SameSite=Lax`;
  - no son `httpOnly`, porque el cliente de Supabase las lee; se compensa con una CSP estricta (§10.7);
  - en el servidor se autoriza con `getUser()` (o `getClaims()` verificado, §20), nunca con `getSession()` a secas;
  - `proxy.ts` solo refresca la sesión y hace redirecciones gruesas. **No es autorización.**
- **Anti-enumeración:** respuestas genéricas en login y recuperación; captcha también en la recuperación de contraseña; límites de Supabase Auth configurados; redirecciones post-login solo a rutas internas.
- **Roles en el JWT:** no se usa el Custom Access Token Hook en el MVP. Los roles se leen de `user_roles` en cada operación (helpers `private.*`), así que un cambio de rol tiene efecto inmediato y no espera a que venza el token.
- **Paneles:** el layout de servidor verifica el rol, cada Server Action vuelve a verificarlo y la RPC decide al final.
- **2FA (TOTP) obligatorio para `municipal_admin`:** **[Fase 2]**, con verificación `aal2` en las RPC administrativas.

### 10.2 Roles y permisos

Cinco roles:
- `visitor` (sin sesión);
- `citizen`;
- `entrepreneur` (se obtiene al aprobarse un negocio, nunca lo pide el usuario);
- `moderator`;
- `municipal_admin` (con alcance de municipio, o provincial si `municipality_id` es `NULL`).

**No hay `super_admin` (ADR-020).** El primer administrador provincial se crea con [`supabase/ops/grant_provincial_admin.sql`](supabase/ops/grant_provincial_admin.sql), ejecutado por la organización con `service_role` y auditado.

| Capacidad | visitor | citizen | entrepreneur | moderator | admin municipal | admin provincial |
|---|---|---|---|---|---|---|
| Ver mapa, turismo, rutas y negocios aprobados | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reportar tránsito, crear consultas, votar, proponer lugares y rutas, registrar un negocio | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver su actividad y sus notificaciones | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editar su negocio, horario, fotos y promociones | — | — | ✓ (los suyos) | — | — | — |
| Moderar tránsito, consultas, negocios, lugares, rutas, promociones y fotos | — | — | — | su municipio | su municipio | toda la provincia |
| Ver tránsito fuera de la provincia (`out_of_area`) | — | — | — | — | — | ✓ |
| Archivar consultas resueltas | — | — | — | — | su municipio | ✓ |
| Ver KPIs | — | — | — | — | su municipio | ✓ |
| Descargar el PDF semanal (provincial, auditado) | — | — | — | — | ✓ | ✓ |
| Regenerar el PDF | — | — | — | — | — | ✓ |
| Asignar o revocar `moderator` | — | — | — | — | su municipio | ✓ |
| Asignar o revocar `municipal_admin` de un municipio | — | — | — | — | — | ✓ |
| Crear otro administrador provincial | — | — | — | — | — | Solo por script de operación |
| Ver auditoría | — | — | — | — | su municipio | ✓ |

Implementación en SQL:
- helpers `private.user_has_role`, `is_staff(municipio)`, `is_admin(municipio)`, `is_provincial_admin()` e `is_any_staff()`;
- `user_roles` no tiene políticas de escritura; solo cambia por `assign_role` y `revoke_role`, con rate limit y auditoría.

### 10.3 La base de datos como barrera (ADR-018)

- **Llamadas directas.** La anon key es pública, y cualquier usuario puede llamar tablas y RPC sin pasar por Next.js. Por eso:
  - ninguna tabla crítica admite escritura directa;
  - cada RPC valida identidad, rol, alcance y entradas;
  - el captcha vive en Supabase Auth.
- **Permisos por defecto:**
  - `EXECUTE` se revoca de `PUBLIC` con la forma global de `ALTER DEFAULT PRIVILEGES`, y cada función recibe su grant explícito;
  - las políticas usan `(select auth.uid())`;
  - las comprobaciones que tocan columnas ocultas se hacen en helpers `SECURITY DEFINER` (`private.can_read_request`).
- **`SUPABASE_SERVICE_ROLE_KEY`:**
  - solo en el servidor, en `lib/supabase/admin.ts` con `import 'server-only'`;
  - la usan solo el worker y el cron, nunca un request de usuario.
- **Pruebas de ataque directo:** llaman las RPC con JWT de cada rol, saltando Next.js (§14.1).

### 10.4 Superficie expuesta

| Rol | Puede ejecutar |
|---|---|
| `anon` | `map_features`, `map_aggregates`, `search_all`, `track_engagement` + lectura de tablas públicas por RLS |
| `authenticated` | Lo anterior + las RPC de ciudadano, comercio y personal (cada una verifica el rol real) + `kpi_summary`, `weekly_report_begin` y `authorize_report_download` (solo administradores) |
| `service_role` | `worker_claim_jobs`, `worker_finish_job`, `worker_attachment_processed`, `worker_attachment_published`, `worker_run_fanout_alert`, `worker_queue_health`, `weekly_report_finish` |

La lista completa por función está en DATABASE.md §6.

### 10.5 Fotos y archivos

```text
1. Cliente  → POST /api/v1/uploads/sign                  (sesión válida)
              Next genera la ruta incoming/{uid}/{uuid}.{jpg|png|webp} y una URL de subida firmada
2. Cliente  → PUT a Storage (bucket privado report-evidence)
              Política de Storage: solo en incoming/{auth.uid()}/ y máximo 20 subidas por hora
3. Cliente  → POST /api/v1/attachments → register_attachment(entidad, id, ruta)
              Valida: ruta exacta del usuario, objeto existente, MIME (JPEG/PNG/WebP) y tamaño (≤ 5 MB),
              propiedad de la entidad, máximo 3 fotos por reporte o consulta y 10 por negocio, lugar o ruta,
              30 registros por hora → attachments 'pending' + job image_process
4. Worker   → verifica magic bytes, limita a 4096 px por lado y 40 MP, quita EXIF, re-codifica a WebP,
              guarda processed/{attachment_id}.webp → worker_attachment_processed → 'processed'
              (o 'rejected'); siempre encola el borrado del original
5. Personal → review_content('attachment', …): processed → approved / rejected
              Las fotos de negocios, lugares y rutas aprobadas → job publish_media → copia a
              public-media → worker_attachment_published. La evidencia de tránsito y consultas
              nunca se publica: queda privada, con URL firmada para el autor y el personal
```

- El nombre final lo genera el servidor. El nombre que envía el cliente nunca llega a una ruta.
- **Limpieza de subidas abandonadas.** La retención diaria borra dos casos:
  - adjuntos `pending` con más de 24 h;
  - objetos en `incoming/` que nadie registró en 24 h.
- **Descargas privadas:** `createSignedUrl` de 5 minutos, creada con el JWT del usuario, para que la política de Storage decida (evidencia: autor o personal; PDF: §9.6).

### 10.6 Límites de uso (rate limits)

Ventana fija por usuario y acción. Las reglas están en `private.rate_limit_rules`; los contadores, en `private.rate_limit_hits`. Los intentos rechazados también cuentan (principio 3).

| Acción | Límite |
|---|---|
| `traffic_report_create` | 5 por hora |
| `request_create` | 5 por hora |
| `request_vote` | 30 por hora |
| `business_submit` | 3 por día |
| `business_update` (incluye horario y promociones) | 30 por hora |
| `proposal_create` (lugares y rutas) | 5 por día |
| `content_update` (`update_place`, `update_route`) | 30 por hora |
| `attachment_register` | 30 por hora |
| `staff_action` (moderación y gestión) | 300 por hora |
| `role_change` | 30 por hora |
| Subidas a Storage (política de Storage) | 20 por hora |

**[Fase 2]:** límites más bajos para cuentas con reputación negativa, y Vercel Firewall.

### 10.7 Cabeceras y red

- **CSP estricta con nonce:**
  - permite solo el propio origen, Supabase (API, Storage y Realtime) y las teselas de OpenFreeMap;
  - sin `unsafe-inline` en scripts;
  - `frame-ancestors 'none'`.
- **Resto de cabeceras:**
  - `X-Frame-Options: DENY`;
  - HSTS;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: geolocation=(self), camera=(self), microphone=(), payment=()`.
- **CORS:** solo mismo origen, salvo `GET /api/v1/map/*`, que es público y sin credenciales.

### 10.8 Secretos

- **Variables de Vercel** por entorno, validadas al arrancar con Zod (`config/env.ts`):
  - `.env.example` sin valores en el repo;
  - secret scanning de GitHub activado.
- **Secretos que Postgres necesita en claro:** el URL y el secreto del worker van en **Vault** (`worker_url`, `jobs_secret`), cargados una vez al configurar el proyecto ([DEPLOYMENT.md §3.6](DEPLOYMENT.md)).
- **Sin claves de mapa:** OpenFreeMap no usa clave (ADR-022).

### 10.9 Auditoría

- **Quién escribe:** `private.audit()`, llamado desde las RPC y triggers. La tabla es inmutable para todos; solo la retención borra.
- **Qué se audita:**
  - cambios de rol;
  - moderación y cambios de estado;
  - escalados;
  - generación y regeneración del informe;
  - **cada descarga del PDF**, incluidos los intentos denegados (obligatoria por diseño, ADR-021);
  - bajas de cuenta.
- **Qué guarda cada registro:**
  - actor y su rol;
  - acción, entidad y resultado (`success`, `denied`, `error`);
  - municipio;
  - `before`/`after` con los campos relevantes, nunca la fila completa.
- **IPs.** Dos columnas, ninguna probatoria:
  - `ip_observed`: la IP con la que Supabase vio la llamada;
  - `ip_declared`: la que envía Next.js, solo informativa.
- **Lectura:** el administrador ve su alcance.

### 10.10 Privacidad (Ley 172-13, a validar con asesoría legal)

| Principio | Aplicación |
|---|---|
| Consentimiento | Permiso de ubicación pedido en contexto, al tocar "Reportar aquí", con explicación. Términos y privacidad al registrarse. Registro solo para mayores de edad (casilla) |
| Minimización | Solo la ubicación puntual de una acción, nunca trayectorias. Teléfono no obligatorio |
| Anonimización | El mapa público nunca muestra autores. Las fotos van sin EXIF. Los KPIs son agregados |
| Retención (`pg_cron` diario, 04:30 UTC) | Autor de reportes de tránsito → `NULL` a los 12 meses · auditoría: 2 años · notificaciones leídas: 180 días · contadores de rate limit: 2 días · jobs `done`/`dead`: 14 días · subidas abandonadas: 24 h |
| Baja de cuenta | Borrar el usuario de `auth.users` (§10.11) |
| Descargar mis datos | **[Fase 2]** |

### 10.11 Baja de cuenta

El trigger `profiles_before_delete`:
1. **Bloquea** la baja (`transfer_ownership_first`) si el usuario es el único `owner` de un negocio que no está rechazado ni archivado.
2. Encola el borrado de sus evidencias privadas en Storage y las marca como `rejected`.
3. Audita `account.delete`.

Después, las FK borran en cascada perfil, roles, membresías, preferencias, suscripciones y notificaciones. Reportes, consultas, historial y auditoría quedan con el autor en `NULL`, así las estadísticas no se rompen.

---

## 11. Tiempo real, trabajos asíncronos y tareas programadas

### 11.1 Tiempo real (ADR-012)

| Necesidad | Mecanismo |
|---|---|
| Alertas de tránsito en vivo en el mapa | **Realtime Broadcast** en el canal público `traffic:{province_id}`. El trigger `traffic_reports_broadcast` emite `{id, type, severity, lat, lng, status}`, sin autor ni fotos, cuando un reporte pasa a `active`, `verified`, `resolved`, `expired` o `rejected`. Un fallo del broadcast nunca revierte el reporte. Si el canal cae, el mapa vuelve a pedir `map_features` cada 60 s |
| Bandeja del panel municipal | **Sondeo cada 30 s**. No se usa Postgres Changes: evita una publicación de tablas con datos personales y la complejidad de RLS en Realtime |
| Estado de mi consulta | Notificación in-app + push |
| Alertas a vecinos | Notificación in-app + push (§9.5) |

Nada más usa tiempo real.

### 11.2 Flujos clave

**Reporte de tránsito creado sin conexión, con foto:**

```mermaid
sequenceDiagram
    actor U as Ciudadano
    participant C as PWA + IndexedDB
    participant N as Next.js
    participant ST as Storage
    participant DB as PostgreSQL
    participant W as Worker
    U->>C: Crea el reporte sin conexión
    C->>C: Guarda borrador, foto comprimida e idempotency_key
    Note over C: Vuelve la conexión
    C->>N: POST /api/v1/reports {tipo, lat, lng, idempotency_key}
    N->>DB: create_traffic_report (JWT del usuario)
    DB->>DB: rate limit, validación, locate(), estado inicial, notify_moderators
    DB-->>N: {status: ok, id} (el mismo id si ya existía)
    N-->>C: 201
    C->>N: POST /api/v1/uploads/sign
    N-->>C: URL firmada en incoming/{uid}/{uuid}.jpg
    C->>ST: PUT foto (política: carpeta propia, 20 por hora)
    C->>N: POST /api/v1/attachments {entidad, id, ruta}
    N->>DB: register_attachment → 'pending' + job image_process
    W->>DB: worker_claim_jobs
    W->>ST: descarga, quita EXIF, re-codifica a WebP, guarda processed/
    W->>DB: worker_attachment_processed → 'processed'
    Note over DB: Si el reporte se activa: broadcast en traffic:{provincia} y alerta a vecinos
```

**Informe semanal:**

```mermaid
sequenceDiagram
    participant CR as Vercel Cron (diario)
    participant N as Route Handler
    participant DB as PostgreSQL
    participant ST as Storage
    CR->>N: GET /api/v1/cron/weekly-report (CRON_SECRET)
    N->>DB: weekly_report_begin(semana anterior)
    alt Ya generado o tomado por otro proceso
        DB-->>N: skipped
        N-->>CR: 200
    else Nuevo, running vencido o failed con reintentos
        DB->>DB: toma atómica + snapshots desde kpi_summary
        DB-->>N: run_id + snapshots
        N->>N: @react-pdf/renderer
        N->>ST: sube reports-pdf/...
        N->>DB: weekly_report_finish(ok, ruta) → notifica a los administradores
        N-->>CR: 200
    end
```

**Descarga auditada del PDF:**

```mermaid
sequenceDiagram
    actor A as Administrador
    participant N as Next.js
    participant DB as PostgreSQL
    participant ST as Storage
    A->>N: Descargar informe
    N->>DB: authorize_report_download(run_id) con su JWT
    DB->>DB: valida rol, registra report.download en audit_logs
    DB-->>N: {status: ok, path}
    N->>ST: createSignedUrl(path, 300 s) con el JWT del administrador
    ST->>DB: política: ¿descarga registrada hace ≤ 5 min por este usuario?
    ST-->>N: URL firmada
    N-->>A: redirección al PDF
```

### 11.3 Cola de trabajos (ADR-016)

- **Tabla:** `private.jobs` con `kind`, `payload`, `dedupe_key`, `run_at`, `attempts`, `max_attempts`, `status` y `locked_until`.
- **Productores:** insertan con `private.enqueue()` dentro de su transacción. `dedupe_key` es único mientras el job está activo.
- **Consumidor:** `POST /api/v1/internal/jobs/run` (protegido con `JOBS_SECRET`).
  - Lo despierta `pg_cron` cada minuto por `pg_net`.
  - Toma lotes con `worker_claim_jobs` (`FOR UPDATE SKIP LOCKED`, recuperando locks vencidos).
  - Cierra cada job con `worker_finish_job`: `done`, o reintento con espera de 30 s × 2^(intentos − 1), o `dead` al agotar los intentos.

| `kind` | Productor | Qué hace el worker |
|---|---|---|
| `push` | `private.notify()` | Envía Web Push (`worker_push_payload` / `worker_push_result`) |
| `notify_moderators` | Creación de reportes de tránsito, consultas, negocios, promociones y propuestas | `worker_notify_moderators`: avisa al personal del municipio (nunca al autor) |
| `image_process` | `register_attachment` | Procesa la foto (§10.5) |
| `publish_media` | Aprobación de una foto pública | Copia a `public-media` |
| `fanout_alert` | Trigger `traffic_reports_alert` | Llama `worker_run_fanout_alert` y después envía los push |
| `delete_storage_object` | Procesamiento, retención, baja de cuenta | Borra el objeto de Storage |
| `email` | — (reservado) | **[Fase 2]**: canal email de notificaciones |
| `pdf_weekly` | "Generar ahora" del panel (`request_weekly_report`) | Renderiza y sube el PDF de esa versión (`worker_report_run`). El cron diario sigue en línea |

**Salud:** `worker_queue_health()` devuelve los pendientes, el más antiguo, los fallidos y los `dead`. `/api/v1/health` falla si el pendiente más antiguo tiene más de 10 minutos.

### 11.4 Tareas programadas

| Tarea | Frecuencia | Dónde |
|---|---|---|
| Despertar al worker | Cada minuto | `pg_cron` → `private.wake_worker()` → `pg_net` |
| Marcar tránsito vencido | Cada 15 minutos | `pg_cron` → `private.expire_traffic_reports()` |
| Archivar consultas resueltas (30 días) | Diaria, 04:15 UTC | `pg_cron` → `private.archive_resolved_requests()` |
| Retención y limpieza (§10.10) | Diaria, 04:30 UTC | `pg_cron` → `private.apply_retention()` |
| Informe semanal | Diaria, 10:00 UTC (genera solo si falta) | Vercel Cron → `/api/v1/cron/weekly-report`. Respaldo: GitHub Actions `schedule` |
| Copia de seguridad | Diaria | GitHub Action con `pg_dump` (§13.5) |

---

## 12. API

### 12.1 Convenciones

- **Rutas:** `/api/v1`, JSON. Las capas de mapa se devuelven en GeoJSON.
- **Errores:** los de protocolo, autenticación o servidor responden `{ error: { code, message } }`. Los rechazos de negocio responden según §8.3 con `{ status: 'rejected', reason }`.
- **Idempotencia:** los `POST` que crean reportes, consultas o negocios aceptan la cabecera `Idempotency-Key`.
- **Listados:** máximo 200 a 500 filas por consulta, suficiente para una provincia. Por encima de eso, paginación por cursor.
- **Compatibilidad:** en `/v1` solo se hacen cambios aditivos. Un cambio incompatible crea `/v2` en paralelo, que convive hasta que la versión mínima de la PWA (cabecera `X-App-Version`) lo permita.
- **Caché, tres clases que nunca se mezclan en un endpoint:**

| Clase | Ejemplos | Caché |
|---|---|---|
| Catálogos públicos estables | Capas estáticas, categorías | `public, s-maxage=3600` en CDN; los catálogos se leen una vez por request (`getCatalogs`) |
| Capas públicas volátiles | `map/features`, `map/aggregates` | `public, s-maxage=30`; se ejecutan como `anon` e ignoran cookies |
| Datos de usuario o de rol | Server Components con sesión, panel | Sin caché |

### 12.2 Endpoints HTTP

Los consumen el mapa, la cola offline, el worker y los cron. Son todos los Route Handlers que existen (`src/app/api`):

| Endpoint | Quién | Implementación |
|---|---|---|
| `GET /api/v1/map/features?bbox&layers` | anon | RPC `map_features` (caché 30 s) |
| `GET /api/v1/map/aggregates` | anon | RPC `map_aggregates` |
| `GET /api/v1/map/static-layers` | anon | Límites simplificados + rutas publicadas |
| `GET /api/v1/search?q=` | anon | RPC `search_all` |
| `POST /api/v1/engagement` | anon | RPC `track_engagement` |
| `POST /api/v1/reports` | ciudadano | RPC `create_traffic_report` (idempotente; lo usa la cola offline) |
| `POST /api/v1/requests` | ciudadano | RPC `create_citizen_request` (idempotente) |
| `POST /api/v1/requests/:id/vote` | ciudadano | RPC `toggle_request_vote` |
| `POST /api/v1/uploads/sign` | ciudadano | URL de subida firmada en `incoming/{uid}/` |
| `POST /api/v1/attachments` | ciudadano | RPC `register_attachment` |
| `GET /auth/callback` | — | Cambia el código del enlace por la sesión (PKCE) |
| `POST /api/v1/internal/jobs/run` | `JOBS_SECRET` | Worker: `worker_*` con `service_role` (§11.3) |
| `GET /api/v1/cron/weekly-report` | `CRON_SECRET` | `weekly_report_begin` → PDF → `weekly_report_finish` |
| `GET /api/v1/health` | público | `worker_queue_health`: 503 si la cola lleva más de 10 minutos atascada |

### 12.3 Server Actions (páginas con sesión)

Lo que solo se hace desde la interfaz es una **Server Action**, no un endpoint público ([ADR-023](docs/decisions/ADR-023-server-actions.md)). Si algún día hace falta desde fuera, se añade un Route Handler sobre la misma RPC.

| Pantalla | Acciones | RPC o tabla |
|---|---|---|
| Entrar (`entrar/actions.ts`) | `requestAccess`, `verifyCode`, `signOut` | Supabase Auth |
| Perfil (`perfil/actions.ts`) | `saveProfile`, `savePreferences`, `enablePush`, `disablePush` | 4 columnas de `profiles`; `notification_preferences`; `register_push_device` / `unregister_push_device` |
| Registrar negocio (`negocios/registrar`) | `registerBusiness` | `submit_business` |
| Panel del comercio (`negocio/[id]`) | `saveBusiness`, `saveHours`, `addPromotion` | `update_business`, `set_business_hours`, `create_promotion` |
| Proponer (`proponer`) | `submitPlace`, `submitRoute` | `propose_place`, `propose_route` (el GPX se convierte en el cliente) |
| Editar lugar o ruta | `savePlace`, `saveRoute` | `update_place`, `update_route` |
| Panel municipal (`admin/actions.ts`) | `moderateTraffic`, `escalateTraffic`, `changeStatus`, `assign`, `makePublic`, `review`, `grantRole`, `removeRole`, `downloadReport`, `generateReport`, `saveCatalog` | `moderate_traffic_report`, `escalate_traffic_report`, `change_request_status`, `assign_request`, `set_request_public`, `review_content`, `assign_role`, `revoke_role`, `authorize_report_download`, `request_weekly_report`, `save_catalog_item` |

Las lecturas (actividad, notificaciones, fichas, bandejas, KPIs, catálogos) las hacen los Server Components a través de los módulos (`modules/<dominio>/server.ts`), con el JWT del usuario.

---

## 13. Operación

### 13.1 Entornos

| Entorno | Next.js | Supabase | Datos |
|---|---|---|---|
| Desarrollo | `next dev` en la computadora | Proyecto `staging` (vinculado con la CLI) | Datos reales de OSM + cuentas de prueba |
| Pruebas de base | — | PGlite en memoria (`npm run test:db`) | `seed.sql` + datos de cada prueba |
| CI | GitHub Actions | PGlite | Ídem |
| Vista previa | Vercel, una por rama (solo el equipo la ve) | `staging` | Ídem |
| Producción (hoy) | Vercel, rama `main` → https://sr-conecta.vercel.app | `staging` | Reales (OSM) |
| Producción municipal | Ídem, con dominio propio | Proyecto `production` aparte ([DEPLOYMENT.md §3](DEPLOYMENT.md)) | Reales |

### 13.2 Cuentas y planes

| Fase | Supabase | Vercel |
|---|---|---|
| Reto y demo | Free | Hobby |
| Producción municipal | Pro (backups diarios, sin pausa) | Pro |

**Ninguna cuenta debería ser personal de un integrante.** Hoy lo son; el traspaso está en [DEPLOYMENT.md §9](DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización).

### 13.3 CI/CD

```text
rama de trabajo → push / Pull Request
  CI (.github/workflows/ci.yml): lint (con fronteras) + tipos + unitarias + fronteras + base de datos (PGlite)
  Vercel: vista previa de la rama

push a main
  CI
  Vercel: publica en producción (integración Git)
  Las migraciones se aplican ANTES con `npx supabase db push` (regla del equipo, docs/REPARTO-DE-TRABAJO.md)

cuando exista el Supabase de producción (ADR-019):
  deploy.yml: comprobaciones → supabase db push → vercel deploy --prod   (DEPLOY_ENABLED=true)
  y se desactiva la publicación automática de main en vercel.json
```

Las pruebas E2E (`npm run test:e2e`) se corren a mano contra staging, porque necesitan las cuentas de prueba ([ADR-025](docs/decisions/ADR-025-e2e-contra-staging.md)).

### 13.4 Migraciones

- Solo hacia adelante.
- Siempre compatibles con el código anterior: expandir → migrar datos → contraer.
- Una responsabilidad por archivo.
- Toda tabla nueva nace con RLS, grants explícitos y su fila en la matriz de DATABASE.md §7.
- Toda función nueva lleva `search_path` fijo y `grant execute` explícito.
- Nunca se hacen cambios manuales en el dashboard de producción.

### 13.5 Copias de seguridad y recuperación

- **Plan Free:** sin backups propios de Supabase.
  - `backup.yml` hace un `pg_dump` diario **cifrado** como artefacto de GitHub (30 días). Está listo; se activa con `BACKUP_ENABLED`.
  - `npm run backup` saca una copia rápida en JSON antes de cambios grandes de datos.
- **Plan Pro:** se suman los backups diarios de Supabase.
- **Restauración:** pasos en [DEPLOYMENT.md §8.1](DEPLOYMENT.md#81-copias-de-seguridad).
- **Rollback de la app:** *Promote to Production* de una publicación anterior en Vercel. Las migraciones son compatibles con el código anterior (ADR-017), así que no se revierte la base.

### 13.6 Observabilidad

| Necesidad | Herramienta |
|---|---|
| Errores del servidor | `instrumentation.ts` → registro JSON en Vercel Logs (`onRequestError`). Si existe `SENTRY_DSN`, también a Sentry |
| Cola | `worker_queue_health` y `/api/v1/health` (503 si la cola está atascada) |
| Informe semanal | `report_runs` (estado, intentos, error) en **Panel → Informes** |
| Base de datos | Supabase: advisors de seguridad y rendimiento |
| Disponibilidad | Monitor externo gratuito sobre `/api/v1/health` (recomendado: detecta también la pausa de Supabase Free) |

### 13.7 Costos (consultados el 23/09/2026; verificar antes de presupuestar, §20)

| Servicio | Modelo | Impacto |
|---|---|---|
| OpenFreeMap | Gratis | — |
| Supabase | Free: 500 MB, pausa tras 7 días sin actividad, sin backups. Pro: desde US$25/mes por organización + cómputo por proyecto | Free para demo; Pro para producción |
| Vercel | Hobby: gratis, uso no comercial, cron diario. Pro: US$20 por miembro al mes | Hobby para demo; Team Pro para producción |
| Email, Web Push | Niveles gratuitos / sin costo | — |
| Sentry | Gratuito para 1 usuario | — |

**Orden de magnitud en Fase 2:** unos US$55–75 al mes (Supabase Pro + cómputo de `staging` + Vercel Pro). El mapa no cuesta nada. El costo real es el mantenimiento humano.

**Controles:**
- spend cap de Supabase;
- alertas de uso de Vercel;
- fotos comprimidas en el cliente.

### 13.8 Demo del reto

Guion, plan B y comprobaciones a mano: [docs/guion-demo.md](docs/guion-demo.md).

### 13.9 Variables de entorno

Se validan al arrancar con Zod (`config/env.ts`); si falta una, la aplicación no arranca. El repositorio solo contiene `.env.example`, sin valores.

| Variable | Dónde se usa | Pública | Nota |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor | Sí | Anon o publishable key; RLS la protege |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo worker y cron | **No** | Solo en `lib/supabase/admin.ts` (`server-only`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cliente | Sí | Suscripción Web Push |
| `VAPID_PRIVATE_KEY` | Worker | **No** | Firma de los push |
| `VAPID_SUBJECT` | Worker | No | `mailto:` de la organización |
| `CRON_SECRET` | Vercel Cron → `/api/v1/cron/weekly-report` | **No** | Vercel lo envía en `Authorization: Bearer` |
| `JOBS_SECRET` | `pg_net` → `/api/v1/internal/jobs/run` | **No** | El mismo valor va en Vault como `jobs_secret` |
| `SENTRY_DSN` | Servidor (opcional) | No | Si existe, `instrumentation.ts` también envía los errores a Sentry |
| `APP_TIMEZONE` | Servidor | No | `America/Santo_Domingo` |
| `DEFAULT_PROVINCE_CODE` | Servidor | No | `SR` |
| `NEXT_PUBLIC_APP_URL` | Cliente y servidor | Sí | Redirecciones de Auth y enlaces en notificaciones |

- **Configuración fuera de Vercel:**
  - SMTP: se configura en Supabase Auth (host, usuario y clave del proveedor), no en Next.js mientras no exista el canal email (Fase 2);
  - Vault: `worker_url` (URL pública de `/api/v1/internal/jobs/run`) y `jobs_secret` ([DEPLOYMENT.md §3.6](DEPLOYMENT.md)).
- **Rotación:** cada secreto se rota en Vercel y, si aplica, en Vault, sin cambiar código.

---

## 14. Calidad: pruebas y rendimiento

### 14.1 Pruebas de base de datos ✅

```bash
cd supabase/tests && npm install && npm test
```

- **Motor:** PGlite (PostgreSQL 18.3 + PostGIS 3.6.2 en WebAssembly), sin Docker.
- **Stubs de Supabase** (`supabase-stubs.sql`): `auth.uid()` desde los claims del JWT, `storage.objects`, `realtime.send`, Vault y los roles `anon`, `authenticated` y `service_role`.
- **Resultado:** todas pasan en cada push (cifras en [DATABASE.md](DATABASE.md#estado-verificado)).

| Qué cubren |
|---|
| Grants y superficie expuesta (qué ejecuta cada rol, sin funciones abiertas a `PUBLIC`) |
| RLS por rol y columnas ocultas |
| Ataques directos a las RPC con entradas inválidas y con roles sin permiso |
| Transiciones de estado, compare-and-set y bloqueo optimista |
| Idempotencia y rate limit con rechazos |
| PostGIS: pertenencia, fuera de área, rutas, viewport |
| Negocios, horarios, promociones, fotos, propuestas y edición |
| Alertas por municipio y broadcast |
| KPIs: snapshot igual a `kpi_summary` |
| Descarga del PDF: sin registro en la auditoría no hay lectura en Storage; la autorización es personal y vence a los 5 minutos |
| Cola, retención, expiración y baja de cuenta |

**No verificable fuera de Supabase:** §20.

### 14.2 Pruebas de la aplicación ✅

| Nivel | Herramienta | Qué cubre | Dónde corre |
|---|---|---|---|
| Unitarias | Vitest (`npm test`) | Mapeo de `reason` a HTTP, redirecciones seguras, rejilla de bbox, horario y "abierto ahora", lector de GPX, esquemas de negocio, procesamiento de fotos (EXIF, formato, tamaño), semanas ISO y periodos del informe, enlaces de notificaciones, secreto del worker | CI |
| Fronteras | `node:test` (`npm run test:boundaries`) | Que el lint detecte importaciones prohibidas, incluido el alias `@/` | CI |
| E2E | Playwright (`npm run test:e2e`) | Listados y filtros públicos, búsqueda sin tildes, fichas, y el recorrido central: vecino reporta → moderador publica → aparece en el mapa público. Limpia lo que crea | A mano, contra staging ([ADR-025](docs/decisions/ADR-025-e2e-contra-staging.md)) |
| Manual | Teléfonos reales | GPS, cámara, push, modo sin conexión, iPhone instalado | [Guion de la demo](docs/guion-demo.md#prueba-completa-a-mano-teléfono-real) |
| Personas | Vecinos | Baja alfabetización digital (20 puntos) | [Guía](docs/prueba-con-vecinos.md) |

### 14.3 Prototipo de diseño

- **Qué es:** `project/Main.dc.html`, navegable sin instalación. Un smoke test automatizado de 39 comprobaciones pasa.
- **Qué no representa del producto final** (limitaciones intencionales):
  - datos en memoria y sin login;
  - mapa de Esri;
  - "Generar PDF" simulado;
  - sin línea de tiempo de estados para los reportes de tránsito;
  - sin flujos de consultas `inquiry` ni de propuestas de lugares y rutas.

### 14.4 Objetivos de rendimiento

| Métrica | Móvil de gama media (4G) | Escritorio |
|---|---|---|
| LCP (páginas públicas) | < 2.5 s | < 1.5 s |
| INP | < 200 ms | < 100 ms |
| CLS | < 0.1 | < 0.1 |
| Mapa con primeras features | < 4 s | < 2.5 s |
| JS inicial propio (gzip, sin el mapa) | < 200 KB | < 200 KB |
| `map_features` p95 en servidor | < 300 ms | — |

**Técnicas:**
- el mapa solo en el cliente y el PDF solo en el servidor;
- Server Components para todo lo no interactivo;
- `next/image` y fotos en WebP;
- payload mínimo por viewport y geometrías simplificadas;
- regiones de Vercel y Supabase cercanas entre sí.

Antes de producción se revisa `EXPLAIN (ANALYZE, BUFFERS)` de `map_features`, `search_all` y `kpi_summary` con volumen realista.

---

## 15. Estructura del repositorio

```text
sr-conecta/
├─ README.md  ARCHITECTURE.md  DATABASE.md  DEPLOYMENT.md  SECURITY.md  LICENSE  NOTICE
├─ docs/
│  ├─ README.md                 índice de documentos por público
│  ├─ decisions/                ADR, una decisión por archivo
│  ├─ manual-administrativo.md  guion-demo.md  prueba-con-vecinos.md  REPARTO-DE-TRABAJO.md
├─ supabase/
│  ├─ migrations/               la fuente de verdad del modelo
│  ├─ tests/                    pruebas de la base (PGlite)
│  ├─ ops/                      scripts de operación: límites, datos de OSM, humo, admin provincial
│  ├─ templates/  config.toml   correo en español y configuración de Auth
│  └─ seed.sql                  semilla de pruebas locales
├─ data/                        datos de OpenStreetMap e importadores (data/README.md)
├─ scripts/                     cuentas de prueba, copia de seguridad, copia del worker del mapa
├─ tests/boundaries/  tests/e2e/
├─ public/                      sw.js, íconos, vendor/ (worker de MapLibre)
├─ .github/workflows/           ci.yml · deploy.yml (apagado) · backup.yml (apagado)
├─ vercel.json                  cron diario del informe
└─ src/
   ├─ app/
   │  ├─ (app)/                 páginas con su layout (§6.1); _components/ y _contenido/ son piezas de página
   │  ├─ api/v1/                Route Handlers (§12.2)
   │  ├─ auth/callback/  offline/  manifest.ts  layout.tsx
   ├─ modules/                  admin · businesses · citizen-reports · jobs · map · media
   │                            notifications · reports · routes · tourism · traffic
   │                            cada uno: index.ts (seguro para el cliente) + server.ts (solo servidor)
   │                            + server/ (queries, commands) + schemas.ts
   ├─ components/               ui/ (primitivas) · shared/ (navegación, íconos de catálogo, service worker)
   ├─ lib/                      supabase/ (server · client · anon · admin), auth, catálogos, outbox, vocabulario
   ├─ hooks/  config/  types/  utils/
   └─ proxy.ts                  sesión + CSP con nonce
```

**Reglas de módulos:**
- Un módulo solo importa de otro a través de su `index.ts` o su `server.ts`. Lo exige `eslint-plugin-boundaries` (`eslint.boundaries.mjs`), corre en `npm run lint` y en el CI, y tiene su prueba de regresión (`npm run test:boundaries`).
- Las capas compartidas (`components`, `hooks`, `lib`, `config`, `types`, `utils`) no importan módulos de dominio, y nada importa de `src/app`.
- `map` no conoce reglas de negocio: los demás módulos le entregan capas.
- `jobs` no conoce reglas de negocio: cada módulo registra sus handlers por `kind`.
- Las páginas leen y escriben **solo a través de los módulos** (o de `lib/auth` para el propio perfil); ninguna página consulta tablas directamente.
- `admin` es el backend del panel: reúne lo que el personal necesita de varios dominios, pero cada cambio de estado lo valida la RPC del dominio en la base.
- `server/queries.ts` y `server/commands.ts` son la frontera con la base; no hay capa "repositorio" adicional.

---

## 16. Alcance, plan y fases

### 16.1 Alcance del MVP

| # | Alcance | Bases | ¿Recortable? |
|---|---|---|---|
| 1 | Mapa con capas, clustering, filtros, búsqueda propia, alertas de tránsito en vivo, propuestas ciudadanas | F1 | No |
| 2 | Negocios: alta con verificación, categorías, fotos, horario, contacto, ficha, panel básico, promociones | F2 | Las promociones sí |
| 3 | Rutas: consulta con dificultad, duración y servicios; trazado por el personal y por ciudadanos | F3 | La propuesta ciudadana puede degradarse a "solo personal" |
| 4 | Tránsito: los cinco tipos de las bases y más, foto, moderación, vencimiento, tiempo real, escalado | F4 | No |
| 5 | Consultas: ciclo de estados con historial, votación, seguimiento y notificación | F5 | No |
| 6 | PDF semanal automático + regeneración | F6 | No |
| 7 | Panel municipal: KPIs, bandejas, validaciones, roles, auditoría, informes | Entregable | No |
| 8 | Notificaciones in-app + alertas por municipio | Requisito general | No |
| 9 | Web Push | Requisito general | Sí (queda in-app) |
| 10 | PWA instalable, offline shell y cola de reportes | "Móvil o web progresiva" | La cola no; la instalación sí |
| 11 | Roles y seguridad | — | No |
| 12 | Repositorio público, documentación técnica, manual de despliegue, manual administrativo | Entregable | No |

**Fuera del MVP:**
- Routes API y vector tiles;
- mapas offline e inglés;
- descargar mis datos;
- 2FA obligatorio;
- confirmaciones comunitarias ("ya no está");
- panel Sistema y suspensión de usuarios;
- email de notificaciones;
- analítica avanzada y app nativa.

**Fuera del proyecto: misiones y recompensas.** Por decisión del proyecto no existen ni se reintroducen. Los comercios tienen solo promociones informativas.

### 16.2 Regla de recorte

Si falta tiempo, se recortan primero los ítems marcados como recortables. Nunca se recortan:
- la base de datos y la seguridad;
- las notificaciones in-app;
- el PDF semanal;
- las 6 funcionalidades.

Postergar los cimientos es exactamente el cambio brusco que esta arquitectura evita.

### 16.3 Ejecución

El plan original por semanas (24/09–27/10) se adelantó: las seis funcionalidades, el panel, el PDF, la PWA y la publicación estaban en línea el 05/10. Lo que queda hasta la entrega ya no es código (contenido, prueba con vecinos, ensayo de la demo) y está repartido en [docs/REPARTO-DE-TRABAJO.md](docs/REPARTO-DE-TRABAJO.md).

### 16.4 Fases siguientes

| Capacidad | MVP | Fase 2: producción municipal | Fase 3: escala regional |
|---|---|---|---|
| Mapa | MapLibre + OpenFreeMap, viewport, clustering | Vector tiles propios si hacen falta | Multi-provincia; teselas propias (PMTiles) |
| Búsqueda | FTS + trigramas sobre datos propios | Cercanía, popularidad y direcciones | Motor dedicado si hace falta |
| Tránsito | Reportes, moderación, vencimiento, Broadcast, alertas | Confirmaciones comunitarias ("ya no está") | Datos oficiales (INTRANT/COE) si existen |
| Consultas | Ciclo completo, votos, historial | SLA, asignación automática por categoría | Integración con sistemas municipales |
| Negocios y turismo | Alta verificada, fotos, horario, promociones | Inglés, GPX, elevación | Paquetes regionales |
| Notificaciones | In-app, push, alertas por municipio | Canal email, resúmenes | Canal nativo si hay app |
| Panel | Bandejas, validaciones, roles, auditoría, informes, catálogos | Sistema (cola, flags), suspensión de usuarios | — |
| Seguridad | RLS, RPC, rate limits, auditoría | Captcha, 2FA admin (`aal2`), Vercel Firewall | Pentest externo |
| Datos | `province_id` desde hoy | Descargar mis datos | Nuevas provincias sin migración de datos; particionado de `audit_logs` |
| Cola | `private.jobs` + `pg_cron` | Más tipos de job | `pgmq` o Inngest con el mismo contrato |
| Infraestructura | Hobby + Free | Vercel Team Pro, Supabase Pro + Branching | Más cómputo, réplicas de lectura |

### 16.5 Tamaño esperado por fase

| | MVP (demo) | Fase 2: producción municipal | Fase 3: escala regional |
|---|---|---|---|
| Usuarios | Decenas (equipo, jurado, vecinos de prueba) | Miles a decenas de miles registrados; cientos a pocos miles activos por día; picos en temporada turística | Varias provincias de la Región Noroeste; cientos de miles registrados |
| Datos | OpenStreetMap + lo que cargan vecinos y municipio | Miles de negocios y de reportes por año; fotos en GB | Millones de filas en auditoría e históricos |
| Arquitectura | La de este documento | La misma, sin migraciones estructurales: solo se activa lo marcado como Fase 2 | Multi-provincia en la misma base (sin migrar datos), particionado de `audit_logs`, réplicas de lectura, tiles en CDN |
| Costo mensual | US$0 (planes gratuitos) | Decenas de USD (§13.7) | Revisar cómputo de Supabase con el volumen real |
| Organización | Equipo del reto | Responsables de moderación por municipio, SLA de respuesta a consultas, acuerdo de datos con el municipio, contrato de soporte | Gobernanza regional de datos y de roles |

Lo que no cambia en ninguna fase: PostgreSQL como fuente de verdad, la lógica crítica en la base y el monolito modular. Un servicio aparte solo se extrae si una carga concreta lo exige (por ejemplo, generación masiva de informes).

---

## 17. Riesgos

| Riesgo | Prob. | Impacto | Mitigación | Plan B |
|---|---|---|---|---|
| Llamadas directas a la API saltando Next.js | Alta | Alto | RPC autosuficientes, sin escritura directa, pruebas de ataque directo | Revocar la RPC afectada y corregir por migración |
| Supabase Free pausado antes de la demo | Media | Alto | Actividad regular, monitor de uptime | Video de respaldo |
| Correos de acceso no entregados | Media | Alto | SMTP propio (hoy Gmail, ~500/día); Resend con SPF y DKIM al tener dominio | Código de un solo uso por script para el equipo |
| Pérdida de datos (Free no tiene backups) | Media | Alto | `backup.yml` cifrado diario (activar) y `npm run backup` antes de cambios grandes | Restaurar el último dump |
| Código desplegado antes que su migración | Media | Alto | Regla: `db push` antes de subir a `main`; migraciones compatibles; `deploy.yml` cuando haya producción | Promote de la publicación anterior |
| Spam o reportes falsos | Alta | Medio | Rate limits, moderación, reputación; captcha antes de abrir al público | Moderación previa para todos |
| GPS impreciso en montaña | Alta | Medio | Pin ajustable; validación del moderador | — |
| Cartografía de OSM pobre en zonas rurales | Alta | Medio | Reportes y propuestas de los vecinos; el personal corrige desde el panel | Contribuir a OSM |
| Limitaciones de la PWA en iOS | Alta | Medio | Guía de instalación; in-app siempre | App nativa en Fase 3 si se justifica |
| Cola detenida | Media | Medio | `/health`, `worker_queue_health`, alerta en `dead` | Disparo manual del worker |
| Algo que funciona en PGlite no funciona igual en Supabase real (§20) | Media | Medio | Aplicar las migraciones en un proyecto real en la semana 1 | Ajustar por migración |
| Mantenimiento tras el reto | Alta | Alto | Documentación, catálogos sin deploy, cuentas transferibles, costos bajos | Contrato de soporte |
| Deuda técnica por la prisa del reto | Alta | Medio | Alcance claro, pruebas en lo crítico | Sprint de estabilización antes de la Fase 2 |
| Licencias incompatibles | Baja | Medio | Dependencias MIT/Apache/ISC; datos ODbL con atribución (NOTICE) | Reemplazar la dependencia |
| Brecha de seguridad: RLS mal escrita o `service_role` expuesta | Media | Alto | Pruebas de RLS y de ataque directo en CI, `server-only`, advisors de Supabase | Rotar claves, revocar la función afectada, respuesta a incidentes |
| Publicaciones manuales desde cuentas o copias equivocadas | Media | Alto | Solo publica `main` desde GitHub; una cuenta de Vercel del equipo | Promote de la publicación correcta |
| Negocios falsos o con datos inventados | Media | Medio | Verificación por el moderador (llamada o visita) antes de aprobar | Suspensión con motivo y auditoría |
| Push no entregado | Media | Bajo | Centro de notificaciones in-app siempre | Canal email en Fase 2 |
| Saturación del mapa | Media | Medio | Clustering, zoom con agregados, máximo 500 features por respuesta | Vector tiles (Fase 2/3) |
| Crecimiento de la base | Baja | Medio | Retención automática, fotos comprimidas, sin filas por evento | Plan superior, particionado |
| Caída de un proveedor durante la demo | Baja | Alto | Deployment congelado, semilla de datos, lista en lugar de mapa (modo DEGRADED) | Video de respaldo |
| OpenFreeMap deja de servir teselas | Baja | Alto | Adaptador de mapa (ADR-022); el estilo es una URL | MapTiler, Stadia o PMTiles propios |
| Lock-in de Vercel o Supabase | Baja | Medio | Tecnologías portables y autoalojables | Autoalojar (Docker/Coolify + Supabase self-hosted) |
| El municipio abandona la plataforma | Media | Alto | Costos bajos, operación simple, KPIs útiles para el municipio, manual administrativo | La licencia abierta permite que otros la continúen |

---

## 18. Decisiones de arquitectura (ADR)

Cada ADR tiene su archivo en [`docs/decisions/`](docs/decisions), con contexto, alternativas, consecuencias y riesgos. Esta tabla es el resumen. Todas están **Aceptadas**, salvo las indicadas.

| ADR | Decisión | Alternativas descartadas | Consecuencia principal |
|---|---|---|---|
| [001](docs/decisions/ADR-001-react.md) | React | Vue, Svelte, Flutter Web | Ecosistema de mapas y más desarrolladores disponibles para quien herede el proyecto |
| [002](docs/decisions/ADR-002-nextjs-app-router.md) | Next.js 16 App Router; Route Handlers para la PWA, Server Actions para los paneles; `proxy.ts` solo para sesión | Vite SPA + API aparte; Remix; Astro | Disciplina de fronteras `server-only` |
| [003](docs/decisions/ADR-003-typescript-strict.md) | TypeScript `strict`, tipos generados desde la base, Zod en fronteras | JavaScript | Tipos regenerados en CI |
| [004](docs/decisions/ADR-004-google-maps.md) | ~~Google Maps como mapa base~~ **Sustituida por ADR-022** | — | — |
| [005](docs/decisions/ADR-005-supabase.md) | Supabase como plataforma de datos; sin Edge Functions en el MVP | Firebase; Neon + Auth.js + S3; NestJS | Postgres real, portable y autoalojable |
| [006](docs/decisions/ADR-006-postgresql-unica.md) | PostgreSQL como única base de datos | Firestore, Mongo, Redis | Una sola copia de la verdad |
| [007](docs/decisions/ADR-007-postgis.md) | PostGIS con SRID 4326 y cast a `geography` | Turf en JS; Google para distancias | Consultas espaciales indexadas y gratuitas |
| [008](docs/decisions/ADR-008-monolito-modular.md) | Monolito modular | Microservicios; backend separado | Un despliegue; fronteras verificadas por lint |
| [009](docs/decisions/ADR-009-pwa.md) | PWA (service worker propio; ver su nota de implementación) | React Native, Capacitor | Sin tiendas; push en iOS solo con la PWA instalada |
| [010](docs/decisions/ADR-010-misiones.md) | Misiones — **Retirada** (24/09/2026) | — | Fuera del alcance del proyecto; no se reintroducen |
| [011](docs/decisions/ADR-011-recompensas.md) | Recompensas — **Retirada** (24/09/2026) | — | Los comercios tienen solo promociones informativas |
| [012](docs/decisions/ADR-012-realtime.md) | **Realtime solo para alertas de tránsito públicas (Broadcast por provincia).** El panel usa sondeo de 30 s. *Revisada en v2.0: ya no incluye la bandeja del panel* | Realtime para todas las capas; Postgres Changes en el panel | Sin publicación de tablas con datos personales |
| [013](docs/decisions/ADR-013-notificaciones.md) | Notificaciones: `notifications` + Web Push VAPID por la cola; email en Fase 2 | FCM, OneSignal, envío inline | Ningún evento de trigger o cron queda sin entregar |
| [014](docs/decisions/ADR-014-pdf.md) | PDF con `@react-pdf/renderer` desde snapshots inmutables, con chequeo diario | Puppeteer, pdf-lib | Sin navegador headless; versionado |
| [015](docs/decisions/ADR-015-vercel-supabase.md) | Vercel + Supabase, con cuentas de la organización | VPS + Coolify, Netlify, Cloudflare | Cero servidores que operar |
| [016](docs/decisions/ADR-016-cola-trabajos.md) | Cola de trabajos en PostgreSQL (`private.jobs`, outbox) con `pg_cron` + `pg_net` | Envío inline, Inngest, QStash, `pgmq` | Evento y efecto atómicos; consumidor reemplazable |
| [017](docs/decisions/ADR-017-evolucion-sin-rupturas.md) | Evolución sin rupturas (`province_id`, estados como texto, catálogos, PK particionables, snapshots, `translations`, API aditiva, adaptadores) | YAGNI estricto | Fases 2 y 3 aditivas |
| [018](docs/decisions/ADR-018-base-de-datos-barrera.md) | La base de datos es la barrera de seguridad | Todo con `service_role` desde Next.js | RPC autosuficientes y pruebas de ataque directo |
| [019](docs/decisions/ADR-019-orden-despliegue.md) | Producción: la Action migra y luego despliega; E2E contra Supabase local | Migrar desde el build de Vercel; base compartida | Nunca hay código nuevo sobre un esquema viejo |
| [020](docs/decisions/ADR-020-sin-super-admin.md) | Sin `super_admin`; gobernanza por `municipal_admin` provincial y scripts de operación | `super_admin` con 2FA | Nadie amplía su propio poder desde la aplicación |
| [021](docs/decisions/ADR-021-descarga-pdf-auditada.md) | Descarga del PDF con auditoría obligatoria: la política de Storage exige el registro en `audit_logs` | Firmar con `service_role` y auditar desde Next.js; no auditar | La auditoría no se puede saltar; sin `service_role` en requests de usuario |
| [022](docs/decisions/ADR-022-maplibre-openfreemap.md) | MapLibre + OpenFreeMap como mapa base definitivo del MVP, detrás del mismo adaptador | Google Maps (ADR-004) | Sin costo ni claves, cacheable sin conexión, coherente con los datos de OSM |
| [023](docs/decisions/ADR-023-server-actions.md) | Server Actions para lo que solo se hace desde la interfaz; Route Handlers solo para el mapa, la cola offline, el worker y los cron | Una API REST completa `/me/*` | Menos superficie pública; las RPC siguen siendo la barrera |
| [024](docs/decisions/ADR-024-datos-osm.md) | OpenStreetMap como fuente provisional de límites, negocios, lugares y rutas, con importadores idempotentes | Datos inventados de demostración; esperar los datos oficiales | Datos reales para la demo; los oficiales se cargan encima |
| [025](docs/decisions/ADR-025-e2e-contra-staging.md) | E2E con Playwright contra staging, a mano; el CI corre lo que no necesita cuentas | Supabase local con Docker en CI | Pruebas reales del recorrido central sin secretos en CI |

### 18.1 Decisiones que cambiaron

Ninguna decisión cambia en silencio. Las primeras filas se revisaron en la auditoría del 24–25/09/2026; las últimas, durante la construcción (hasta el 07/10/2026):

| Tema | Antes | Ahora | Motivo |
|---|---|---|---|
| Tiempo real en el panel | Postgres Changes con RLS | Sondeo cada 30 s (ADR-012) | No publicar tablas con datos personales; menos piezas |
| Endpoint de mapa autenticado `/api/v1/me/map/features` | Previsto | Eliminado | El ciudadano usa `my_activity`; el panel lee las tablas con RLS |
| 2FA del administrador provincial | Desde el MVP | Fase 2, junto con el resto de administradores (`aal2`) | Tiempo del reto; el alcance provincial solo se crea por script auditado |
| Canal email de notificaciones | MVP (para iPhone sin la PWA) | Fase 2 (ADR-013) | Recorte del MVP; in-app siempre y guía de instalación |
| Confirmar "ya no está" en tránsito | MVP | Fase 2 | El vencimiento automático cubre el MVP |
| Panel "Sistema" (cola, catálogos, flags) | MVP | Catálogos en el MVP (**Panel → Catálogos**, migración 300); cola y flags en Fase 2 | Sostenibilidad: el municipio edita sus listas sin ayuda técnica |
| Auditoría de descargas del PDF | Declarada, sin pieza que la hiciera | Obligatoria por política de Storage (ADR-021) | La v1.6 prometía algo que nada implementaba |
| Firma de la URL del PDF | Con `service_role` desde el servidor | Con el JWT del administrador (ADR-021) | Cumplir ADR-018 |
| Envío de alertas masivas | Job que dividía destinatarios en lotes de ~500 | Una función SQL inserta todas; el worker envía los push por lotes | Más simple y atómico a la escala de 3 municipios |
| Custom Access Token Hook | Opcional | No se usa en el MVP | Los roles se leen de la tabla: un cambio de rol tiene efecto inmediato |
| Municipio de un punto | Trigger | Calculado en cada RPC con `private.locate()` | Una sola regla, visible en la operación |
| Rate limit | Ventana deslizante en `private.rate_limits` | Ventana fija en `private.rate_limit_hits` | Así está implementado y probado |
| Métricas de vistas | `daily_view_counts` en Fase 2 | `engagement_daily` + `track_engagement` en el MVP | Las estadísticas del comercio son parte de F2 |
| Vértices de una ruta | Máximo 2 000 | Entre 2 y 5 000 | Margen para rutas grabadas con GPS; es lo que valida el SQL |
| Mapa base | Google Maps (ADR-004) | MapLibre + OpenFreeMap (ADR-022) | Costo, términos que impedían el uso sin conexión y tiempo del reto |
| Stack de interfaz | shadcn/ui, React Hook Form, TanStack Query, Zustand, Recharts | Componentes propios, `useActionState`, estado de React y URL, barras en CSS | No hicieron falta: menos dependencias para quien herede el proyecto |
| API de la cuenta (`/me/*`), alta de negocio y propuestas | Endpoints REST | Server Actions (ADR-023) | Solo los usa la interfaz; menos superficie pública |
| Despliegue | Action "migrar → publicar" desde el día 1 | Integración Git de Vercel + regla "migración primero"; la Action se activa con producción | Hay un solo proyecto Supabase hasta la producción municipal |
| Service worker | Serwist | Archivo propio `public/sw.js` (nota en ADR-009) | Serwist necesitaba un plugin aparte para Turbopack |
| Datos de la demo | Semilla inventada | OpenStreetMap (ADR-024) | Credibilidad frente a un jurado local |
| Catálogos editables | SQL de operación | **Panel → Catálogos** (migración 300) | Criterio de sostenibilidad |

---

## 19. No hacer

| No hacer | Hacer en su lugar |
|---|---|
| Depender de un proveedor externo para los datos | Tablas propias en PostGIS; OSM solo como fuente de importación |
| Llamar servicios externos en cada movimiento del mapa | PostGIS por viewport; servicios externos solo por intención del usuario |
| Confiar en que Next.js valida | Validación autoritativa dentro de cada RPC |
| Usar `service_role` en requests de usuario | JWT del usuario; `service_role` solo en el worker y el cron |
| `RAISE EXCEPTION` para rechazos de negocio | Devolver `{status:'rejected'}` y hacer commit |
| `enum` de Postgres para estados | `text` + `CHECK` y tablas de transiciones |
| `UNIQUE` con `NULL` significativo | `UNIQUE NULLS NOT DISTINCT` |
| `ALTER DEFAULT PRIVILEGES … IN SCHEMA` para revocar | La forma global, sin `IN SCHEMA` |
| Leer columnas ocultas dentro de una política | Helper `SECURITY DEFINER` |
| Revocar `EXECUTE` a los helpers de RLS | Esquema no expuesto + `GRANT EXECUTE` al rol |
| Mezclar datos públicos y privados en un endpoint cacheado | Endpoints separados por clase de caché |
| Enviar push inline "después del commit" | Cola `private.jobs` |
| Publicar Postgres Changes de tablas con datos personales | Broadcast con datos públicos; sondeo en el panel |
| Buckets públicos para evidencias; fotos con EXIF | Bucket privado + URL firmada; re-codificar sin EXIF |
| Subir código que usa una migración sin aplicarla antes | `db push` primero; `deploy.yml` cuando haya producción |
| SMTP por defecto de Supabase con usuarios reales | SMTP propio con dominio verificado |
| Cambios de esquema o datos desde el SQL Editor | Migraciones versionadas; datos por el panel o scripts de `supabase/ops` |
| Cuentas personales de integrantes | Cuentas de la organización |
| Rastreo GPS continuo | Ubicación puntual por acción |
| Firebase, Redux, microservicios o Kubernetes | Supabase, estado local, monolito modular |
| Cargar todos los puntos de las capas que crecen | Viewport + zoom + clustering (solo las capas pequeñas y estables se cargan completas) |
| Posponer `province_id` "hasta que haya otra provincia" | `province_id` desde el MVP (ADR-017) |
| Confiar en `proxy.ts` como autorización | Verificar sesión y rol en cada handler y acción; la RPC decide |
| Publicar a mano con `vercel deploy --prod` | Solo publica `main` desde GitHub |
| Cron o tareas programadas no idempotentes | Chequeo que genera solo si falta (`report_runs` con clave única), `dedupe_key` en la cola |
| Guardar fechas sin zona horaria | `timestamptz` + periodos calculados en `America/Santo_Domingo` |
| Crear URLs firmadas con `service_role` en un request de usuario | Firmar con el JWT del usuario y dejar que la política de Storage decida (ADR-021) |
| Reintroducir misiones o recompensas | Promociones informativas |

---

## 20. Verificaciones en el servicio real

Lo que las pruebas locales no podían confirmar se comprobó en el proyecto `staging` y en Vercel.

| # | Qué | Estado |
|---|---|---|
| 1 | Todas las migraciones se aplican en un Supabase recién creado | ✅ Staging |
| 2 | `pg_cron`, `pg_net` y Vault; las tareas programadas registradas | ✅ El worker se despierta solo cada minuto (`pg_net` → 200) |
| 3 | `realtime.send` y la suscripción a Broadcast | ✅ La alerta aparece en vivo |
| 4–5 | Metadatos y carpetas de Storage, límites de los buckets | ✅ Subida, registro y procesamiento de fotos de punta a punta |
| 6 | La Data API expone solo `public`, con los grants por defecto cerrados | ✅ Migración 240 (hallazgo con `supabase db advisors`) |
| 7 | Validación de sesión en `@supabase/ssr` | ✅ `getClaims()` |
| 8 | Captcha nativo de Supabase Auth | ⏳ Pendiente ([SECURITY.md](SECURITY.md)) |
| 9 | Límites del SMTP por defecto | ✅ 2 por hora: se usa SMTP propio |
| 10 | Conexión de los runners de GitHub por el pooler | ⏳ Al activar `backup.yml` |
| 11 | Supabase Branching | ⏳ Fase 2 (requiere Pro) |
| 12 | `proxy.ts` en Next.js 16 | ✅ |
| 13 | Límites de Vercel Hobby | ✅ Cron diario; los commits deben tener un autor reconocido por la cuenta |
| 16–17 | Simplificación y rendimiento con los polígonos reales | ✅ Límites de OSM simplificados en la carga |
| 18 | Repositorio público | ✅ 05/10/2026 |
| 19 | URL firmada del PDF con el JWT del administrador y la política de auditoría | ✅ |
| — | Precios de Google y Sentry | No aplica (ADR-022; Sentry es opcional) |

**Fuentes consultadas:**
- bases del reto: https://conectasr.com;
- OpenFreeMap: https://openfreemap.org;
- Supabase: https://supabase.com/pricing;
- Vercel: https://vercel.com/pricing y https://vercel.com/docs/cron-jobs/usage-and-pricing.

---

### Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0–1.6 | 23–24/09/2026 | Diseño inicial, revisiones, alineación con las bases y definición de la base de datos (historial en Git) |
| 2.0 | 24/09/2026 | Documento reorganizado de principio a fin. Una decisión por tema, sin secciones retiradas. Alineado con el SQL verificado: fotos, alertas por municipio, edición de lugares y rutas, métricas de uso, Realtime solo para tránsito, sondeo del panel, catálogo completo de API |
| 2.1 | 25/09/2026 | Recupera lo que la v2.0 había perdido de la v1.6 y añade: 21 ADR completas en `docs/decisions/`, registro de decisiones cambiadas (§18.1), variables de entorno (§13.9), diagramas de secuencia (§11.2), consultas espaciales tipo (§7.4), tamaño por fase (§16.5), 11 riesgos y 7 reglas de "No hacer" más. Nueva descarga auditada del PDF (ADR-021, migración `20260925120000`, 6 pruebas) |
| **2.2** | 25/09/2026 | La regla de fronteras de ADR-008 deja de ser solo documento: `package.json`, `tsconfig.json`, ESLint con `eslint-plugin-boundaries` (8 pruebas de regresión, incluido el alias `@/`), los 12 módulos con su `index.ts` y CI en GitHub Actions |
| **3.0** | 07/10/2026 | **Documento de lo construido.** Stack real (§4), una sola carpeta de rutas (§6.1), MapLibre + OpenFreeMap (§7, ADR-022), API real: Route Handlers + Server Actions (§12, ADR-023), CI/CD y operación reales (§13), pruebas E2E (§14), estructura real (§15), ejecución (§16.3), riesgos sin Google (§17), ADR-023 a 025, verificaciones resueltas (§20). Las cifras pasan a vivir solo en DATABASE.md |
