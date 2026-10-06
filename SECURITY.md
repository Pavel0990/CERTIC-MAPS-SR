# Seguridad

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa *Security → Report a vulnerability* en este repositorio (aviso privado de GitHub). Respondemos en un plazo de 7 días.

Incluye qué encontraste, cómo reproducirlo y qué datos podrían quedar expuestos. No pruebes contra datos reales de vecinos: usa las cuentas de prueba (README) o una copia local de la base.

## Modelo de seguridad, en breve

El detalle completo está en [ARCHITECTURE.md §10](ARCHITECTURE.md#10-seguridad-y-privacidad).

- **La base de datos es la barrera** ([ADR-018](docs/decisions/ADR-018-base-de-datos-barrera.md)). Cualquiera puede llamar directamente a la API de Supabase con la clave pública. Por eso cada tabla tiene RLS, cada columna personal está oculta por grants, y todo cambio de estado pasa por una función SQL que vuelve a validar rol, alcance territorial, transición y límite de uso. Lo comprueban las [pruebas de la base](supabase/tests/run.mjs) (`npm run test:db`), con ataques directos incluidos.
- **Sin `super_admin`** ([ADR-020](docs/decisions/ADR-020-sin-super-admin.md)). La administración provincial solo se crea con un script revisado.
- **`service_role` solo** en el worker de la cola y en el cron, protegidos por secreto y con comparación en tiempo constante. Nunca se usa en un request de usuario.
- **Navegador:**
  - CSP con nonce por request;
  - HSTS y `X-Frame-Options: DENY`;
  - redirecciones solo a rutas internas.
- **Fotos:** se re-codifican en el servidor. El EXIF (ubicación GPS) se elimina siempre, y la evidencia de reportes nunca es pública.
- **Auditoría** inmutable de las acciones del personal. El PDF solo se descarga si la descarga quedó auditada ([ADR-021](docs/decisions/ADR-021-descarga-pdf-auditada.md)).
- **Secretos:** solo en `.env.local` (fuera de git), en Vercel y en Supabase Vault. El historial del repositorio se revisó el 05/10/2026: no contiene claves.

## Pendientes conocidos

| Pendiente | Riesgo | Plan |
|---|---|---|
| **Sin captcha** en el inicio de sesión | Alguien podría pedir muchos correos de acceso. Hoy lo frenan los límites de Supabase Auth (correos por hora, intentos por IP) | Antes de abrir al público: Cloudflare Turnstile con la integración nativa de Supabase Auth (*Authentication → Attack Protection*) y el widget en `/entrar` (añadir `challenges.cloudflare.com` a la CSP) |
| **Cuentas a nombre de una persona** (Supabase, SMTP de Gmail, Vercel) | Si esa persona pierde el acceso, se pierde el control | Traspaso a cuentas de la organización: [DEPLOYMENT.md §9](DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización) |
| **Base de staging compartida** entre la demo y las pruebas | Datos de prueba mezclados con reales | Supabase de producción separado ([DEPLOYMENT.md §3](DEPLOYMENT.md#3-supabase-de-producción)) |
| **Copias de seguridad** dependen de activar el workflow | Sin copia no hay recuperación (el plan gratuito no tiene PITR) | Activar `backup.yml` ([DEPLOYMENT.md §8.1](DEPLOYMENT.md#81-copias-de-seguridad)) y `npm run backup` antes de cambios grandes |
