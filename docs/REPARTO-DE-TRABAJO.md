# Reparto del trabajo pendiente

Este documento divide lo que falta de SR Conecta en dos frentes que se pueden trabajar en paralelo sin pisarse. Cada frente es dueño de sus carpetas. Los archivos compartidos tienen reglas claras.

**Fecha límite de entrega: 27/10/2026.**

| Frente | Quién | Resumen |
| --- | --- | --- |
| **A. Contenido** | Compañero | Negocios, turismo, rutas y propuestas: las pantallas que hoy dan 404 |
| **B. Plataforma** | Pavel | Worker de la cola, PDF semanal, PWA y push, Google Maps, despliegue y documentación |

¿Por qué este reparto? El frente A es casi todo interfaz y usa funciones de base de datos que **ya existen y están probadas**, así que no depende de cuentas externas. El frente B necesita las cuentas (Vercel, dominio, Resend, Google, Sentry) y toca la configuración global de la app.

---

## Antes de empezar (los dos)

1. Instalar y correr el proyecto siguiendo el [README](../README.md): `.env.local`, `npm install`, `npm run dev`.
2. Para entrar con cuentas de prueba (ciudadano, moderador, admin), usar `node scripts/staging-test-users.mjs`. Ver el README.
3. Leer, en este orden:
   - [ARCHITECTURE.md](../ARCHITECTURE.md): módulos y fronteras.
   - [DATABASE.md](../DATABASE.md): tablas, RPC y reglas.
   - [ADR-008](decisions/ADR-008-monolito-modular.md): monolito modular.
   - [ADR-018](decisions/ADR-018-base-de-datos-barrera.md): la base de datos es la barrera.
4. **Fuera de alcance, no reintroducir:** misiones y recompensas ([ADR-010](decisions/ADR-010-misiones.md) y [ADR-011](decisions/ADR-011-recompensas.md)), y el rol `super_admin` ([ADR-020](decisions/ADR-020-sin-super-admin.md)).
5. **Este proyecto usa Next.js 16.** Antes de escribir código, leer la guía que corresponda en `node_modules/next/dist/docs/` (ver [AGENTS.md](../AGENTS.md)). Algunos cambios: `proxy.ts` en vez de `middleware.ts`, y `params` y `searchParams` son `Promise`.

---

## Ramas y flujo de Git

```
feat/app-mvp   ← rama de integración (Dev se reemplaza más adelante)
 ├─ feat/contenido    ← frente A (compañero)
 └─ feat/plataforma   ← frente B (Pavel)
```

Para empezar, cada uno crea su rama:

```bash
git fetch origin
git switch -c feat/contenido origin/feat/app-mvp     # compañero
git switch -c feat/plataforma origin/feat/app-mvp    # Pavel
```

- **Pull requests pequeños y frecuentes** hacia `feat/app-mvp`: idealmente uno por pantalla o funcionalidad, no uno gigante al final.
- **Antes de cada PR:**
  ```bash
  git fetch origin && git rebase origin/feat/app-mvp
  npm run check          # lint + tipos + unit + fronteras de módulos
  npm run test:db        # si tocaste migraciones
  ```
- **Nunca** hacer `push --force` a `feat/app-mvp`, `main` ni `Dev`. En tu propia rama sí se puede, después de un rebase.
- **Secretos:** las claves van solo en `.env.local`. No van en el chat, en el código ni en los commits.

---

## Frente A: Contenido (compañero)

### Carpetas tuyas (solo tú las editas)

```
src/app/(app)/negocios/**        ← /negocios/[id], /negocios/registrar
src/app/(app)/negocio/**         ← panel del dueño ("Mi negocio")
src/app/(app)/turismo/**         ← /turismo/[id]
src/app/(app)/rutas/**           ← /rutas/[id]
src/app/(app)/proponer/**        ← /proponer y /proponer?que=ruta
src/modules/businesses/**
src/modules/tourism/**
src/modules/routes/**
src/app/api/v1/businesses/**     ← solo si hace falta una API (preferir Server Actions)
src/app/api/v1/places/**
src/app/api/v1/routes/**
```

### Tareas, en orden de prioridad

