# Estado del proyecto y lo que falta

> **Al 21/10/2026, con los PR #7 a #14 integrados** (diapositivas, simulacro de restauración, navegación rápida, contenido de lugares, E2E repetibles, captcha, revisión de UX y aviso de reporte parecido) y la limpieza de código. Documento único de seguimiento: reemplaza al antiguo reparto de trabajo (que planeaba con fechas equivocadas, de octubre) y deja fuera todo lo ya resuelto. Lo resuelto se ve en el historial de git y en el [cambio de versiones de ARCHITECTURE.md](../ARCHITECTURE.md).

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
| **Funcionalidad (25)** | F1–F6, panel, PDF, PWA; 195 pruebas de base de datos, 127 unitarias, 25 pruebas E2E en 9 archivos (19 sin la clave de prueba del captcha) y 3 pendientes de las cuentas externas (`plan-produccion.spec.ts`) | Contenido real en turismo y rutas; base de producción separada |
| **UX/UI para baja alfabetización digital (20)** | Lenguaje sencillo, letra Lexend/Nunito, áreas táctiles de 44 px, contraste WCAG AA en claro y oscuro (axe en 16 pantallas), sin conexión | **Pruebas con vecinos** (dos rondas) y sus cifras en la presentación |
| **Innovación (20)** | Confirmación comunitaria de alertas, reputación, aviso de reporte parecido cercano antes de enviar (`ST_DWithin`, 150 m), datos abiertos (OSM), costo casi cero | Ideas opcionales que quedan en §5.4 |
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
| **Captcha** en `/entrar` (Cloudflare Turnstile) | Frenar el envío masivo de correos de acceso | ⏳ Código listo: recuadro en `/entrar`, token a Supabase y CSP abierta a `challenges.cloudflare.com` solo si existe `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. **Falta** la cuenta de Cloudflare (§5.2): crear el widget, la clave pública en Vercel y luego la secreta en *Supabase → Authentication → Attack Protection*, en ese orden ([DEPLOYMENT.md §4](../DEPLOYMENT.md#4-vercel)) |
| **E2E sin limpieza manual** | Que las pruebas se puedan correr varias veces seguidas | ✅ Hecho el 21/10: `tests/e2e/global-setup.ts` reinicia los límites por hora y la reputación de las cuentas de prueba con `e2e_reset_rate_limits`. Tres corridas seguidas pasaron, 17/17 cada una |
| **E2E en la CI** | Hoy Playwright y axe se corren a mano antes de subir | ⏳ `.github/workflows/e2e.yml` listo (construye la app en el runner y prueba con Chromium contra staging). **Falta** crear el entorno `e2e-staging` con sus 3 secretos y la variable `E2E_ENABLED=true` ([ADR-025](decisions/ADR-025-e2e-contra-staging.md)) |
| ✅ ~~**Simulacro de restauración**~~ | Hecho el 21/10/2026: la copia diaria cifrada del 20/10 y la última copia local se restauraron en PGlite con todas las migraciones, con los mismos conteos por tabla y sin claves foráneas huérfanas | Repetirlo con `npm run backup:check` antes de la demo; procedimiento en [DEPLOYMENT.md §8.1](../DEPLOYMENT.md#81-copias-de-seguridad) |
| **Correcciones de la prueba con vecinos** | Lo que salga de la ronda 1 | Un *issue* `ux` por problema, corregido antes de la ronda 2 |
| **Propuestas de la revisión de UX del 21/10** | Lo que cambia un flujo o la estructura de una pantalla y no se tocó en esa revisión (§5.1.1) | ⏳ 4 de 8 hechas el 22/10 (1, 2, 6 y 7, solo interfaz). Quedan la 3 y la 5 (necesitan una migración), la 4 (probarla con vecinos) y la 8 (va con la validación de rutas) |
| **Propuestas de la limpieza de código** | Cambios de organización que mueven muchos archivos y no se hicieron para no arriesgar (§5.1.3) | Decidir después de la demo |

### 5.1.1 Revisión de UX del 21/10

Recorrido de todas las pantallas a 360 y 1280 px, en claro y oscuro (público, vecino, negocio, moderación y administración). **Ya corregido:** el panel del teléfono se deslizaba casi un segundo después de cada cambio de pantalla y quedaba 84 px abajo, con el menú "Panel municipal" fuera de la vista (`data-scroll-behavior="smooth"` en `<html>`, requisito de Next 16); todos los botones y enlaces quedan en 44 px también en tableta y computadora (antes bajaban a 32–40 px); el gráfico del panel se lee en palabras y sus fechas ya no miden 6 px en el teléfono; los botones del panel llevan ícono y texto; "Prioridades" pasa a "Apoyar reportes"; la auditoría muestra el rol en español y "Qué hizo" sin deslizar; los asistentes dicen qué falta cuando "Seguir" está desactivado; arreglos de diseño en el aviso de registrar negocio, el equipo y los datos de una ruta.

**Propuestas (cambian un flujo o una pantalla):**

1. ✅ ~~**Quitar un rol pide confirmación.**~~ Hecho el 22/10: *Equipo → Quitar* abre un diálogo que nombra a la persona y explica qué pasa, con **Cancelar** y **Quitar** (`ActionButton` acepta `confirm`).
2. ✅ ~~**Informes en tarjetas en el teléfono.**~~ Hecho el 22/10: por debajo de 768 px cada informe es una tarjeta con *Descargar PDF* a la vista; la tabla queda para tableta y computadora.
3. **Reporte al municipio sin texto obligatorio.** §6.2 dice que basta tipo, ubicación y foto; hoy el reporte al municipio exige título y 10 letras de descripción. Necesita una migración (la RPC también lo exige).
4. **Primer paso de Reportar más corto.** Muestra 14 opciones en tres grupos; probar con vecinos si conviene elegir primero el grupo.
5. **Avisos con el tipo de reporte.** "Tu reporte de tránsito cambió de estado" se repite igual en todos; mejor "Tu alerta de *Bache* ya está en el mapa". El texto lo escribe la base (`private.notify`): necesita una migración.
6. ✅ ~~**Tarjetas del panel en dos columnas en el teléfono.**~~ Hecho el 22/10: las 12 tarjetas van de dos en dos (en las filas de tres, la última ocupa el ancho), con icono, cifra y relleno más compactos por debajo de 640 px. El resumen pasa de unas 9 pantallas a unas 5 a 360 px.
7. ✅ ~~**"Lo más visto" sin tabla en el teléfono.**~~ Hecho el 22/10: por debajo de 768 px es una lista con las visitas, "cómo llegar" y WhatsApp escritos debajo de cada ficha.
8. **Contenido:** la ruta "De Monción a la Presa" dice en público "conviene validarlo con el municipio antes de recomendarlo" (es una nota interna; va con la validación de rutas de §5.3).

### 5.1.2 Migraciones aplicadas el 21/10

Las 30 migraciones están aplicadas en staging (`npx supabase migration list` las muestra alineadas) y `npm run db:audit` no encuentra problemas. Las tres últimas se aplicaron en orden, después de `npm run backup` y de `db push --dry-run`:

| # | Migración | Qué trae |
|---|---|---|
| 1 | `20261021130000_e2e_rate_limit_reset` | `e2e_reset_rate_limits`, para que las E2E se puedan repetir ([DATABASE.md §5.22](../DATABASE.md#522-e2e-repetibles--20261021130000_e2e_rate_limit_resetsql)). Comprobado: 3 corridas seguidas, 17/17 cada una |
| 2 | `20261022120000_attachment_credit` | Columna `attachments.credit` para el crédito de las fotos libres ([DATABASE.md §5.24](../DATABASE.md#524-crédito-de-las-fotos-con-licencia-libre--20261022120000_attachment_creditsql)) |
| 3 | `20261022130000_similar_reports` | `find_similar_reports`, el aviso de reporte parecido ([DATABASE.md §5.23](../DATABASE.md#523-aviso-de-reporte-parecido-cercano--20261022130000_similar_reportssql)) |

### 5.1.3 Propuestas de la limpieza de código

La limpieza del 21/10 quitó código muerto, unificó ayudas repetidas y puso al día comentarios y cifras sin cambiar el comportamiento. Esto quedó como propuesta porque mueve muchos archivos o toca el diseño:

1. ✅ ~~**Pasar `src/app/(app)/_contenido/` a inglés (`_content/`)**~~ Hecho el 28/10: las carpetas privadas quedan todas en inglés (`_components`, `_content`, `_dashboard`). En la misma pasada: un solo tipo de rol del personal (`StaffRole`), una sola comprobación `isStaffOf` en `lib/auth.ts` y un solo `StatusResult` para las acciones del panel y del perfil.
2. **Colores fijos que quedan fuera de los tokens:** el degradado de "Descubre" (`#0f172a`), el punto apagado de las capas (`#c9cdd3`), la sombra del botón Reportar y el texto blanco sobre `bg-danger`. En modo oscuro se ven igual a propósito; pasarlos a tokens (`--color-on-danger`, por ejemplo) es un cambio de diseño, no de limpieza.
3. **Hora de "Se actualiza sola"** del panel: usa la hora del dispositivo y la barra del panel la de la provincia; unificarlas en `utils/format` cambia lo que ve alguien con el teléfono en otra zona horaria.
4. **Mapeo de las RPC de lectura:** las consultas de `server/queries.ts` repiten `if (error) throw …; return data ?? []`. Una ayuda como `asRpcResult` para lecturas lo acortaría, pero cambia 22 lecturas en 9 archivos de 7 módulos.

