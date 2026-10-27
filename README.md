# SR Conecta

Plataforma geográfica para la provincia **Santiago Rodríguez** (República Dominicana), para el reto TechEmprende SR Conecta 2026. Pone en un solo mapa el turismo, los negocios, las rutas ecoturísticas, las alertas de tránsito en vivo y los reportes de los vecinos al municipio, con un panel municipal y un informe semanal en PDF.

> **En línea:** https://sr-conecta.vercel.app, con **datos reales** de la provincia: 84 negocios, 21 lugares y 3 rutas de OpenStreetMap, con descripciones de fuentes públicas y fotos libres de Wikimedia Commons ([data/README.md](data/README.md)).
>
> **Estado (21/10/2026):** las seis funcionalidades del reto funcionan en línea:
>
> - el mapa en vivo, el acceso por código, los reportes y su seguimiento;
> - negocios, turismo y rutas, en mapa y en **lista**, y las propuestas;
> - el panel municipal;
> - el worker de la cola (fotos, avisos y push);
> - el informe semanal en PDF;
> - el uso sin conexión.
>
> **Estado, cobertura de la rúbrica y lo que falta hasta la entrega (27/11/2026): [docs/ESTADO-Y-PENDIENTES.md](docs/ESTADO-Y-PENDIENTES.md).**
>
> Lo que falta ya no es código: [probar con vecinos](docs/prueba-con-vecinos.md), [ensayar la demo](docs/guion-demo.md), el dominio y el correo propio, y [pasar las cuentas a la organización](DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización).

---

## Cómo funciona

| Persona | Qué hace en la app |
|---|---|
| **Visitante** (sin cuenta) | Ve el mapa (turismo, negocios, rutas, alertas), busca lugares y abre "Cómo llegar" |
| **Ciudadano** | Reporta problemas en 3 pasos, sigue cómo avanzan, apoya los reportes de otros vecinos y recibe avisos |
| **Emprendedor** | Registra y gestiona su negocio: horario, fotos, promociones y estadísticas |
| **Moderador** | Revisa y aprueba reportes, negocios, lugares y fotos de su municipio |
| **Administrador municipal** | Lo anterior, más KPIs, informe PDF, roles y auditoría. No existe un "superadministrador" |

**Ejemplo, una alerta vial:**
1. El ciudadano toca **Reportar → Derrumbe**, marca el lugar y envía.
2. La alerta aparece **en vivo** en el mapa de todos y avisa a los vecinos del municipio.
3. Sale sola del mapa cuando vence.

**Ejemplo, un problema municipal:** pasa por **Recibido → En revisión → Aprobado → En proceso → Resuelto**. El autor recibe un aviso en cada paso, y los vecinos pueden apoyarlo para que se atienda primero.

**Cómo está construida:**
- **Interfaz:** Next.js 16, instalable como app en el teléfono.
- **Datos y seguridad:** Supabase (PostgreSQL + PostGIS). La base de datos decide permisos y estados, aunque alguien intente saltarse la app.
- **Mapa:** MapLibre con teselas de OpenFreeMap: gratis, sin claves y usable sin conexión ([ADR-022](docs/decisions/ADR-022-maplibre-openfreemap.md)).

Todo el detalle está en [ARCHITECTURE.md](ARCHITECTURE.md). **¿Qué leer según quién eres?** → [docs/README.md](docs/README.md).

---

## Ejecutarlo en tu computadora

**Requisitos:** Node.js 22 o superior, y el archivo `.env.local` con las claves de Supabase. Para crearlo, copia [`.env.example`](.env.example).

```bash
npm install
npm run dev
```

Abre **http://localhost:3000**.

### Entrar con una cuenta de prueba (sin esperar correo)

1. Pide un código de un solo uso:
   ```bash
   node --env-file=.env.local scripts/staging-test-users.mjs --otp ciudadano.prueba@example.com
   ```
2. En la app: **Entrar → "Ya tengo un código"**, y escribe el correo y el código.

| Cuenta de prueba | Rol |
|---|---|
| `ciudadano.prueba@example.com` | Ciudadano |
| `moderador.prueba@example.com` | Moderador de San Ignacio de Sabaneta |
| `admin.prueba@example.com` | Administración provincial |

Si las cuentas no existen, se crean con `node --env-file=.env.local scripts/staging-test-users.mjs`. Son solo para `staging`.

### Verlo desde el teléfono (sin publicar)

1. En VS Code, pestaña **Puertos → Reenviar un puerto → 3000**, iniciando sesión con GitHub.
2. Ponlo como **Público** y abre la URL `https://…devtunnels.ms` en el teléfono.
3. Para entrar, usa "Ya tengo un código".

Quita el reenvío al terminar: cualquiera con la URL ve la app.

---

## Comprobaciones

