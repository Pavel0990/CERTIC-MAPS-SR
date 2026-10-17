# Seguridad

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa *Security → Report a vulnerability* en este repositorio (aviso privado de GitHub). Respondemos en un plazo de 7 días.

Incluye qué encontraste, cómo reproducirlo y qué datos podrían quedar expuestos. No pruebes contra datos reales de vecinos: usa las cuentas de prueba (README) o una copia local de la base.

## Modelo de seguridad, en breve

El detalle completo está en [ARCHITECTURE.md §10](ARCHITECTURE.md#10-seguridad-y-privacidad).

- **La base de datos es la barrera** ([ADR-018](docs/decisions/ADR-018-base-de-datos-barrera.md)). Cualquiera puede llamar directamente a la API de Supabase con la clave pública. Por eso cada tabla tiene RLS, cada columna personal está oculta por grants, y todo cambio de estado pasa por una función SQL que vuelve a validar rol, alcance territorial, transición y límite de uso. Lo comprueban las [pruebas de la base](supabase/tests/run.mjs) (`npm run test:db`), con ataques directos incluidos.
- **Sin `super_admin`** ([ADR-020](docs/decisions/ADR-020-sin-super-admin.md)). La administración provincial solo se crea con un script revisado.
- **`service_role` solo** en el worker de la cola y en el cron, protegidos por secreto y con comparación en tiempo constante, y en `/api/v1/health`, que solo devuelve cifras agregadas de la cola. Nunca se usa con datos de un request de usuario.
- **Navegador:**
  - CSP con nonce por request;
  - HSTS y `X-Frame-Options: DENY`;
  - redirecciones solo a rutas internas.
- **Fotos:** se re-codifican en el servidor. El EXIF (ubicación GPS) se elimina siempre, y la evidencia de reportes nunca es pública.
- **Auditoría** inmutable de las acciones del personal. El PDF solo se descarga si la descarga quedó auditada ([ADR-021](docs/decisions/ADR-021-descarga-pdf-auditada.md)).
- **Secretos:** solo en `.env.local` (fuera de git), en Vercel y en Supabase Vault. El historial del repositorio se revisó el 05/10/2026: no contiene claves.

## Auditoría del 17/10/2026

Revisión completa contra la **base en línea** (consultas al catálogo de PostgreSQL, no solo a las migraciones), las rutas de la API, las dependencias y el código de sesión.

**Qué se comprobó y estaba bien:**

| Área | Resultado |
|---|---|
| RLS | Activa en todas las tablas de `public`; ninguna tabla expuesta sin políticas. Las de `private` no tienen ningún permiso para clientes |
| Permisos de tablas | `anon` y `authenticated` solo leen columnas concretas; nadie escribe en tablas directamente salvo sus preferencias, sus dispositivos de push y la marca de leído de sus notificaciones |
| Funciones | Las 32 `SECURITY DEFINER` que puede llamar un usuario tienen `search_path` fijo. `anon` solo ejecuta 4 funciones. Las 12 del worker solo las ejecuta `service_role` |
| Esquemas | Ningún cliente puede crear objetos en `public`, `private`, `extensions` ni `storage` (no se puede secuestrar el `search_path`) |
| API de datos | Solo `public` está expuesto; `pg_graphql` no está instalado; ninguna tabla en Realtime; máximo 1000 filas por respuesta |
| Storage | La evidencia es privada y solo se sube a la carpeta propia, con cupo por hora; el PDF solo se lee con descarga auditada |
| App | Rutas de la API con sesión verificada y validación zod; secretos internos comparados en tiempo constante; ningún `dangerouslySetInnerHTML`; ningún secreto en el repositorio |
| Rendimiento | `map_features` con toda la provincia: 2–3 ms con caché caliente |

**Qué se corrigió:**

| Hallazgo | Gravedad | Corrección |
|---|---|---|
| **Redirección abierta** al iniciar sesión: `/entrar?next=/..//sitio.com` acababa en `//sitio.com`, que el navegador trata como otro dominio | Alta (phishing con un enlace de apariencia legítima) | `safeNext` rechaza lo que, ya normalizado, empiece por `//` (`src/lib/safe-redirect.ts`, con pruebas) |
| **Next.js 16.3.6** con avisos publicados (envenenamiento de caché, SSRF en la optimización de imágenes, entre otros) | Alta | Actualizado a 16.3.8; `npm audit` sin vulnerabilidades |
| El bucket público se podía **listar** entero con la clave pública | Media | Se eliminó la política de lectura; las URL públicas siguen funcionando ([DATABASE.md §5.19](DATABASE.md#519-endurecimiento-tras-la-auditoría--20261017120000_security_hardeningsql)) |
| Las métricas anónimas se podían **inflar sin límite** | Baja | Techo de 2000 por ficha, métrica y día |

**Ajustes recomendados en el panel de Supabase** (no se guardan en el repositorio):

- *Authentication → Providers → Email*: dejar el código de acceso en **10 minutos** en vez de 1 hora.
- *Authentication → Rate Limits*: comprobar que los límites de envío de correos y de verificación de códigos están activos (valores por defecto).
- *Settings → API*: no añadir más esquemas expuestos que `public`.

## Pendientes conocidos

| Pendiente | Riesgo | Plan |
|---|---|---|
| **Sin captcha** en el inicio de sesión | Alguien podría pedir muchos correos de acceso. Hoy lo frenan los límites de Supabase Auth (correos por hora, intentos por IP) | Antes de abrir al público: Cloudflare Turnstile con la integración nativa de Supabase Auth (*Authentication → Attack Protection*) y el widget en `/entrar` (añadir `challenges.cloudflare.com` a la CSP) |
| **Cuentas a nombre de una persona** (Supabase, SMTP de Gmail, Vercel) | Si esa persona pierde el acceso, se pierde el control | Traspaso a cuentas de la organización: [DEPLOYMENT.md §9](DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización) |
| **Base de staging compartida** entre la demo y las pruebas | Datos de prueba mezclados con reales | Supabase de producción separado ([DEPLOYMENT.md §3](DEPLOYMENT.md#3-supabase-de-producción)) |
| **Copias de seguridad** dependen de activar el workflow | Sin copia no hay recuperación (el plan gratuito no tiene PITR) | Activar `backup.yml` ([DEPLOYMENT.md §8.1](DEPLOYMENT.md#81-copias-de-seguridad)) y `npm run backup` antes de cambios grandes |
