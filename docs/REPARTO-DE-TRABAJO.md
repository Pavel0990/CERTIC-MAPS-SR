# Reparto del trabajo: lo que falta

Equipo de dos personas, del **17 al 27 de octubre de 2026**. Cada una trabaja su parte en paralelo; marquen `[x]` al terminar cada tarea.

| Parte | Persona | Se encarga de | Horas |
|---|---|---|---|
| **A** | ________ | Contenido, presentación, cuentas y ronda 2 con vecinos (sin programar) | ~27 h |
| **B** | ________ | Toda la implementación: panel de indicadores, base de datos, seguridad y correcciones, más la ronda 1 con vecinos | ~30 h |

---

## Parte A · Contenido, presentación y cuentas

Todo se hace desde el panel de administración de la app y desde la web de cada servicio. Guía: [manual administrativo](manual-administrativo.md).

- [ ] **A1 · Elegir los 15 lugares más importantes** (Presa de Monción, parques, reservas, miradores, balnearios…). Los que falten se agregan con *Proponer un lugar* y se aprueban en el panel. — **18/10** · 1 h
- [ ] **A2 · Completar 10 lugares:** descripción de 2–4 frases sencillas, qué hay (servicios, accesibilidad), horario y al menos 1 foto propia. — **20/10** · 4 h
- [ ] **A3 · Completar los 5 lugares restantes** igual que en A2. — **22/10** · 2 h
- [ ] **A4 · Revisar los 84 negocios:** archivar los que no existen y poner teléfono y horario a los 20 más conocidos. — **22/10** · 3 h
- [ ] **A5 · Validar las 3 rutas** con alguien que las conozca: corregir el trazado o archivarlas. — **22/10** · 2 h
- [ ] **A6 · Revisar los catálogos** (*Panel → Catálogos*): que los tipos de alerta y de negocio sean los que usa la gente de allí. — **20/10** · 0,5 h
- [ ] **A7 · Probar en teléfonos reales** (un Android barato y un iPhone, con push y sin conexión) con la tabla del [guion](guion-demo.md#prueba-completa-a-mano-teléfono-real). Cada fallo, un *issue* para B. — **21/10** · 2,5 h
- [ ] **A8 · Contenido de la demo:** 2–3 negocios con promoción activa y fotos, y un reporte real en la bandeja. — **23/10** · 1,5 h
- [ ] **A9 · Diapositivas** (5–6): problema, solución, arquitectura, seguridad, costos y datos abiertos. El 24/10 se suman los resultados de los vecinos y una captura del panel. — **23 y 24/10** · 3,5 h
- [ ] **A10 · Cuentas:** al menos dos dueños en GitHub, Supabase y Vercel ([DEPLOYMENT.md §9](../DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización)). — **23/10** · 1,5 h
- [ ] **A11 · Supabase despierto:** dos veces por semana, abrir https://sr-conecta.vercel.app/api/v1/health (debe decir `"ok"`) y ver que *Actions → backup* esté en verde. Si algo falla, avisar a B. — **continuo** · 0,5 h
- [ ] **A12 · Video de respaldo** (unos 12 minutos) con la versión final, incluido el panel. Subirlo como no listado y copiarlo a una memoria USB. — **26/10** · 2 h
- [ ] **A13 · Ronda 2 con 3 vecinos distintos** a los de la ronda 1, con la [guía](prueba-con-vecinos.md) y después de las correcciones de B. Anotar la comparación (p. ej. "de 22/35 a 31/35 tareas sin ayuda") para las diapositivas. — **24/10** · 2,5 h

---

## Parte B · Implementación y ronda 1

Guías: [prueba con vecinos](prueba-con-vecinos.md), [SECURITY.md](../SECURITY.md), [DATABASE.md](../DATABASE.md) y [guion de la demo](guion-demo.md). El detalle de cada bloque está más abajo.

**Vecinos y correcciones**
- [ ] **B1 · Publicar la auditoría de seguridad** ya hecha (redirección abierta, Next 16.3.8, migración aplicada) y ajustar el panel de Supabase: código de acceso de 10 minutos y límites de envío activos. — **18/10** · 1 h
- [ ] **B2 · Ronda 1 con 5 vecinos variados** (persona mayor, alguien que casi solo usa WhatsApp, comerciante, joven, alguien de Monción o Los Almácigos). No ayudar; tomar tiempos y anotar las palabras que no entienden. — **20/10** · 5 h
- [ ] **B3 · Pasar los resultados** a la guía y abrir un *issue* `ux` por problema, ordenados por cuántas personas lo tuvieron. Pasarle la ronda 1 a A. — **21/10** · 1,5 h
- [ ] **B4 · Corregir los *issues*** de B3 y los que abra A en A7. — **22/10** · 4 h

**Panel de indicadores (KPI)**
- [ ] **B5 · Fase 1:** periodo, comparación y navegación. — **21/10** · 4 h
- [ ] **B6 · Fase 2:** gráficos, municipios, lo más visto y CSV. — **23/10** · 4 h
- [ ] **B7 · Fase 3:** pulido de UX/UI de los indicadores. — **24/10** · 2 h

**Seguridad**
- [ ] **B8 · Captcha en el inicio de sesión** (Cloudflare Turnstile). — **22/10** · 2 h
- [x] **B9 · Seguridad automática en GitHub:** auditoría de dependencias en la CI, Dependabot y escaneo de secretos. — **hecho el 20/10** (`security.yml`, `dependabot.yml`)

**Base de datos**
- [x] **B10 · Auditoría de la base repetible** (`npm run db:audit`), también en GitHub Actions. — **hecho el 20/10** (`supabase/ops/security_audit.sql`, pruebas U4–U5)
- [ ] **B11 · Simulacro de restauración** de la copia de seguridad. — **25/10** · 1 h
- [ ] **B12 · Pulido final:** tipos al día y las pruebas E2E sin limpieza manual. — **26/10** · 1 h

**Cierre**
- [ ] **B13 · Congelar y revisar:** `main` en verde, copia del día, salud "ok" y sesiones abiertas en los teléfonos de la demo. — **27/10** · 1 h

---

## Detalle de implementación

### Panel de indicadores (B5–B7)

Convertir `/admin` en un dashboard que se explora, **con el mismo diseño** (tarjetas, colores y tipografía). No necesita librerías nuevas ni cambios en la base: `kpi_summary`, `weekly_kpi_snapshots` y `engagement_daily` ya existen y la administración ya puede leerlas.

| Fase | Qué se agrega |
|---|---|
| **1 · Interacción** | Selector de periodo: 7, 30 y 90 días, en la URL (`?periodo=30`) para que el enlace se pueda compartir |
| | Comparación con el periodo anterior en cada indicador (▲ / ▼ %), en verde si mejora y en rojo si empeora: más resueltos es bueno, más abiertos es malo |
| | Cada indicador abre su lista: "Abiertos ahora" → bandeja filtrada, "Negocios pendientes" → Validaciones… |
| | Para moderación: cuánto lleva esperando lo más antiguo |
| **2 · Gráficos** | Tendencia de 8 semanas (recibidos frente a resueltos) con `weekly_kpi_snapshots`, en SVG propio, con el valor al tocar cada punto |
| | Comparación entre municipios (barras) al ver toda la provincia |
| | Las 5 fichas más vistas del periodo, con visitas, "Cómo llegar" y WhatsApp (`engagement_daily`) |
| | Botón **Descargar CSV** con los indicadores del periodo |
| **3 · UX/UI** | Un **"?"** junto a cada indicador que explica en lenguaje sencillo qué mide |
| | Tiempos legibles ("3 h 20 min", no "3,33 horas") y números con el formato de RD |
| | Estados completos: cargando (esqueleto con la forma de la tarjeta), sin datos ("Todavía no hay reportes en este periodo") y error con **Reintentar** |
| | Orden por importancia: lo que hay que atender (abiertos, pendientes) arriba; las cifras de contexto, abajo |
| | 1 columna en teléfono, 2 en tableta y 4 en computadora; los gráficos se adaptan al ancho sin scroll horizontal |
| | "Actualizado a las 5:47 p. m." y un botón para actualizar |
| | Accesible: el ▲ / ▼ siempre lleva texto (no depende solo del color), el gráfico tiene una tabla equivalente y el valor de cada punto también se ve con el teclado |
| | Vista para imprimir del resumen |

**Hecho cuando:** los números coinciden con los del PDF semanal; se ve bien a 320 px con áreas táctiles de 44 px; pasa `tests/e2e/accesibilidad.spec.ts`; tiene una prueba E2E que cambia el periodo y abre una lista; y el [manual administrativo](manual-administrativo.md) lo explica.

### Seguridad (B1, B8, B9)

Parte de la [auditoría del 17/10](../SECURITY.md#auditoría-del-17102026): lo crítico ya está corregido y aplicado en la base; queda publicarlo y cerrar los pendientes.

| Tarea | Cómo | Hecho cuando |
|---|---|---|
| **B1 · Publicar** | Subir a `main` (la migración ya está en la base). En Supabase: *Authentication → Providers → Email*, código de 10 minutos; *Rate Limits* con los valores por defecto | En Vercel, y `/entrar?next=/..//ejemplo.com` termina en la app |
| **B8 · Captcha** | Crear el widget de Turnstile en Cloudflare (gratis), activarlo en *Supabase → Authentication → Attack Protection*, poner el widget en `/entrar` y añadir `challenges.cloudflare.com` a la CSP de `src/proxy.ts`. Las pruebas E2E entran con un código generado por el servidor, así que no se rompen | Pedir un código exige el captcha; el inicio de sesión funciona en Android e iPhone; SECURITY.md lo pasa de "pendiente" a "hecho" |
| **B9 · GitHub** | Añadir `npm audit --omit=dev --audit-level=high` a `ci.yml`, crear `.github/dependabot.yml` (npm y GitHub Actions, semanal) y activar *Secret scanning* y *Push protection* en *Settings → Code security* | La CI falla si aparece una vulnerabilidad alta; Dependabot abre su primer PR |

Se hace temprano (19 y 22/10) para que los dos ensayos ya usen el inicio de sesión con captcha.

### Base de datos (B10–B12)

La base está sana: RLS en todo, permisos mínimos y 2–3 ms por consulta del mapa. Lo que falta es que **siga así sin depender de una revisión a mano**.

| Tarea | Cómo | Hecho cuando |
|---|---|---|
| **B10 · Auditoría repetible** | Convertir las consultas de la auditoría del 17/10 en `scripts/db-audit.mjs` (`npm run db:audit`). Debe fallar si aparece una tabla sin RLS, una función `SECURITY DEFINER` sin `search_path`, una función nueva que pueda ejecutar `anon`, o una política de lectura en `public-media`. Correrlo cada semana en GitHub Actions con el mismo secreto que usa `backup.yml` | Pasa contra staging, y falla si se crea a propósito una tabla sin RLS en una base local |
| **B11 · Simulacro de restauración** | Cargar la última copia (`backups/*.json` o el artefacto de `backup.yml`) en una base PGlite con todas las migraciones y comparar los conteos por tabla | Conteos iguales; el procedimiento queda en [DEPLOYMENT.md §8.1](../DEPLOYMENT.md#81-copias-de-seguridad) |
| **B12 · Pulido final** | `npm run db:types` sin diferencias con `src/types/database.ts`. En `tests/e2e/helpers.ts`, limpiar el límite de reportes por hora de las cuentas de prueba antes de cada ejecución, igual que ya se hace con la reputación | `git diff` vacío tras regenerar los tipos; las E2E pasan varias veces seguidas sin tocar la base |

Cada cambio de la base va en una migración nueva con su prueba en `supabase/tests/run.mjs`, siguiendo el orden de las reglas de abajo.

---

## Juntos

- [ ] **Ensayo 1** de la demo: 25 minutos con cronómetro, siguiendo el [guion](guion-demo.md). — **viernes 23/10**
- [ ] **Ensayo 2.** — **domingo 25/10**
- [ ] Reunión de 15 minutos: qué terminé, qué sigue, qué me bloquea. — **19, 21, 23 y 25/10**

## Calendario

| Fecha | Parte A | Parte B |
|---|---|---|
| Dom 18/10 | A1 | B1 |
| Lun 19/10 | A2 (empieza) | B9 · B2 (empieza) |
| Mar 20/10 | A2, A6 | B2 |
| Mié 21/10 | A7 | B3, B5 |
| Jue 22/10 | A3, A4, A5 | B4, B8 |
| Vie 23/10 | A8, A9, A10 · **Ensayo 1** | B6 · **Ensayo 1** |
| Sáb 24/10 | A13, A9 con resultados | B7, B10 |
| Dom 25/10 | **Ensayo 2** | B11 · **Ensayo 2** |
| Lun 26/10 | A12 | B12 · ajustes finales |
| Mar 27/10 | Revisión final | B13 · **código congelado** |

## Reglas para trabajar en equipo

- **Las partes solo se cruzan en cuatro puntos:**
  - fallos de los teléfonos (A → B, 21/10);
  - resultados de la ronda 1 (B → A, 21/10);
  - correcciones publicadas antes de la ronda 2 (B → A, 22/10);
  - contenido de la demo y panel listos para el ensayo 1 (23/10).
- **Tareas en GitHub:** un *issue* por problema, con la etiqueta `contenido` (A), `ux` o `plataforma` (B).
- **El código solo cambia** para lo que está en este documento. Antes de cada push: `npm run check`, `npm run test:db` y `npm run test:e2e`.
- **Nadie toca la base a mano** ni publica en Vercel desde su computadora: el contenido se edita en el panel y el código entra por `main`.
- **Migraciones:** `npm run backup` → `npx supabase db push --dry-run` → `db push` → y después el código a `main`.
- **Secretos** solo en `.env.local` y en los secretos de GitHub, Vercel y Supabase; nunca en el chat ni en los commits. Nunca `push --force` a `main`.