```bash
npm run check     # lint (con la regla de fronteras), tipos, pruebas unitarias y de fronteras
npm run test:db   # pruebas de la base de datos (PostgreSQL + PostGIS en memoria, sin Docker)
npm run test:e2e  # 23 pruebas en 9 archivos (axe en claro y oscuro, navegación rápida, reporte parecido…) en un navegador real contra staging, con la app corriendo; las 6 del captcha solo corren con su clave de prueba
npm run backup    # copia de los datos de staging en backups/ (antes de cambios grandes)
npm run backup:check  # simulacro: restaura la última copia en PGlite y compara los conteos (DEPLOYMENT.md §8.1)
npm run db:audit  # auditoría de seguridad de la base en línea, solo lectura (SECURITY.md)
```

El CI de GitHub ejecuta las dos primeras en cada pull request. Las de punta a punta (`test:e2e`) usan las cuentas de prueba de staging:

- **Se pueden correr varias veces seguidas.** Antes de cada corrida, `tests/e2e/global-setup.ts` reinicia los límites por hora y la reputación de las cuentas de prueba (solo de esas). Necesita la migración `20261021130000_e2e_rate_limit_reset` en staging; sin ella, avisa y sigue, y después de unas 5 corridas en la misma hora el reporte de prueba queda guardado "para cuando vuelva la señal" (límite de 5 alertas por hora).
- **Con otro puerto:** `E2E_BASE_URL=http://localhost:3101 npm run test:e2e`.
- **En la CI:** [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) construye la app en el runner y corre Playwright con Chromium contra staging en cada PR y en `main`. Está apagado hasta que exista la variable `E2E_ENABLED=true` y los secretos del entorno `e2e-staging` ([ADR-025](docs/decisions/ADR-025-e2e-contra-staging.md)). Si falla, deja el reporte y las trazas como artefacto.

