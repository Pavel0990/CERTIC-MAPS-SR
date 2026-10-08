# SR Conecta — Manual de despliegue

Cómo poner SR Conecta en internet desde cero, con una dirección propia, correo propio y las tareas automáticas funcionando. Está pensado para la persona del equipo que lo publica; no hace falta haber escrito el código.

> **Regla de oro:** las claves nunca se pegan en un chat, un documento ni un commit. Van en Vercel (variables de entorno), en GitHub (secretos de Actions), en Supabase Vault o en tu `.env.local`.

---

## 1. Qué se despliega

```text
Personas ──► Vercel (Next.js: páginas, API, worker, cron)
                │  claves: anon (usuarios) y service_role (solo worker y cron)
                ▼
             Supabase (PostgreSQL + PostGIS, Auth, Storage, Realtime, pg_cron, Vault)
                │  cada minuto, si hay trabajo: pg_net ──► /api/v1/internal/jobs/run
                ▼
             Resend (correo de acceso)   ·   servicios de push del navegador
```

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| Aplicación | Vercel | Páginas, API `/api/v1`, worker de la cola, informe semanal |
| Base de datos y archivos | Supabase | Datos, permisos, fotos, PDF, alertas en vivo, tareas programadas |
| Worker | Vercel, lo despierta Supabase | Procesa fotos, avisa al personal, reparte alertas, envía push, genera PDF a pedido |
| Informe semanal | Vercel Cron, diario 10:00 UTC | Genera el PDF de la semana anterior si falta |
| Correo | Resend, a través de Supabase Auth | Código y enlace para entrar |

## 2. Antes de empezar

| Necesitas | Para qué | Estado (02/10/2026) |
|---|---|---|
| Cuenta de **GitHub** con acceso al repositorio | Código y despliegue automático | ✅ |
| Cuenta de **Supabase** de la organización | Base de datos | ✅ (proyecto `staging`) |
| Cuenta de **Vercel** conectada a GitHub | Publicar la app | ⏳ |
| **Dominio** (`.do` o `.com`) | Dirección propia y correo verificado | ⏳ |
| Cuenta de **Resend** | Correo de acceso sin límite de 2 por hora | ⏳ (requiere dominio) |
| Proyecto de **Google Cloud** (opcional) | Mapa de Google; sin esto se usa OpenFreeMap | ⏳ |
| **Node.js 24** y este repositorio en tu computadora | Comandos de Supabase y Vercel | ✅ |

## 3. Supabase de producción

Hazlo en un proyecto **separado** de `staging`, para que la demo y los datos reales no se mezclen.

1. **Crear el proyecto.** Supabase → *New project*.
   - Región: `East US (North Virginia)`, la más cercana a República Dominicana.
   - Contraseña de la base: generada, guardada en el gestor de contraseñas del equipo.
2. **Aplicar las migraciones** desde tu computadora:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ID-DEL-PROYECTO>
   npx supabase db push --dry-run   # revisa la lista: deben salir todas las de supabase/migrations
   npx supabase db push
   ```
   Crean las tablas, los catálogos, los permisos, los buckets de Storage y las tareas de `pg_cron`.
3. **Crear la provincia y sus municipios con sus límites** (OpenStreetMap; se puede repetir sin duplicar):
   ```bash
   npx supabase db query --linked -f supabase/ops/load_osm_boundaries.sql
   ```
4. **Configurar el acceso.** En Supabase → *Authentication → URL Configuration*:
   - *Site URL*: `https://<tu-dominio>`
   - *Redirect URLs*: `https://<tu-dominio>/auth/callback`
5. **Correo propio (Resend).**
   1. En Resend, agrega el dominio y crea los registros SPF y DKIM que te indique en tu proveedor de DNS. Espera a que salga *Verified*.
   2. Crea una API key con permiso solo de envío.
   3. En Supabase → *Authentication → Emails → SMTP Settings*:

      | Campo | Valor |
      |---|---|
      | Host | `smtp.resend.com` |
      | Puerto | `465` |
      | Usuario | `resend` |
      | Contraseña | la API key |
      | Remitente | `no-responder@<tu-dominio>` |

   4. Activa las plantillas en español: en `supabase/config.toml`, descomenta los bloques marcados como `PENDIENTE` y ejecuta `npx supabase config push`.
