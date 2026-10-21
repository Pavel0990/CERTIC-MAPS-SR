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
  - aislamiento entre sitios (`Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy: same-origin`);
  - redirecciones solo a rutas internas;
  - la API que cambia datos solo acepta peticiones de la propia web (comprobación de `Origin`, además de las cookies `SameSite=Lax`).
- **Vigilancia automática:**
  - `npm audit` en cada PR y cada semana;
  - Dependabot con alertas y actualizaciones de seguridad;
  - escaneo de secretos y bloqueo de push con secretos en GitHub;
  - auditoría semanal de la base en línea (`.github/workflows/security.yml`).
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

### Endurecimiento del 20/10/2026

Para que la seguridad no dependa de volver a revisar a mano:

| Qué | Dónde | Cómo se comprueba |
|---|---|---|
| **Auditoría repetible de la base:** 11 comprobaciones, entre ellas tablas sin RLS, funciones `SECURITY DEFINER` sin `search_path`, funciones ejecutables por `anon` fuera de la lista permitida, funciones del worker abiertas a clientes, buckets privados marcados como públicos y listado de `public-media` | `supabase/ops/security_audit.sql` | `npm run db:audit` contra la base en línea; prueba U4–U5 en cada push (`npm run test:db`), que además detecta una tabla nueva sin RLS; y cada lunes en `security.yml` |
| **Protección CSRF** de la API con sesión (`/api/v1/reports`, `requests`, `requests/:id/vote`, `uploads/sign`, `attachments`): una petición desde otro sitio recibe 403 | `src/lib/same-origin.ts`, usada por `requireApiUser` | `src/lib/same-origin.test.ts` |
| **Cabeceras** `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` y `X-Permitted-Cross-Domain-Policies` | `next.config.ts` | `curl -I https://sr-conecta.vercel.app` |
| **Dependencias:** `npm audit --omit=dev --audit-level=high` en cada PR, push a `main` y cada lunes; Dependabot (npm y GitHub Actions) con alertas y actualizaciones de seguridad activadas | `security.yml`, `.github/dependabot.yml` | *Security → Dependabot* en GitHub |

Al activar Dependabot aparecieron 6 avisos, todos en herramientas de desarrollo que no llegan a producción. Se corrigieron con `vite` 8.3.4 y `handlebars` 4.7.10 (forzado con `overrides` en `package.json`, porque `eslint-plugin-boundaries` lo fija). Queda un aviso de `braces` (lo usan las herramientas de lint) sin versión corregida publicada: solo puede colgar el lint con patrones escritos por nosotros, así que no hay riesgo y se actualizará cuando salga la corrección.

La auditoría semanal de la base usa el mismo secreto que la copia de seguridad (`SUPABASE_DB_URL`) y solo lee el catálogo. Si algún día se agrega a propósito algo que marca (por ejemplo, una función pública nueva para visitantes), se actualiza la lista permitida en `security_audit.sql` con su justificación.

## Revisión del 21/10/2026

Revisión línea por línea de todas las rutas de la API, las Server Actions, `src/proxy.ts`, las 27 migraciones (cada función `SECURITY DEFINER`, cada política RLS y de Storage), el service worker y las dependencias. **Ningún hallazgo crítico ni alto.** El modelo de "la base es la barrera" se sostiene.

| Hallazgo | Nivel | Estado |
|---|---|---|
| El tope de 20 subidas de evidencia por hora se podía saltar pidiendo muchas URLs firmadas (firmar no crea ningún objeto) | Medio | **Corregido**: cada ruta es un permiso de un solo uso de `request_upload` (20 por hora) que la política de Storage exige. Pruebas K1–K1d y SR2 |
| El dueño de un negocio aprobado podía cambiar el nombre o la web sin nueva revisión (suplantación, enlaces de estafa) | Medio | **Corregido**: nombre o web → vuelve a revisión; toda edición del dueño avisa al personal. Prueba SR3 |
| Sin captcha, se pueden agotar los correos de acceso del proyecto (30 por hora) y los límites por IP de Supabase, que ven la IP de Vercel | Medio | **Listo en el código, falta activarlo**: Cloudflare Turnstile en `/entrar` (ver *Pendientes conocidos*). Mientras tanto: límites de Supabase Auth y SMTP propio |
| Un moderador de un municipio veía la evidencia privada de toda la provincia | Bajo-medio | **Corregido**: solo la del municipio del reporte (y la provincia). Prueba SR1 |
| Las suscripciones push aceptaban cualquier `https://` (el worker les enviaba un POST) y se podían insertar sin límite | Bajo | **Corregido**: solo servicios de push reales y alta solo por la RPC. Pruebas SR4–SR5 |
| El service worker guardaba páginas privadas de consultas en el teléfono | Bajo | **Corregido**: `/consultas/` ya no se guarda. `/reportar` sí (es el formulario para reportar sin conexión y no lleva datos personales) |
| La foto de perfil no se vuelve a codificar en el servidor | Bajo | **Riesgo aceptado**: máximo 64 KB, solo WebP/JPEG, servida como imagen (nunca se ejecuta), solo la ven la persona y el personal. El teléfono ya la vuelve a codificar sin metadatos |
| Las RPC devolvían el texto de la restricción violada a quien llama la API directamente | Info | **Corregido** en `update_business`; las demás se revisarán en la próxima pasada |
| `/api/v1/health` es público (solo cifras agregadas de la cola) | Info | Aceptado: lo usa el monitor de disponibilidad |

