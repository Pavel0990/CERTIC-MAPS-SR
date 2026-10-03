# SR Conecta

Plataforma geográfica para la provincia **Santiago Rodríguez** (República Dominicana), para el reto TechEmprende SR Conecta 2026. Pone en un solo mapa el turismo, los negocios, las rutas ecoturísticas, las alertas de tránsito en vivo y los reportes de los vecinos al municipio, con un panel municipal y un informe semanal en PDF.

> **Estado (02/10/2026):** la base de datos está terminada y aplicada en Supabase. Funcionan:
>
> - el mapa en vivo, el acceso por código, los reportes y su seguimiento;
> - negocios, turismo, rutas y propuestas;
> - el panel municipal;
> - el worker de la cola (fotos, avisos y push);
> - el informe semanal en PDF;
> - el uso sin conexión.
>
> Falta publicar en Vercel con dominio y correo propio, y el mapa de Google (opcional). El trabajo pendiente está repartido en [docs/REPARTO-DE-TRABAJO.md](docs/REPARTO-DE-TRABAJO.md). Para publicar: [DEPLOYMENT.md](DEPLOYMENT.md).

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
- **Mapa:** OpenStreetMap (MapLibre) hoy; pasa a Google Maps al vincular la clave.

Todo el detalle está en [ARCHITECTURE.md](ARCHITECTURE.md).

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
npm run test:db   # 142 pruebas de la base de datos (PostgreSQL 18 + PostGIS, sin Docker)
```

El CI de GitHub ejecuta ambas en cada pull request.

---

## Qué hay que seguir

### 1. Vincular servicios (lo hace la organización)

Nunca pegues claves en un chat ni las subas a git: van en `.env.local` (y en Vercel al publicar).

| # | Servicio | Para qué | Qué hacer | Estado |
|---|---|---|---|---|
| 1 | **Vercel** | URL pública, sin depender de una computadora | Cuenta con el email de la organización, conectada a GitHub; luego `npx vercel login` | ⏳ Pendiente |
| 2 | **Dominio** | Correo verificado y dirección propia | Comprarlo (`.com` o `.do`) a nombre de la organización | ⏳ Pendiente |
| 3 | **Resend** (correo) | Hoy Supabase envía como máximo 2 correos por hora y sin código | Verificar el dominio (SPF y DKIM), crear la API key → `RESEND_API_KEY`. Luego activar las plantillas de `supabase/config.toml` | ⏳ Pendiente (requiere dominio) |
| 4 | **Google Maps** | Mapa de Google | Proyecto en Google Cloud, Maps JavaScript API + Places API (New), Map ID, clave restringida → `NEXT_PUBLIC_GOOGLE_MAPS_KEY` y `NEXT_PUBLIC_GOOGLE_MAP_ID` | ⏳ Pendiente (la app funciona sin esto) |
| 5 | **Sentry** | Ver los errores en producción | Proyecto Next.js → `SENTRY_DSN` | ⏳ Opcional |
| 6 | Notificaciones push | Avisos en el teléfono | Claves VAPID: `npx web-push generate-vapid-keys` | ✅ En `.env.local` local · ⏳ en Vercel al publicar |
| 7 | **Supabase de producción** | Separar la demo de los datos reales | Segundo proyecto en la misma organización | Después de la demo |

Ya listos: **GitHub** (con CI) y **Supabase `staging`**, con las 23 migraciones aplicadas, los límites reales de los municipios y datos de demostración. Paso a paso para publicar: [DEPLOYMENT.md](DEPLOYMENT.md).

### 2. Construir lo que falta

El reparto entre las dos personas del equipo, con qué carpetas toca cada una, está en [docs/REPARTO-DE-TRABAJO.md](docs/REPARTO-DE-TRABAJO.md).

| Qué | Estado |
|---|---|
| Panel municipal: bandeja, validaciones, KPIs, informes, equipo, auditoría | ✅ |
| Worker de la cola: fotos, avisos al personal, alertas a vecinos, push | ✅ |
| PDF semanal: cron diario y "Generar ahora" | ✅ |
| PWA: *service worker*, página sin conexión, envío de la cola al volver la red, push por dispositivo | ✅ |
| Manual de despliegue y manual administrativo | ✅ [DEPLOYMENT.md](DEPLOYMENT.md) · [docs/manual-administrativo.md](docs/manual-administrativo.md) |
| Negocios, turismo y rutas: fichas, alta de negocio, panel del comercio, propuestas y edición | ✅ |
| **Proveedor Google Maps** | ⏳ Necesita la clave de Google |
| **Publicar**: Vercel, dominio, Resend, Supabase de producción | ⏳ Necesita las cuentas ([DEPLOYMENT.md](DEPLOYMENT.md)) |
| `LICENSE` | ⏳ Elegir entre MIT y Apache-2.0 |

### 3. Antes de la entrega (27/10/2026)

- [ ] Hacer **público** este repositorio: las bases lo exigen.
- [ ] Probar la app con al menos **5 vecinos reales**: criterio de baja alfabetización digital, 20 puntos.
- [ ] Cambiar los datos de demostración por datos reales: `supabase/ops/remove_demo_content.sql` y los datos abiertos de la provincia.
- [ ] Ensayar la demo de 25 minutos y grabar un video de respaldo.
- [ ] Elegir la licencia (MIT o Apache-2.0).

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
| `supabase/migrations/` | 23 migraciones SQL: la fuente de verdad del modelo |
| `supabase/tests/` | 142 pruebas de la base de datos |
| `supabase/ops/` | Scripts de operación: límites de municipios, datos de demostración, prueba de humo, administrador provincial |
| `scripts/` | Utilidades (cuentas de prueba, copia del worker del mapa) |
| `data/` | Datos geográficos (OpenStreetMap, ODbL) e importador |
| `docs/decisions/` | 21 decisiones de arquitectura (ADR) |
| `project/` | Prototipo de diseño original (referencia visual) |
| [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) | Arquitectura y base de datos |

## Licencia

Por definir: MIT o Apache-2.0, según las bases del reto.

Datos geográficos © colaboradores de OpenStreetMap (ODbL). Mapa base: OpenFreeMap.