| # | Tarea | Ruta | Qué usa (ya existe) |
| --- | --- | --- | --- |
| A1 | Ficha de lugar turístico: fotos, descripción, mapa, "cómo llegar" | `/turismo/[id]` | `select` sobre `tourism_places` (RLS: solo publicados), `track_engagement` |
| A2 | Ficha de ruta: trazado en el mapa, punto de inicio, distancia y dificultad | `/rutas/[id]` | `select` sobre `eco_routes`, componente `MapCanvas` |
| A3 | Ficha de negocio: horario ("abierto ahora"), contacto, promociones vigentes | `/negocios/[id]` | `select` sobre `businesses`, `business_hours` y `promotions` |
| A4 | Registro de negocio: asistente por pasos como `/reportar` | `/negocios/registrar` | RPC `submit_business`, fotos con `media` (subida firmada) |
| A5 | Panel del dueño: editar datos, horario, promociones y ver el estado de revisión | `/negocio` | RPC `update_business`, `set_business_hours`, `create_promotion` |
| A6 | Proponer un lugar o una ruta | `/proponer` | RPC `propose_place`, `propose_route` |
| A7 | Edición de lugares y rutas por el personal (si da tiempo) | dentro de las fichas, solo staff | RPC `update_place`, `update_route` |

**Moderación:** lo que se registra o propone cae en **`/admin/validaciones`**, que ya funciona. Ahí el moderador aprueba o rechaza con `review_content`. No hace falta construir la moderación.

### Cómo hacerlo bien (seguir el patrón existente)

- **Plantillas para copiar:**
  - `src/modules/citizen-reports/` (`schemas.ts`, `server/commands.ts`, `server/queries.ts`, `index.ts` y `server.ts`);
  - `src/app/(app)/reportar/` (asistente con `useActionState`);
  - `src/app/(app)/consultas/[id]/` (ficha de detalle).
- **Entradas de cada módulo:**
  - `index.ts`: tipos y esquemas `zod`, seguros para el cliente.
  - `server.ts`: consultas y comandos, solo servidor.
  - Las páginas importan **solo** desde esos dos archivos. Lo vigila `npm run test:boundaries`.
- **Errores:** los RPC devuelven un `reason`. Para mostrarlo al usuario se usa `reasonMessage()` de `src/lib/vocabulary.ts`.
- **Componentes de interfaz:** `src/components/ui/` (`Button`, `Card`, `Field`, `Select`, `Badge`, `Sheet`, `Toast`). No crear estilos nuevos si ya existe uno.
- **Accesibilidad:** cada campo con su etiqueta, foco visible y zonas táctiles de 44 px o más. Probarlo en el celular con el túnel del README.

### Lo que dependes del frente B

- **Fotos procesadas (B1):** mientras el worker no esté listo, las fotos subidas quedan en estado `pending`. Muestra un *placeholder*, sin bloquearte. Cuando B1 esté listo, aparecerán solas.
- **Aviso al dueño cuando aprueban su negocio:** la notificación in-app ya la crea la base de datos. El push lo agrega B4. No tienes que hacer nada.

---

## Frente B: Plataforma (Pavel)

### Carpetas tuyas

```
src/modules/jobs/**              ← worker de la cola
src/modules/reports/**           ← PDF semanal
src/modules/analytics/**
src/modules/notifications/**     ← push (VAPID)
src/modules/map/provider/**      ← proveedor Google Maps
src/app/api/v1/internal/**       ← endpoints del worker y del cron
public/sw.js, src/app/manifest.ts
next.config.ts, src/proxy.ts, vercel.json
docs/**, ARCHITECTURE.md, DATABASE.md, README.md, .env.example
```

### Tareas, en orden de prioridad