Los recorridos que dependen del teléfono están en el [guion de la demo](docs/guion-demo.md#prueba-completa-a-mano-teléfono-real).

---

## Qué hay que seguir

### 1. Vincular servicios (lo hace la organización)

Nunca pegues claves en un chat ni las subas a git: van en `.env.local` (y en Vercel al publicar).

| # | Servicio | Para qué | Qué hacer | Estado |
|---|---|---|---|---|
| 1 | **Vercel** | URL pública, sin depender de una computadora | Proyecto `sr-conecta` en el equipo CERTIC SR MAPS; variables cargadas; el worker se despierta solo (Vault) | ✅ https://sr-conecta.vercel.app |
| 2 | **Dominio** | Correo verificado y dirección propia | Comprarlo (`.com` o `.do`) a nombre de la organización | ⏳ Pendiente |
| 3 | **Resend** (correo) | Hoy Supabase envía como máximo 2 correos por hora y sin código | Verificar el dominio (SPF y DKIM), crear la API key → `RESEND_API_KEY`. Luego activar las plantillas de `supabase/config.toml` | ⏳ Pendiente (requiere dominio). Mientras tanto, staging envía con **Gmail SMTP** (sin límite de 2 por hora) y las plantillas en español ya están activas |
| 4 | ~~Google Maps~~ | — | Descartado: el mapa usa MapLibre + OpenFreeMap, gratis, sin claves y usable sin conexión ([ADR-022](docs/decisions/ADR-022-maplibre-openfreemap.md)) | ✅ No hace falta |
| 5 | **Sentry** | Ver los errores en producción con alertas | Proyecto en Sentry → `SENTRY_DSN` en Vercel. Sin esto, los errores igual quedan en los registros de Vercel (`src/instrumentation.ts`) | ⏳ Opcional |
| 6 | Notificaciones push | Avisos en el teléfono | Claves VAPID: `npx web-push generate-vapid-keys` | ✅ En Vercel |
| 7 | **Supabase de producción** | Separar la demo de los datos reales | Segundo proyecto en la misma organización | Después de la demo |

Ya listos: **GitHub** (con CI y copia de seguridad diaria cifrada, a activar), **Vercel** (hoy publica a producción desde `feat/app-mvp`, que se mantiene igual a `main`; ver [DEPLOYMENT.md §4.1](DEPLOYMENT.md#41-estado-actual-05102026)) y **Supabase `staging`**, con las 30 migraciones aplicadas y datos reales de OpenStreetMap. Paso a paso: [DEPLOYMENT.md](DEPLOYMENT.md).

### 2. Construir lo que falta

Lo que falta hasta la entrega, con fechas, está en [docs/ESTADO-Y-PENDIENTES.md](docs/ESTADO-Y-PENDIENTES.md).

| Qué | Estado |
|---|---|
| Panel municipal: bandeja, validaciones, indicadores explorables (7/30/90 días, comparación, gráfico, municipios, CSV), informes, equipo, auditoría y catálogos editables | ✅ |
| Modo oscuro, foto de perfil y tipografía de lectura fácil (Lexend/Nunito) | ✅ |
| Worker de la cola: fotos, avisos al personal, alertas a vecinos, push | ✅ |
| PDF semanal: cron diario y "Generar ahora" | ✅ |
| PWA: *service worker*, página sin conexión, envío de la cola al volver la red, push por dispositivo | ✅ |
| Manual de despliegue y manual administrativo | ✅ [DEPLOYMENT.md](DEPLOYMENT.md) · [docs/manual-administrativo.md](docs/manual-administrativo.md) |
| Negocios, turismo y rutas: fichas, alta de negocio, panel del comercio, propuestas y edición | ✅ |
| Listados `/negocios`, `/turismo` y `/rutas` con filtros grandes, búsqueda sin tildes y "Llamar" | ✅ |
| Datos reales de la provincia (OpenStreetMap) en lugar de la demo | ✅ [data/README.md](data/README.md) |
| Pruebas de punta a punta (Playwright) y copias de seguridad | ✅ `npm run test:e2e` · [DEPLOYMENT.md §8.1](DEPLOYMENT.md#81-copias-de-seguridad) |
| Monitor cada hora sobre `/api/v1/health`: mantiene activo Supabase Free y avisa por correo si falla | ✅ [`uptime.yml`](.github/workflows/uptime.yml) |
| Mapa base definitivo: MapLibre + OpenFreeMap | ✅ [ADR-022](docs/decisions/ADR-022-maplibre-openfreemap.md) |
| Dominio, Resend, Supabase de producción, captcha | ⏳ Necesitan cuentas ([DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md)) |
| `LICENSE` | ✅ MIT |

### 3. Antes de la entrega (27/11/2026)

- [x] Repositorio **público** con `main` al día.
- [x] Datos reales en lugar de la demo (OpenStreetMap). Cuando la organización entregue los datos abiertos oficiales, se cargan encima.
- [x] Licencia MIT.
- [ ] Probar la app con al menos **5 vecinos reales**: criterio de baja alfabetización digital, 20 puntos → [guía](docs/prueba-con-vecinos.md).
- [ ] Completar desde el panel las descripciones y fotos de los lugares, y validar las 3 rutas con el municipio.
- [ ] Ensayar la demo de 25 minutos y grabar el video de respaldo → [guion](docs/guion-demo.md).
- [x] Copia de seguridad diaria activa y verificada (cifrada, se descifra con `BACKUP_PASSPHRASE`) → [DEPLOYMENT.md §8.1](DEPLOYMENT.md#81-copias-de-seguridad).
- [ ] Pasar las cuentas (Supabase, Vercel, correo) a la organización → [DEPLOYMENT.md §9](DEPLOYMENT.md).

---

## Estado detallado

| Funcionalidad de las bases | Estado |
|---|---|
| F1 Mapa interactivo (ver y agregar) | ✅ Mapa, capas, búsqueda, tránsito en vivo, lista, ubicación y propuestas de lugares y rutas |
| F2 Negocios | ✅ Fichas con "abierto ahora", alta en 3 pasos, panel del comercio con horario, fotos, promociones y estadísticas |
| F3 Rutas de ecoturismo | ✅ Fichas con trazado, distancia y dificultad; propuestas dibujadas o desde GPX |
| F4 Reporte de tránsito | ✅ Reportar, ver en vivo, moderar en el panel y alertas a los vecinos |
| F5 Consultas ciudadanas | ✅ Reportar, seguimiento, votos y gestión en el panel |
| F6 PDF semanal | ✅ Generación automática y a pedido, descarga auditada |

**Seguridad:**
- CSP con nonce por request y cabeceras de seguridad;
- permisos por fila y por columna en la base de datos;
- permisos por defecto de Supabase cerrados;
- redirecciones solo a rutas internas;
- fotos sin datos ocultos (EXIF).

---

## Estructura

| Ruta | Qué es |
|---|---|
| `src/app/` | Páginas y API (`/api/v1`) |
| `src/modules/` | Un módulo por dominio (mapa, tránsito, consultas, fotos, notificaciones…). Solo se comunican por su `index.ts` o `server.ts`, y el lint lo exige |
| `src/components/`, `src/lib/`, `src/hooks/` | Interfaz compartida, clientes de Supabase, utilidades |
| `supabase/migrations/` | Migraciones SQL: la fuente de verdad del modelo |
| `supabase/tests/` | Pruebas de la base de datos (cuántas y qué cubren: [DATABASE.md](DATABASE.md#estado-verificado)) |
| `supabase/ops/` | Scripts de operación: límites de municipios, datos reales de OSM, prueba de humo, administrador provincial |
| `scripts/` | Utilidades: cuentas de prueba, copia de seguridad y su simulacro de restauración, auditoría de la base, carga del contenido de lugares, copia del worker del mapa |
| `data/` | Datos geográficos reales (OpenStreetMap, ODbL) y sus importadores ([data/README.md](data/README.md)) |
| `tests/e2e/` | Pruebas de punta a punta con Playwright |
| `docs/decisions/` | Decisiones de arquitectura (ADR), una por archivo, con índice |
| `docs/` | Índice por público ([docs/README.md](docs/README.md)), manual administrativo, guía de prueba con vecinos, guion de la demo, estado y pendientes |
| `project/` | Prototipo de diseño original (referencia visual) |
| [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [SECURITY.md](SECURITY.md) | Arquitectura, base de datos, despliegue y seguridad |

## Licencia

[MIT](LICENSE).

Datos geográficos © colaboradores de OpenStreetMap (ODbL). Mapa base: OpenFreeMap.