6. **Secretos del worker en Vault.** En Supabase → *SQL Editor*, cambia los dos valores y ejecuta:
   ```sql
   select vault.create_secret('https://<tu-dominio>/api/v1/internal/jobs/run', 'worker_url');
   select vault.create_secret('<el mismo JOBS_SECRET que pondrás en Vercel>', 'jobs_secret');
   ```
   Para cambiarlos después: `select vault.update_secret((select id from vault.secrets where name = 'jobs_secret'), '<nuevo>');`

## 4. Vercel

1. **Importar el repositorio.** Vercel → *Add New → Project* → elige `CERTIC-MAPS-SR`. Framework: Next.js; no cambies los comandos.
2. **Variables de entorno** (*Settings → Environment Variables*, entorno *Production*). La lista completa está en [`.env.example`](.env.example).

   | Variable | De dónde sale | ¿Secreta? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → *Project Settings → API* | No |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → *Project Settings → API* | **Sí** |
   | `NEXT_PUBLIC_APP_URL` | `https://<tu-dominio>` | No |
   | `APP_TIMEZONE`, `DEFAULT_PROVINCE_CODE` | `America/Santo_Domingo`, `SR` | No |
   | `CRON_SECRET`, `JOBS_SECRET` | Genera cada uno con el comando de abajo. `JOBS_SECRET` es el mismo que pusiste en Vault | **Sí** |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` (una sola vez; si cambian, cada persona debe reactivar las notificaciones) | La privada, **sí** |
   | `VAPID_SUBJECT` | `mailto:equipo@<tu-dominio>` | No |
   | `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` | Opcional (§7) | No, pero restringida |

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
3. **Dominio.** *Settings → Domains* → agrega `<tu-dominio>` y crea en tu DNS el registro que indique Vercel.
4. **Cron del informe.** Ya está en [`vercel.json`](vercel.json): todos los días a las 10:00 UTC (06:00 en RD). Vercel le envía `CRON_SECRET` solo.
5. **Despliegue automático (ADR-019).** El despliegue de `main` lo hace el workflow [`deploy.yml`](.github/workflows/deploy.yml): primero migra la base y después publica. Cuando se active, hay que desactivar el despliegue automático de `main` en Vercel (`"git": { "deploymentEnabled": { "main": false } }` en `vercel.json`) para que solo publique el workflow; las vistas previas de los PR siguen funcionando.

   En GitHub → *Settings → Secrets and variables → Actions*:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | Secreto | `SUPABASE_ACCESS_TOKEN` | Supabase → *Account → Access Tokens* |
   | Secreto | `SUPABASE_PROJECT_ID` | ID del proyecto de producción |
   | Secreto | `SUPABASE_DB_PASSWORD` | Contraseña de la base (paso 3.1) |
   | Secreto | `VERCEL_TOKEN` | Vercel → *Account Settings → Tokens* |
   | Secretos | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `npx vercel link` y luego el archivo `.vercel/project.json` |
   | Variable | `DEPLOY_ENABLED` | `true` (mientras no exista, el workflow no hace nada) |

   Crea además el *environment* `production` en *Settings → Environments*. Ahí puedes exigir una aprobación antes de cada despliegue.

### 4.1 Estado actual (05/10/2026)

- **Proyecto:** `sr-conecta`, en el equipo CERTIC SR MAPS de Vercel, conectado al repositorio de GitHub.
- **Producción:** cada push a **`main`** publica en https://sr-conecta.vercel.app. Nadie publica a mano con `vercel deploy --prod`.
- **Base de datos:** la de **staging**. Las migraciones se aplican antes de subir el código que las usa.
- **Vistas previas:** las demás ramas generan una vista previa cada una (solo visible para el equipo).
- **Pendiente:** cuando exista el Supabase de producción, se activa el workflow `deploy.yml` (`DEPLOY_ENABLED=true`), que migra y luego publica, y se desactiva el despliegue automático de Vercel para `main` en `vercel.json` (ADR-019).

## 5. Primer arranque

1. Despliega: *Actions → deploy → Run workflow*, o un merge a `main`.
2. Entra a la app con tu correo: así se crea tu cuenta.
3. Hazte **administración provincial** con el script de operación (ADR-020; en la app no existe esa opción):
   ```bash
   psql "<cadena de conexión: Supabase → Connect → Session pooler>" -v email='tu@correo' -f supabase/ops/grant_provincial_admin.sql
   ```
4. Desde **Panel → Equipo**, da los roles de moderación y de administración municipal al personal de cada municipio.
5. **Demo:** carga los datos de demostración con `supabase/ops/seed_demo_content.sql` y quítalos antes de abrir al público con `supabase/ops/remove_demo_content.sql`.

## 6. Comprobar que todo funciona

| Qué | Cómo | Resultado esperado |
|---|---|---|
| Salud | Abrir `https://<tu-dominio>/api/v1/health` | `{"status":"ok", …}` |
| Base, permisos y tareas | `npx supabase db query --linked -f supabase/ops/smoke_remote.sql` (no deja datos) | Termina con el mensaje `SMOKE_RESULT` y cada prueba en `ok` |
| Correo | Entrar con un correo nuevo | Llega el código en menos de un minuto, desde tu dominio |
| Worker | Reportar un problema y abrir el panel como moderador | El aviso llega a la campana del moderador en 1–2 minutos |
| Fotos | Reportar con una foto | La foto aparece en el detalle y sin datos de ubicación |
| Push | **Perfil → Notificaciones en este dispositivo → Activar** y luego cambiar el estado de un reporte tuyo desde el panel | Llega la notificación al teléfono |
| Informe | **Panel → Informes → Generar ahora** (administración provincial) | En segundos aparece la versión nueva y se descarga el PDF |
| Sin conexión | Abrir el mapa, quitar la señal y recargar | El mapa sigue visible con el aviso «Sin conexión» |

