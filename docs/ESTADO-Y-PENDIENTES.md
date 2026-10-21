# Estado del proyecto y lo que falta

> **Al 21/10/2026.** Documento único de seguimiento: reemplaza al antiguo reparto de trabajo (que planeaba con fechas equivocadas, de octubre) y deja fuera todo lo ya resuelto. Lo resuelto se ve en el historial de git y en el [cambio de versiones de ARCHITECTURE.md](../ARCHITECTURE.md).

## 1. Fechas oficiales

Según las [bases del reto](https://conectasr.com/#bases):

| Hito | Fecha |
|---|---|
| Desarrollo | hasta el **27/11/2026** (código congelado ese día) |
| Demo en vivo (25 minutos) | **28 al 30/11/2026** |

Quedan unas **5 semanas**. Casi todo lo que falta ya no es código: contenido, pruebas con vecinos, cuentas y ensayo.

## 2. Estado de las funcionalidades

| # | Funcionalidad de las bases | Estado |
|---|---|---|
| F1 | Mapa interactivo de la provincia (capas, búsqueda, sin conexión) | ✅ En línea |
| F2 | Alertas de tránsito ciudadanas con confirmación y vencimiento | ✅ En línea |
| F3 | Reportes al municipio con foto, seguimiento y bandeja | ✅ En línea |
| F4 | Negocios locales con ficha, promociones y WhatsApp | ✅ En línea |
| F5 | Turismo: lugares con fotos, horario y accesibilidad | ✅ En línea · **falta contenido** (descripciones y fotos propias) |
| F6 | Rutas ecológicas con trazado, dificultad y servicios | ✅ En línea · **falta validar** las 3 rutas en el terreno |
| — | Panel de administración con indicadores explorables (7/30/90 días, comparación, gráfico, municipios, CSV) | ✅ En línea |
| — | Informe PDF semanal automático | ✅ En línea |
| — | PWA instalable, avisos push, modo oscuro | ✅ En línea |

**Entregables de las bases:** MVP funcional ✅ · mapa ✅ · panel ✅ · PDF semanal ✅ · repositorio público con manual de despliegue ✅ ([DEPLOYMENT.md](../DEPLOYMENT.md)) · demo de 25 minutos ⏳ ([guion](guion-demo.md), falta ensayarla).

## 3. Cobertura de la rúbrica

| Criterio (puntos) | Qué lo respalda | Qué falta para el máximo |
|---|---|---|
| **Funcionalidad (25)** | F1–F6, panel, PDF, PWA; 173 pruebas de base de datos, 102 unitarias, 14 recorridos E2E | Contenido real en turismo y rutas; base de producción separada |
| **UX/UI para baja alfabetización digital (20)** | Lenguaje sencillo, letra Lexend/Nunito, áreas táctiles de 44 px, contraste WCAG AA en claro y oscuro (axe en 16 pantallas), sin conexión | **Pruebas con vecinos** (dos rondas) y sus cifras en la presentación |
| **Innovación (20)** | Confirmación comunitaria de alertas, reputación, datos abiertos (OSM), costo casi cero | Ideas opcionales en §5.4 |
| **Impacto territorial (15)** | Los 3 municipios, límites oficiales de OSM, indicadores por municipio | Contenido de Monción y Villa Los Almácigos; testimonios de la prueba con vecinos |
| **Sostenibilidad (10)** | Planes gratuitos, copia diaria cifrada, manual administrativo, traspaso documentado | Cuentas a nombre de la organización (§5.2) |
| **Código y documentación (10)** | Monolito modular con fronteras verificadas, RLS en todo, auditoría de seguridad repetible, ADR, manuales | Mantenerlo al día hasta el cierre |

Las cifras de calidad (pruebas, migraciones, funciones) están en [DATABASE.md](../DATABASE.md) y [SECURITY.md](../SECURITY.md).

## 4. Seguridad: lo que se cerró

La revisión del 17/10 y la del 21/10 están detalladas en [SECURITY.md](../SECURITY.md). En resumen, ya está hecho: redirección abierta, Next.js parcheado, verificación de origen en la API de sesión, auditoría de la base repetible (`npm run db:audit`) en la CI, Dependabot, escaneo de secretos, evidencia privada visible solo para el personal de su municipio, límite de 20 subidas por hora con permiso de un solo uso, negocios que vuelven a revisión si cambian nombre o web, avisos push solo hacia servicios reales y foto de perfil sin imagen rota.

## 5. Lo que falta

### 5.1 Código (poco y acotado)

| Tarea | Por qué | Hecho cuando |
|---|---|---|
| **Captcha** en `/entrar` (Cloudflare Turnstile) | Frenar el envío masivo de correos de acceso | Requiere la cuenta de Cloudflare (§5.2). Widget en `/entrar`, `challenges.cloudflare.com` en la CSP de `src/proxy.ts` y activado en *Supabase → Authentication → Attack Protection* |
| **E2E sin limpieza manual** | Que las pruebas se puedan correr varias veces seguidas | `tests/e2e/helpers.ts` reinicia el límite de reportes por hora de las cuentas de prueba |
| **E2E en la CI** | Hoy Playwright y axe se corren a mano antes de subir | Un workflow que los corra contra la vista previa de Vercel |
| ✅ ~~**Simulacro de restauración**~~ | Hecho el 21/10/2026: la copia diaria cifrada del 20/10 y la última copia local se restauraron en PGlite con todas las migraciones, con los mismos conteos por tabla y sin claves foráneas huérfanas | Repetirlo con `npm run backup:check` antes de la demo; procedimiento en [DEPLOYMENT.md §8.1](../DEPLOYMENT.md#81-copias-de-seguridad) |
| **Correcciones de la prueba con vecinos** | Lo que salga de la ronda 1 | Un *issue* `ux` por problema, corregido antes de la ronda 2 |

### 5.2 Cuentas externas (las hace una persona del equipo)

| Tarea | Detalle |
|---|---|
| **Supabase de producción** | Hoy la app publicada usa la base de staging. Pasos: [DEPLOYMENT.md §3](../DEPLOYMENT.md#3-supabase-de-producción) |
| **Correo con Resend y dominio propio** | Hoy los correos de acceso salen por un Gmail personal |
| **Cloudflare** | Para el captcha (gratis) |
| **Traspaso de cuentas** | Al menos dos dueños en GitHub, Supabase y Vercel: [DEPLOYMENT.md §9](../DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización). El segundo administrador tiene que entrar una vez a la app antes de darle el rol |
| **Supabase despierto** | Dos veces por semana, abrir https://sr-conecta.vercel.app/api/v1/health (debe decir `"ok"`) y ver que *Actions → backup* esté en verde |

### 5.3 Contenido, vecinos y demo

| Tarea | Detalle | Para |
|---|---|---|
| **15 lugares principales** completos | Descripción de 2–4 frases, servicios, horario y al menos 1 foto propia ([manual §2.1](manual-administrativo.md#21-completar-las-fichas-de-lugares-rutas-y-negocios)) | 06/11 |
| **Revisar los 84 negocios** | Archivar los que no existen; teléfono y horario a los 20 más conocidos | 06/11 |
| **Validar las 3 rutas** | Con alguien que las conozca: corregir el trazado o archivarlas | 06/11 |
| **Catálogos** | Que los tipos de alerta y de negocio sean los que usa la gente de allí | 31/10 |
| **Teléfonos reales** | Un Android barato y un iPhone, con push y sin conexión ([guion](guion-demo.md)) | 31/10 |
| **Ronda 1 con 5 vecinos** | [Guía](prueba-con-vecinos.md): no ayudar, tomar tiempos, anotar palabras que no entienden | 08/11 |
| **Ronda 2 con 3 vecinos distintos** | Después de las correcciones; anotar la comparación (p. ej. "de 22/35 a 31/35 tareas sin ayuda") | 18/11 |
| **Contenido de la demo** | 2–3 negocios con promoción y fotos, un reporte real en la bandeja | 20/11 |
| **Diapositivas** (5–6) | Problema, solución, arquitectura, seguridad, costos, datos abiertos, resultados de los vecinos y captura del panel | 20/11 |
| **Ensayos** | Dos ensayos de 25 minutos con cronómetro | 21 y 24/11 |
| **Video de respaldo** | Unos 12 minutos con la versión final, no listado y copiado en una memoria USB | 26/11 |
| **Congelar** | `main` en verde, copia del día, salud "ok", sesiones abiertas en los teléfonos de la demo | 27/11 |

### 5.4 Ideas opcionales de innovación

Solo si sobra tiempo después de §5.1–§5.3:

- Avisar de un reporte parecido cercano antes de enviar uno nuevo (`ST_DWithin`), para evitar duplicados.
- Frases de "aspectos destacados" también en el PDF semanal.
- Capa de "puntos calientes" con los reportes más frecuentes.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Supabase gratuito se pausa tras 7 días sin uso | Revisión de salud dos veces por semana (§5.2) |
| Fallo de internet el día de la demo | Video de respaldo y sesiones abiertas de antemano |
| Datos de prueba mezclados con reales | Base de producción separada antes de la demo |
| Una sola persona con acceso a las cuentas | Traspaso (§5.2) |

## 7. Reglas para trabajar en equipo

- Un *issue* por problema en GitHub, con la etiqueta `contenido`, `ux` o `plataforma`.
- Antes de cada push: `npm run check`, `npm run test:db` y `npm run test:e2e`.
- Nadie toca la base a mano ni publica en Vercel desde su computadora: el contenido se edita en el panel y el código entra por `main`.
- Migraciones: `npm run backup` → `npx supabase db push --dry-run` → `db push` → y después el código a `main`.
- Secretos solo en `.env.local` y en los secretos de GitHub, Vercel y Supabase; nunca en el chat ni en los commits. Nunca `push --force` a `main`.

## 8. Fuera de alcance

Misiones y recompensas, pagos, chat entre vecinos y aplicaciones nativas de tienda. La PWA cubre la instalación en el teléfono.
