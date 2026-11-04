# 09 · Auditoría de accesibilidad, WCAG 2.2 AA (Fase 1, solo lectura)

> 04/11/2026 · producción `https://sr-conecta.vercel.app` · rama `auto/auditoria-integral`.
> Método: Playwright con Edge contra producción, con las cuentas de prueba de `tests/e2e/helpers.ts` (una sesión por rol, reutilizada con `storageState`; sin `globalSetup`, así que no se tocó la base). Se revisaron 30 pantallas en 4 roles: visitante, vecino, moderador y administrador.
> - **axe-core 4.14** con `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`: **86 análisis**, en claro y en oscuro, a 390 px y, para el personal, también a 1280 px. Se excluyeron el `<canvas>` del mapa y el portal de Next. Las fichas (`/negocios/[id]`, `/turismo/[id]`, `/rutas/[id]` y sus `/editar`) quedaron fuera del análisis axe por un fallo del script al obtener los ids; sí se cubrieron en estructura y teclado.
> - Estructura: encabezados, regiones, campos y nombres accesibles, leídos del DOM en las 30 pantallas.
> - Teclado: secuencias de Tab en `/proponer`, `/perfil`, `/reportar` y `/negocios/registrar` (390 px), en `/admin` y `/admin/bandeja` (1280 px), en `/mapa` y `/`. Se midieron el anillo de foco calculado y si el elemento enfocado quedaba tapado (`elementFromPoint`); también la hoja (`<dialog>`) de Catálogos.
> - Objetivos táctiles: medidos a 320, 375, 390, 430, 1280 y 1920 px (detalle en 03).

## Diagnóstico inicial

La base es muy buena:
- axe con WCAG 2.2 AA da **una sola infracción en 86 análisis**: el botón de atribución de MapLibre;
- todas las pantallas tienen `lang="es-DO"`, un solo `h1` y un enlace «Saltar al contenido» como primer elemento enfocable;
- todos los campos tienen etiqueta y sus `aria-describedby` apuntan a ids que existen;
- todos los botones de ícono tienen nombre;
- el anillo de foco de 3 px es consistente;
- la hoja modal atrapa el foco y lo devuelve al cerrarse.

Los problemas reales están donde axe no llega:
- en el teléfono, **el foco queda tapado por la barra inferior fija** (WCAG 2.4.11, nuevo en 2.2);
- dos controles **sin indicador de foco visible**: el buscador del mapa y el «?» de los indicadores;
- los **errores de los asistentes no van por campo** (§6.3 promete `aria-describedby` y foco en el primer error);
- **textos en inglés del mapa** ("Map", "Zoom in", "Toggle attribution");
- `<main>` duplicado, con id repetido, en las pantallas de error y «no encontrado».

## Hallazgos