Si `/api/v1/health` responde `degraded`, hay trabajos esperando más de 10 minutos. Revisa:

- que `worker_url` y `jobs_secret` estén en Vault (§3.6);
- que `JOBS_SECRET` sea idéntico en Vercel;
- los registros de la función en Vercel.

## 7. Mapa base (no requiere cuentas)

El mapa usa **MapLibre + OpenFreeMap**: gratis, sin cuenta ni claves ([ADR-022](docs/decisions/ADR-022-maplibre-openfreemap.md)). Google Maps quedó descartado; los pasos de abajo solo sirven si algún día se decide volver a él (ADR-004, sustituida):

1. En Google Cloud, crea un proyecto con facturación.
2. Activa *Maps JavaScript API* y *Places API (New)*.
3. Crea un **Map ID** de tipo JavaScript, vectorial.
4. Crea una clave **restringida**:
   - por sitio: `https://<tu-dominio>/*`;
   - por API: solo las dos anteriores.
5. Ponla en Vercel como `NEXT_PUBLIC_GOOGLE_MAPS_KEY` y `NEXT_PUBLIC_GOOGLE_MAP_ID` y vuelve a desplegar.

## 8. Operación diaria

| Tarea | Cómo |
|---|---|
| Cambiar el esquema | Nueva migración con `npx supabase migration new <nombre>`; nunca editar una aplicada. Se prueba con `npm run test:db`, se aplica en `staging` y el merge a `main` la lleva a producción |
| Rotar un secreto | Cámbialo en Vercel (y en Vault si es `JOBS_SECRET`) y vuelve a desplegar. No hace falta tocar código |
| Volver a una versión anterior de la app | Vercel → *Deployments* → *Promote to Production* en la anterior. Las migraciones son compatibles con el código anterior (ADR-017), así que no se revierte la base |
| Ver errores | Registros de Vercel y, si se configuró, Sentry |
| Ver la cola | `/api/v1/health`, o `select * from private.jobs where status in ('failed', 'dead')` en el SQL Editor |
| Datos reales de OpenStreetMap | `npm run data:osm` regenera `supabase/ops/load_osm_content.sql` desde `data/osm/`. Se aplica con `npx supabase db query --linked -f supabase/ops/load_osm_content.sql`; es idempotente |

### 8.0 Monitor de disponibilidad

El workflow [`uptime.yml`](.github/workflows/uptime.yml) llama a `/api/v1/health` cada hora. Así el proyecto de Supabase Free no se pausa por inactividad (~7 días), y si la base o la cola fallan, el workflow falla y GitHub manda un correo. Para otra URL: variable de repositorio `HEALTH_URL`.

GitHub desactiva los workflows programados de un repositorio público tras 60 días sin commits; antes de eso, reactivarlo desde *Actions → uptime*.

### 8.1 Copias de seguridad