Verificado como correcto: CSRF por origen en toda escritura, `getClaims()` (firma del JWT), validación zod en cada entrada, secretos de máquina comparados en tiempo constante, redirecciones solo internas, las 59 funciones `SECURITY DEFINER` con `search_path` fijo, RLS en todas las tablas, columnas personales ocultas por grants, roles sin escalada posible, sin `dangerouslySetInnerHTML`, fotos re-codificadas sin metadatos, PDF con descarga auditada y 0 vulnerabilidades en las dependencias de producción.

### Funciones agregadas después de la revisión

Las tres migraciones posteriores (aplicadas en staging el 21/10, [DATABASE.md](DATABASE.md#estado-verificado)) siguen las mismas reglas y tienen sus pruebas de ataque en `npm run test:db`:

| Pieza | Quién la ejecuta | Protección |
|---|---|---|
| `find_similar_reports` (aviso de reporte parecido) | Solo `authenticated` | 60 consultas por hora; solo devuelve lo que la persona ya ve por RLS y nunca autor, texto, fotos ni coordenadas (pruebas W5, W9, W12–W14) |
| `e2e_reset_rate_limits` (E2E repetibles) | Solo `service_role` | Solo toca cuentas `@example.com`; `security_audit.sql` marca cualquier `e2e_*` ejecutable por clientes (V1–V3) |
| `attachments.credit` (crédito de fotos, propuesta) | Lectura pública, como el resto del adjunto | Nadie la escribe desde la API, ni el personal (AC4) |

## Pendientes conocidos

| Pendiente | Riesgo | Plan |
|---|---|---|
| **Captcha listo, falta activarlo** en el inicio de sesión | Mientras no se active, alguien podría pedir muchos correos de acceso. Hoy lo frenan los límites de Supabase Auth (correos por hora, intentos por IP) | El código ya está: con `NEXT_PUBLIC_TURNSTILE_SITE_KEY` aparece el recuadro de Cloudflare Turnstile en `/entrar` (y solo ahí), su token va como `captchaToken` en `signInWithOtp` y la CSP permite `challenges.cloudflare.com` solo en `script-src` y `frame-src`. Sin la variable, todo queda como antes. Falta: crear el widget en Cloudflare, poner la clave pública en Vercel y la secreta en Supabase → *Authentication → Attack Protection*, en ese orden ([DEPLOYMENT.md §4](DEPLOYMENT.md#4-vercel)). «Ya tengo un código» (`verifyOtp`) no lleva captcha: Supabase no lo exige en `/verify` |
| **Cuentas a nombre de una persona** (Supabase, SMTP de Gmail, Vercel) | Si esa persona pierde el acceso, se pierde el control | Traspaso a cuentas de la organización: [DEPLOYMENT.md §9](DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización) |
| **Base de staging compartida** entre la demo y las pruebas | Datos de prueba mezclados con reales | Supabase de producción separado ([DEPLOYMENT.md §3](DEPLOYMENT.md#3-supabase-de-producción)) |
| ✅ ~~**Restauración de la copia sin ensayar**~~ | **Hecho (21/10/2026):** simulacro de restauración de la copia diaria cifrada y de la copia local, con conteos por tabla idénticos y sin claves foráneas huérfanas | Repetirlo con `npm run backup:check` antes de la demo, y `npm run backup` antes de cambios grandes ([DEPLOYMENT.md §8.1](DEPLOYMENT.md#81-copias-de-seguridad)) |