### 5.2 Cuentas externas (las hace una persona del equipo)

| Tarea | Detalle |
|---|---|
| **Rama de producción en Vercel** | Hoy Vercel publica desde `feat/app-mvp`, no desde `main` (comprobado el 26/10). Cambiarlo en *Settings → Git → Production Branch* → `main`, con una cuenta dueña del equipo `certic-sr-maps`. Mientras tanto, cada cambio de `main` se lleva también a `feat/app-mvp` ([DEPLOYMENT.md §4.1](../DEPLOYMENT.md#41-estado-actual-05102026)) |
| **Supabase de producción** | Hoy la app publicada usa la base de staging. Pasos: [DEPLOYMENT.md §3](../DEPLOYMENT.md#3-supabase-de-producción) |
| **Correo con Resend y dominio propio** | Hoy los correos de acceso salen por un Gmail personal |
| **Cloudflare** | Para el captcha (gratis). El código ya está; pasos en [DEPLOYMENT.md §4](../DEPLOYMENT.md#4-vercel) |
| **Traspaso de cuentas** | Al menos dos dueños en GitHub, Supabase y Vercel: [DEPLOYMENT.md §9](../DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización). El segundo administrador tiene que entrar una vez a la app antes de darle el rol |
| **Supabase despierto** | Dos veces por semana, abrir https://sr-conecta.vercel.app/api/v1/health (debe decir `"ok"`) y ver que *Actions → backup* esté en verde |

### 5.3 Contenido, vecinos y demo

**Hecho el 21/10 (lugares y rutas):** con fuentes públicas y fotos libres de Wikimedia Commons ([`data/lugares-contenido.json`](../data/lugares-contenido.json), carga repetible con `npm run data:lugares`, ver [data/README.md](../data/README.md#lugares-turísticos-descripciones-y-fotos-libres)):

- **21 lugares** publicados en staging (eran 16): 5 nuevos (Parque Nacional José Armando Bermúdez y Reserva Forestal Río Cana en Sabaneta; Parque Nacional Piky Lora y Monasterio Carmelita en Monción; La Peonía en Villa Los Almácigos).
- **13 con descripción** con fuente (8 completados y 5 nuevos) y **5 con foto libre** (Presa de Monción, Iglesia y Parque Central de Monción, Armando Bermúdez y La Peonía), con el crédito al final de la descripción.
- Ruta **De Monción a la Presa**: puntos de referencia y foto.
- Aplicada el 21/10: columna `attachments.credit` para el crédito de las fotos ([DATABASE.md §5.24](../DATABASE.md#524-crédito-de-las-fotos-con-licencia-libre--20261022120000_attachment_creditsql)).

**Lo que falta** (la lista completa está en `por_confirmar` y `sin_fuente` del JSON):

- **Fotos propias:** todo San Ignacio de Sabaneta (no hay ninguna foto libre del municipio), Nalga de Maco, Piky Lora, Alto Mao, Río Cana, Contraembalse, Monasterio, monumentos, parques pequeños y las 2 rutas de Sabaneta.
- **Ubicar en el mapa** (sin coordenadas en OSM ni Wikidata): Charcos de los Indios, Salto de Jicomé, Cueva de Clavijo, Ruta del Casabe, mirador de la presa, balnearios (Charco de los Chivos, Las Masetas, El Aposento) y los saltos y pozas de La Peonía. Con alguien de la zona y el GPS del teléfono, se agregan al JSON y se vuelve a correr la carga.
- **Descripción** de 8 lugares sin fuente pública (monumentos y parques de Monción, Capilla San Pedro, paradores fotográficos).

| Tarea | Detalle | Para |
|---|---|---|
| **15 lugares principales** completos | Descripción de 2–4 frases, servicios, horario y al menos 1 foto propia ([manual §2.1](manual-administrativo.md#21-completar-las-fichas-de-lugares-rutas-y-negocios)). Ya hay 13 con descripción y 5 con foto libre; faltan horarios, servicios y fotos propias | 06/11 |
| **Revisar los 84 negocios** | Archivar los que no existen; teléfono y horario a los 20 más conocidos | 06/11 |
| **Validar las 3 rutas** | Con alguien que las conozca: corregir el trazado o archivarlas | 06/11 |
| **Catálogos** | Que los tipos de alerta y de negocio sean los que usa la gente de allí | 31/10 |
| **Teléfonos reales** | Un Android barato y un iPhone, con push y sin conexión ([guion](guion-demo.md)) | 31/10 |
| **Ronda 1 con 5 vecinos** | [Guía](prueba-con-vecinos.md): no ayudar, tomar tiempos, anotar palabras que no entienden | 08/11 |
| **Ronda 2 con 3 vecinos distintos** | Después de las correcciones; anotar la comparación (p. ej. "de 22/35 a 31/35 tareas sin ayuda") | 18/11 |
| **Contenido de la demo** | 2–3 negocios con promoción y fotos, un reporte real en la bandeja | 20/11 |
| **Diapositivas** (6) | ✅ Borrador hecho (presentación de claude.ai) y ubicado en el [guion](guion-demo.md), con el tiempo repartido según la rúbrica. Falta la diapositiva 6 con los resultados de los vecinos | 20/11 |
| **Ensayos** | Dos ensayos de 25 minutos con cronómetro | 21 y 24/11 |
| **Video de respaldo** | Unos 12 minutos con la versión final, no listado y copiado en una memoria USB | 26/11 |
| **Congelar** | `main` en verde, copia del día, salud "ok", sesiones abiertas en los teléfonos de la demo | 27/11 |

### 5.4 Ideas opcionales de innovación

Solo si sobra tiempo después de §5.1–§5.3:

- ✅ **Hecho:** avisar de un reporte parecido cercano antes de enviar uno nuevo (`ST_DWithin`), para evitar duplicados. Después de elegir tipo y lugar, si hay una alerta o un reporte al municipio abierto del mismo tipo a menos de 150 m, el asistente pregunta "Ya hay un reporte parecido aquí. ¿Quieres apoyarlo en lugar de crear otro?" con **Apoyarlo**, **Ver el reporte** y **Crear el mío igual**; nunca bloquea el envío ([DATABASE.md §5.23](../DATABASE.md#523-aviso-de-reporte-parecido-cercano--20261022130000_similar_reportssql)).
- ✅ **Hecho (28/10):** frases de "aspectos destacados" también en el PDF semanal, con las mismas reglas que el panel (`weeklyHighlights`, con pruebas).
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