| ID | Sev. | Pantalla | Ancho y tema | Problema | Evidencia | Corrección propuesta |
|---|---|---|---|---|---|---|
| A11Y-01 | **P2** | `/perfil`, `/reportar`, `/negocios/registrar` y toda pantalla con scroll en el teléfono | 390 × 800, claro | **2.4.11 Foco no oculto (AA).** Al avanzar con Tab, el control enfocado puede quedar debajo de la barra inferior fija (68 px). El navegador no desplaza la página porque el elemento sigue «visible» en el viewport, aunque esté tapado. | Teclado: `/perfil` → `button "Guardar"` (top 767) `obscured=A.press…` (enlace de la barra); `/reportar` → «Animales en la vía» y «Vía inundada» (top 691) `obscured=SPAN.flex h-8 w-14…`; `/negocios/registrar` → «Productos de finca», «Artesanía» | `src/app/globals.css`, en `html`: `scroll-padding-bottom: calc(68px + env(safe-area-inset-bottom))` (anulado desde `md:`, donde la barra es lateral). Con eso, el foco y los enlaces con ancla quedan por encima de la barra |
| A11Y-02 | **P2** | `/` y `/mapa` (buscador «¿A dónde quieres ir?») | 390 y 1280 px | **2.4.7 Foco visible.** El `input` del buscador tiene `outline-none` y el `label` que lo envuelve no tiene estilo `focus-within`: con teclado no se ve dónde está el foco, salvo por el cursor de texto. | Teclado: `/mapa` paso 15 y `/` paso 12 → `input "" ring=false none` | `src/app/(app)/_components/explorer/search-box.tsx:89`: en el `<label>`, `focus-within:ring-4 focus-within:ring-brand/30 focus-within:outline focus-within:outline-2 focus-within:outline-brand`, o quitar `outline-none` del input |
| A11Y-03 | **P2** | `/admin` (botón «?» de cada indicador) | 1280 px, ambos | **2.4.7 y 1.4.11.** El botón de 44 px tiene `outline-none`; el foco solo se ve como `ring-4 ring-brand/30` en el círculo interno de 28 px. Un 30 % de opacidad sobre `surface` no llega al 3:1 de contraste para indicadores, y en oscuro queda aún más débil. | Teclado: `/admin` pasos 27 y 29 → `button "Qué mide «Abiertos ahora»" ring=false none` | `src/app/(app)/admin/_dashboard/kpi-parts.tsx:127`: quitar `outline-none` (así rige el `:focus-visible` global de 3 px) o usar `group-focus-visible/q:ring-brand` sin opacidad |
| A11Y-04 | **P2** | `/proponer`, `/negocios/registrar` (y los pasos con datos de `/reportar`) | todas | **3.3.1 y 1.3.1.** La validación de los asistentes muestra **un solo** `ErrorNote` (`role="alert"`) con el primer mensaje de zod, al pie del paso. El campo no recibe `aria-invalid` ni `aria-describedby` con el error, y el foco no va al campo. §6.3 promete lo contrario. El primitivo `Field` ya lo resuelve, pero aquí no se usa. | `business-wizard.tsx:40` y `place-wizard.tsx:36`: `setError(parsed.error.issues[0]?.message …)` y luego `{error && <ErrorNote>{error}</ErrorNote>}`; `report-wizard.tsx` sí usa `Field error=` en la descripción (línea 282) | Mapear `parsed.error.issues` por `path[0]` hacia `Field error={errors.name}` y, después del `setErrors`, enfocar el primer campo con error (`document.getElementById(id)?.focus()`) |
| A11Y-05 | **P2** | Mapa (`/`, `/mapa` y fichas) | todas | **3.1.2 Idioma de las partes y 4.1.2.** MapLibre expone sus textos por defecto en inglés: la región del lienzo «Map», los botones «Zoom in» y «Zoom out» y el `summary` «Toggle attribution». Un lector de pantalla los lee con la voz española y no se entienden; para el público objetivo (§6.2) es una barrera. | Estructura: `canvas[region]«Map»`; teclado: `button "Zoom in"`, `summary "Toggle attribution"` | `src/modules/map/provider/maplibre-canvas.tsx:104`: opción `locale: { 'Map.Title': 'Mapa', 'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar', 'AttributionControl.ToggleAttribution': 'Ver créditos del mapa', … }` |
| A11Y-06 | **P2** | Mapa (atribución) | 390 px, claro y oscuro | **2.5.8 Tamaño del objetivo (AA).** Es la única infracción de axe en 86 análisis: el `summary.maplibregl-ctrl-attrib-button` mide 24 × 24, pero el `section` de la tarjeta inferior lo tapa en parte y le deja 24 × 6 px útiles. | axe `target-size` (serious), `/mapa` claro y oscuro, n=1: «partially obscured (smallest space is 24px by 6px)» | Subir la atribución por encima de la hoja o tarjeta (`.maplibregl-ctrl-bottom-right { bottom: <alto de la tarjeta> }`) o moverla a `top-left` en el teléfono |
| A11Y-07 | P3 | Página «no encontrado» (p. ej. `/negocios/0000…`) y `error.tsx` de `(app)` | todas | `not-found.tsx` y `(app)/error.tsx` pintan su propio `<main id="contenido">` **dentro** del `<main id="contenido">` del layout: queda un `main` anidado y un `id` duplicado, y el «Saltar al contenido» apunta al exterior. Además, el título de la pestaña sigue siendo «Negocio · SR Conecta» aunque la página dice «No encontramos esta página» (2.4.2). | Estructura: `lm: nav«Principal», main, main`; `title "Negocio · SR Conecta"` con `h1 "No encontramos esta página"`; `src/app/not-found.tsx:10`, `src/app/(app)/error.tsx:11` | Cambiar ese `<main>` por `<div>` (el layout ya da el `main`); `metadata.title = 'Página no encontrada'` en `not-found.tsx` |
| A11Y-08 | P3 | `/proponer`, `/negocios/registrar`, `/reportar` | 390 px | Al abrir el asistente, el foco salta al `h1` (`useEffect(() => heading.current?.focus(), [step, done])` también se ejecuta al montar). El primer Tab cae en «Escuchar» y se saltan el enlace «Saltar al contenido» y la navegación. No es un fallo de WCAG, pero conviene enfocar el `h1` solo al **cambiar** de paso. | Teclado: el primer Tab en `/proponer` es `button "Escuchar"`; el salto aparece recién en el paso 12 | `src/app/(app)/_content/wizard.tsx` y los `*-wizard.tsx`: guardar el paso anterior en una ref y enfocar solo si cambió |
| A11Y-09 | P3 | `/admin/bandeja` | todas | Salto de nivel de encabezado: `H1 Bandeja` → `H3 Desvío`, sin `h2` («Tránsito» o «Reportes al municipio» son pestañas, no títulos). | Estructura: `heads: H1:Bandeja · H3:Desvío`, `skips=1` (moderador y administrador) | `src/app/(app)/admin/bandeja/cards.tsx`: título de tarjeta como `h2`, o un `h2 class="sr-only"` con la pestaña activa |
| A11Y-10 | P3 | Avisos (`toast.tsx`) | todas | Los avisos se borran solos a los 4 s (los de error, a los 7 s), sin pausa (2.2.1, «Tiempo ajustable», con la excepción discutible de «tiempo real»). Para alguien que lee despacio, 4 s es poco. El botón «Cerrar aviso» mide 24 × 24 px (`p-1` + ícono `size-4`): cumple 2.5.8, pero no los 44 px del proyecto (§6.2). | `src/components/ui/toast.tsx:19,43` | Errores sin cierre automático; éxito en 6–8 s y pausa mientras tiene foco o puntero; botón `size-11` |
| A11Y-11 | P3 | 20 pantallas | 390 px | axe deja `color-contrast` como «revisar a mano» (`incomplete`) en 20 análisis, por fondos con degradado, imagen o transparencia. En `label-content-name-mismatch` hay 8: la etiqueta accesible no empieza con el texto visible (2.5.3). No son infracciones, pero no están verificadas. | axe `incomplete: color-contrast 20, label-content-name-mismatch 8` | Revisar en la demo con un lector de pantalla; en botones como `Editar` con `aria-label="Editar Accidente"` está bien (empieza igual) |