El plan gratuito de Supabase **no tiene restauración a un punto en el tiempo**. Hay dos copias complementarias:

| Copia | Qué guarda | Cuándo | Dónde |
|---|---|---|---|
| `npm run backup` | Los **datos** de todas las tablas de `public`, en JSON (el esquema está en las migraciones) | Antes de cambios grandes de datos y antes de la demo | `backups/` en tu computadora (fuera de git: tiene datos personales) |
| Workflow [`backup.yml`](.github/workflows/backup.yml) | `pg_dump` **completo** (esquema y datos de `public`, `private`, `auth` y `storage`), **cifrado** con AES-256 | Todos los días a las 04:00 de RD, y a mano desde *Actions → backup → Run workflow* | Artefacto de GitHub, 30 días |

**Activar el workflow.** En GitHub → *Settings → Secrets and variables → Actions*:

| Tipo | Nombre | Valor |
|---|---|---|
| Secreto | `SUPABASE_DB_URL` | Supabase → *Connect* → **Session pooler** (incluye la contraseña de la base) |
| Secreto | `BACKUP_PASSPHRASE` | Una frase larga generada con el comando de abajo. **Guárdala en el gestor de contraseñas: sin ella no se puede restaurar** |
| Variable | `BACKUP_ENABLED` | `true` |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`SUPABASE_DB_URL` es la URL **completa** (`postgresql://postgres.<ref>:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres`), no solo la contraseña. Si la contraseña tiene `@ # / : ?` u otros símbolos, hay que codificarlos (`@` → `%40`, `#` → `%23`…) o cambiarla por una solo de letras y números. Se guarda con `gh secret set SUPABASE_DB_URL`, que pide el valor sin mostrarlo.

**Restaurar** (en un proyecto nuevo o después de un desastre):

```bash
# 1. Descargar el artefacto desde Actions → backup → la ejecución → Artifacts
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in sr-conecta-AAAAMMDD-HHMM.dump.enc -out copia.dump   # pide la frase
# 2. Restaurar con PostgreSQL 17 (por ejemplo, con Docker)
docker run --rm -v "$PWD:/w" postgres:17 pg_restore --no-owner --no-privileges --clean --if-exists -d "<SUPABASE_DB_URL>" /w/copia.dump
```

Restaurar **solo los datos** desde el JSON de `npm run backup`: cada tabla es una lista de filas. Se reinsertan con `insert into public.<tabla> select * from jsonb_populate_recordset(null::public.<tabla>, '<filas>')`, respetando el orden de las claves foráneas (primero provincias y municipios, después perfiles, negocios y el resto).

## 9. Traspaso a cuentas de la organización

Hoy las cuentas están a nombre de una persona del equipo. Las bases piden que el proyecto se pueda transferir a FUNDESER, y si esa persona pierde el acceso, se cae todo. Antes de la entrega:

| Servicio | Hoy | Qué hacer |
|---|---|---|
| **GitHub** | Repositorio en la cuenta personal `Pavel0990` | Crear una organización de GitHub (gratis) y *Settings → Transfer ownership*. Los enlaces viejos redirigen solos |
| **Supabase** | Organización personal | Invitar a la cuenta de la organización como *Owner* (*Organization → Team*), o transferir el proyecto a una organización nueva (*Project Settings → General → Transfer project*) |
| **Vercel** | Equipo "CERTIC SR MAPS" de una persona | Invitar a la cuenta de la organización. En el plan Hobby solo puede haber un miembro: pasar a Pro o transferir el proyecto (*Settings → Transfer*) |
| **Correo de acceso (SMTP)** | Gmail personal con contraseña de aplicación | Pasar a **Resend con el dominio** (§3.5), o al menos a un Gmail de la organización. Se cambia solo en *Authentication → SMTP Settings* |
| **Claves VAPID, `CRON_SECRET`, `JOBS_SECRET`** | En la computadora de quien publicó | Guardarlas en el gestor de contraseñas de la organización. Si se pierden las VAPID, las personas tienen que reactivar las notificaciones |
| **Contraseña de la base** | Personal | Cambiarla (*Project Settings → Database → Reset password*) al traspasar, y actualizar `SUPABASE_DB_URL` en GitHub |

Al terminar, la persona que hizo el traspaso **sale** de cada servicio, o queda solo como miembro, y se rotan los secretos.