| # | Tarea | Qué usa (ya existe) |
| --- | --- | --- |
| B1 | Worker de la cola en `/api/v1/internal/jobs/run`: procesar imágenes, *fan-out* de alertas y borrar archivos de Storage | `worker_claim_jobs`, `worker_finish_job`, `worker_attachment_processed` y `published`, `worker_run_fanout_alert`, `worker_queue_health` ([ADR-016](decisions/ADR-016-cola-trabajos.md)) |
| B2 | PDF semanal y cron del lunes; botón "Generar ahora" en `/admin/informes` | `weekly_report_begin` y `weekly_report_finish` ([ADR-014](decisions/ADR-014-pdf.md), [ADR-021](decisions/ADR-021-descarga-pdf-auditada.md)) |
| B3 | PWA completa: service worker, página offline, instalación | [ADR-009](decisions/ADR-009-pwa.md), *outbox* existente en `src/lib/outbox.ts` |
| B4 | Push con claves VAPID: suscripción en `/perfil` y envío desde el worker | [ADR-013](decisions/ADR-013-notificaciones.md) |
| B5 | Proveedor Google Maps detrás de la interfaz actual del mapa | [ADR-004](decisions/ADR-004-google-maps.md); necesita la clave y el Map ID |
| B6 | Despliegue: Vercel, dominio, Resend (correo), Sentry, Supabase de producción | [ADR-015](decisions/ADR-015-vercel-supabase.md), [ADR-019](decisions/ADR-019-orden-despliegue.md) |
| B7 | Documentación final: actualizar ARCHITECTURE y DATABASE (ahora son 19 migraciones), escribir DEPLOYMENT.md, el manual administrativo y LICENSE | — |

---

## Archivos compartidos: reglas para no chocar

| Archivo | Regla |
| --- | --- |
| `supabase/migrations/*` | **Nunca editar una migración existente.** Para cambios, crear una nueva con `npx supabase migration new <nombre>`; el nombre lleva la hora, así que no choca. Avisar al otro antes de `db push` a staging y agregar su prueba en `supabase/tests/run.mjs` (cada uno usa una sección nueva, sin reutilizar letras). |
| `src/types/database.ts` | **No editar a mano.** Si hay conflicto, quédate con cualquiera de las dos versiones y corre `npm run db:types`. |
| `package.json` / `package-lock.json` | Avisar antes de agregar una dependencia. Si hay conflicto en el *lock*, quédate con `package.json` resuelto y corre `npm install`. |
| `src/lib/vocabulary.ts` | Solo **agregar** líneas al final de cada mapa; no reordenar ni renombrar. |
| `src/components/shared/app-nav.tsx` | Lo toca solo A, si hace falta un enlace nuevo. Los enlaces a `/negocio` ya existen. |
| `src/app/(app)/_components/discover.tsx` y `src/modules/map/layers.ts` | Lo toca solo A, para enlazar las fichas desde el inicio y desde el mapa. |
| `src/app/(app)/perfil/**` | Los enlaces a negocio y proponer ya existen. B agrega la sección de push. Avisar si alguien más lo toca. |
| `src/app/(app)/admin/**` | Ya está terminado. B solo toca `informes/`. Para cualquier otro cambio, avisar. |

**Regla de oro:** si tienes que tocar un archivo que no es tuyo, avisa por el chat del equipo **antes** y haz un commit pequeño solo con ese cambio.

---

## Calendario sugerido

| Semana | Frente A (compañero) | Frente B (Pavel) |
| --- | --- | --- |
| 5–11 oct | A1, A2, A3 (fichas de detalle) | B1 (worker), B6 (Vercel y dominio) |
| 12–18 oct | A4, A5 (registro y panel de negocio) | B2 (PDF), B4 (push), B5 (Google Maps) |
| 19–24 oct | A6, A7, pulido de la interfaz | B3 (PWA), B7 (docs), Supabase de producción |
| 25–27 oct | **Congelar código.** Probar juntos el recorrido completo en el celular, fusionar en `main`, hacer el repo público y entregar. | |

### Lista de cierre (entre los dos)

- [ ] `npm run check` y `npm run test:db` en verde, y CI en verde
- [ ] Ninguna ruta enlazada da 404
- [ ] Recorrido de prueba completo:
  1. el ciudadano reporta;
  2. el moderador publica;
  3. el admin asigna;
  4. el dueño registra un negocio;
  5. el moderador lo aprueba;
  6. aparece en el mapa.
- [ ] Probado en Android y en iPhone, con el modo sin conexión
- [ ] README y documentación al día; sin secretos en el repositorio
- [ ] Repositorio público antes del 27/10/2026