## Lo que está bien

- **axe WCAG 2.2 AA:** 85 de 86 análisis sin infracciones, en claro y oscuro, en teléfono y escritorio, para los 4 roles.
- **Regiones:** `nav «Principal»`, `main`, `nav «Panel municipal»`, `nav «Periodo»`, `nav «Territorio»`, `form[role=search]` y la tabla de auditoría como región enfocable con nombre («desliza para ver todas las columnas»).
- **Encabezados:** un solo `h1` en las 30 pantallas, sin saltos salvo en la bandeja.
- **Títulos de pestaña** descriptivos («Bandeja · SR Conecta»).
- **Formularios:** etiqueta en todos los campos; `aria-describedby` válido; `autocomplete="email" inputmode="email"` en Entrar, `name` en Perfil y `organization` en Registrar negocio; `Field` asocia la ayuda y el error.
- **Íconos:** ningún botón ni enlace de ícono sin nombre; ningún SVG expuesto sin `aria-hidden`.
- **Teclado:** orden lógico (riel, menú del panel, filtros y contenido); anillo de 3 px en casi todo; la hoja `<dialog>` lleva el foco a «Cerrar», lo **atrapa** (0 escapes en 14 Tabs) y con Escape lo **devuelve** a «Editar Accidente».
- **Gráfico del panel:** `role="img"` con descripción, recorrido con flechas, `aria-live` y una tabla equivalente («Ver como tabla»).
- Avisos en `aria-live="polite"`, y los errores con `role="alert"`.
- `prefers-reduced-motion` respetado en todo (`globals.css`).

## Lo no verificado

- axe en las fichas públicas y en las pantallas de edición (fallo del script; sí se revisaron estructura y teclado).
- Lectores de pantalla reales (TalkBack, VoiceOver) y el zoom al 200 % / 400 % (1.4.10 a 320 px CSS se cubrió por desborde en 03).
- Estados con datos de error reales (envíos rechazados): no se enviaron formularios.
- El contraste marcado como `incomplete` por axe.
- El arrastre en el mapa (2.5.7, «Movimientos de arrastre»): hay alternativas (zoom con botones y lista), pero no se probó elegir la ubicación de un reporte sin arrastrar.
- Reflujo de la hoja con el teclado virtual abierto.

## Puntuación por área (0–5)

| Área | Puntos | Por qué |
|---|---|---|
| Automático (axe 2.2 AA) | 4,5 | Una infracción, en un control de terceros |
| Encabezados y regiones | 4,5 | Impecable salvo la bandeja y el `main` duplicado del error y el 404 |
| Nombres de íconos y controles | 4 | Todos con nombre; los del mapa, en inglés |
| Teclado y foco | 3,5 | Orden y hojas bien; foco tapado por la barra y dos controles sin foco visible |
| Objetivos táctiles | 4,5 | 44 px casi en todo (ver 03); solo la atribución del mapa |
| Formularios y errores | 3 | Etiquetas y ayudas bien; errores de los asistentes sin asociar ni enfocar |
| **Global** | **4** | Por encima de lo habitual; los P2 son correcciones de pocas líneas |
