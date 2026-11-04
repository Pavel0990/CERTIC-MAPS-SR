# 03 · Auditoría de UI/UX (Fase 1, solo lectura)

> 04/11/2026 · producción `https://sr-conecta.vercel.app` · rama `auto/auditoria-integral`.
> Método:
> - Playwright con Edge contra producción, 30 pantallas en 4 roles (visitante, vecino, moderador y administrador), con contexto de teléfono (táctil, DPR 2) a **320, 375, 390 y 430 px** y de escritorio a **1280 y 1920 px**. Son los anchos que no cubrió la auditoría automática del 03/11 (360/768/1024/1440).
> - En cada ancho se midió: desborde horizontal (`scrollWidth − clientWidth`), elementos visibles fuera de la pantalla (sin contar los que están dentro de un contenedor con scroll propio, el texto `sr-only` y los controles del mapa) y controles interactivos de menos de 44 px. Para no contar falsos positivos, las casillas y radios se midieron por su `label`, se ignoraron los `input[type=file]` ocultos y los enlaces en línea dentro de una frase.
> - Además: consistencia visual leída de las clases repetidas en `src/**/*.tsx`, 6 capturas y lectura del código de los componentes.
> - En la medición de diseño, las fichas (`/negocios/[id]`, `/turismo/[id]`, `/rutas/[id]` y sus `/editar`) se midieron como página 404 por un fallo del script al obtener los ids; las fichas reales se vieron en las capturas y en 08/09.

## Diagnóstico inicial

La interfaz es coherente, amable y está pensada para el público:
- texto de 15–17 px, botones de 44–52 px;
- un ícono con texto en cada acción;
- estados vacíos que explican y dan una salida;
- modo oscuro completo.

A los 6 anchos nuevos, **ninguna pantalla se desborda ni deja elementos fuera de la pantalla**, y en 30 pantallas × 6 anchos solo aparece **un** control de menos de 44 px: 43 px de alto. Los problemas no son de maquetación, sino de **contenido oculto y sistema**:
- la bandeja corta en silencio a los 100 elementos;
- los filtros y el menú del panel se deslizan de lado en el teléfono sin ninguna pista;
- los errores de los asistentes no se marcan en el campo;
- el inicio del panel en el teléfono mide ~4 400 px de alto;
- los radios y tamaños de letra se escriben a mano en vez de usar los tokens que ya existen.

## Mediciones a los anchos nuevos

| Medición | 320 | 375 | 390 | 430 | 1280 | 1920 |
|---|---|---|---|---|---|---|
| Pantallas con desborde horizontal | 0/30 | 0/30 | 0/30 | 0/30 | 0/30 | 0/30 |
| Elementos visibles fuera de la pantalla | 0 | 0 | 0 | 0 | 0 | 0 |
| Controles < 44 px (sin falsos positivos) | 1 | 1 | 1 | 1 | 1 | 1 |

- El único control pequeño es el enlace «1 alerta de tránsito activa» del inicio, de 334 × 43 px (368 × 43 en escritorio).
- Hay letra de menos de 14 px en 69 nodos a 390 px:
  - 11–12 px: iniciales del avatar («AC») e insignias «N sin leer», todas `aria-hidden` o con su texto accesible;
  - 13 px: insignias del panel, detalles de los indicadores, `kbd` del buscador y etiquetas de la barra inferior a 320 px.

## Hallazgos

| ID | Sev. | Pantalla | Ancho y tema | Problema | Evidencia | Corrección propuesta |
|---|---|---|---|---|---|---|
| UI-01 | **P2** | `/admin/bandeja` (tránsito y reportes) | todos | **Truncado silencioso.** Las dos listas piden `.limit(100)`, sin «Ver más» ni aviso. Si hay más de 100 pendientes en el municipio, los demás no se ven y nada lo indica. Es justo la pantalla donde el personal decide qué atender. | `src/modules/admin/server/queries.ts:48` y `:66` (`.limit(100)`); `bandeja/page.tsx` no muestra ningún total ni enlace de más | Pedir `count: 'exact'` y, cuando `count > 100`, mostrar «Mostrando 100 de N · Ver más» (`?ver=200`, igual que `/negocios`) |
| UI-02 | **P2** | `/admin/*` en teléfono y tableta; filtros de la bandeja, el panel y la auditoría | 320–430 px, ambos | Las pestañas del panel y las filas de chips se **deslizan de lado con la barra oculta** (`overflow-x-auto [scrollbar-width:none]`) y sin degradado ni flecha. A 390 px quedan cortadas «Validaciones», «Los Almácigos» y «Verificado»; quien no sabe deslizar no las encuentra. Una persona con poca experiencia digital no adivina el gesto. | Captura `s3` (bandeja a 390 px): «Validaciones», «L…» y «Activo» cortados en el borde; `admin-nav.tsx:39`, `auditoria/page.tsx:58` | Degradado en el borde derecho (`mask-image: linear-gradient(to right, #000 85%, transparent)`) y, en los filtros, envolver en dos líneas (`flex-wrap`) cuando son 4 opciones o menos. En el menú del panel, 7 secciones caben en una cuadrícula de 2 filas |
| UI-03 | **P2** | `/proponer`, `/negocios/registrar` | todos | El error de validación aparece como **un solo** recuadro rojo al pie del paso, con el primer mensaje. El campo no se marca en rojo ni recibe el foco. En un formulario largo en el teléfono, el aviso puede quedar fuera de la pantalla y la persona no sabe qué corregir. | `business-wizard.tsx:40,82`, `place-wizard.tsx:36,88` (`ErrorNote` único); `Field` ya admite `error` (`form.tsx`) | Errores por campo con `Field error=`, borde rojo (ya existe `aria-[invalid=true]:border-danger`) y foco en el primero (ver A11Y-04) |
| UI-04 | **P2** | Todas en el teléfono | 320–430 px | La barra inferior fija **tapa el control enfocado o el último botón** al recorrer el formulario: «Guardar» en Perfil y la tercera fila de tipos en Reportar. Visualmente, el botón queda bajo la barra hasta que la persona desplaza. | Teclado (09, A11Y-01): `obscured=A.press…` en `/perfil` («Guardar», top 767 de 800) y en `/reportar` | `scroll-padding-bottom` en `html` y, en los asistentes, la acción principal fija encima de la barra (`sticky bottom-[calc(68px+env(safe-area-inset-bottom))]`) |
| UI-05 | P3 | `/admin` (resumen) | 320 px | El resumen mide unos **4 400 px de alto** en el teléfono (14 bloques). Lo urgente, «Lo que hay que atender», sí va primero; lo demás obliga a desplazar mucho para llegar a «Contenido del mapa». | Captura `s2` (640 × 8 788 px a DPR 2) | En el teléfono, plegar «Aspectos destacados», «Lo más visto» y «Contenido del mapa» en `<details>`, o un índice de anclas debajo del encabezado |
| UI-06 | P3 | `/admin` | 1280 px, oscuro | La barra de herramientas se parte en dos filas: «Imprimir» queda solo debajo de «Actualizar» y «Descargar Excel» por el ancho que ocupan el riel y el menú lateral (88 + 232 px). | Captura `s1` | A partir de `lg`, agrupar «Descargar Excel» e «Imprimir» en un menú «Exportar», o pasar la marca «Actualizado a las…» a una línea propia |
| UI-07 | P3 | Tarjetas de la bandeja | todos | La jerarquía de acciones no es pareja: «Ya se resolvió» es un botón con borde, «Pasar a obra municipal» es un enlace sin contorno y «Descartar» es un botón rojo con borde. La acción más común no se distingue. | Captura `s3` | Una acción principal rellena por tarjeta (según el estado), las secundarias como `secondary` y las destructivas como `danger`, siempre en el mismo orden |
| UI-08 | P3 | Sistema visual | — | **Los tokens de radio existen y no se usan.** `--radius-sm/md/lg/xl` (10/14/18/24) están en `@theme`, pero el código usa `rounded-[Npx]` a mano **110 veces con 10 valores** (8, 10, 11, 12, 14, 16, 18, 20, 22, 24) y solo una vez `rounded-lg`. 12, 16, 20 y 22 no están en la escala. | `grep rounded-\[`: 14 px ×39, 18 px ×25, 12 px ×22, 16 px ×6, 20 px ×5, 10 px ×5, 22 px ×4, 11 px ×2, 8 px ×1, 24 px ×1 | Usar `rounded-md` (14), `rounded-lg` (18), etc., y llevar 12, 16, 20 y 22 al valor más cercano de la escala (o agregar `--radius-*` si hace falta). Una pasada con buscar y reemplazar |
| UI-09 | P3 | Sistema visual | — | **Escala de letra duplicada:** `text-sm` (14 px) ×80 junto a `text-[14px]` ×17, `text-[16px]` ×28 junto a `text-base` ×7, y `text-[15px]` ×96 como tamaño de cuerpo real sin token. En los títulos hay 9 tamaños distintos (22, 26, 28, 30, 34, 38, 40, 56 y 72 px). | `grep text-\[` en `src/**/*.tsx` | Definir en `@theme` `--text-body: 15px`, `--text-lead: 17px` y 4 títulos (`--text-h3/h2/h1/display`) y reemplazar los arbitrarios |
| UI-10 | P3 | Botón «Reportar» de la barra inferior | todos | Su sombra está escrita a mano (`shadow-[0_6px_16px_rgb(229_72_77/0.35)]`) con un rojo (`#e5484d`) que no es el token `--color-danger` (`#d92d33`), y no cambia en modo oscuro. Es la única sombra fuera de `--shadow-card`/`--shadow-float`, que se usan bien (53 veces). | `src/components/shared/app-nav.tsx` | `--shadow-danger` en `@theme`, con su variante oscura |
| UI-11 | P3 | Avisos | todos | Desaparecen a los 4 s y su botón de cerrar mide 24 px (ver A11Y-10). Para el público de §6.2 un «Guardado» de 4 s se pierde con facilidad. | `src/components/ui/toast.tsx` | Errores fijos hasta cerrarlos; éxito en 6–8 s; cierre `size-11` |
| UI-12 | P3 | `/negocios` «Ver más» | 390 px | Usa `scroll={false}`, así que la pantalla no salta (bien). Pero el foco y la vista se quedan en el botón, que baja hasta después de las 24 nuevas filas, y no se anuncia cuántas se agregaron. No se pudo confirmar en el navegador: el selector del script no encontró el enlace. | `href="/negocios?ver=48"` con `scroll:false` en el HTML | Después de cargar, enfocar la fila 25 (o anunciar «Se agregaron 24 negocios» en `aria-live`) |
| UI-13 | P3 | Fichas en modo oscuro | 390 px, oscuro | El minimapa sigue claro sobre fondo oscuro (decisión documentada en `globals.css`) y destaca mucho en la pantalla. | Captura `s5` | Si se mantiene claro, un borde `line-strong` y un poco menos de alto en oscuro; o el estilo oscuro de OpenFreeMap |

## Puntuación por parte (0–5)

| Parte | Puntos | Justificación |
|---|---|---|
| Dashboard (`/admin`) | 4 | Ordenado por urgencia («Lo que hay que atender» primero), cifras grandes con «?» que explica cada una, comparación con el periodo anterior y gráfico con tabla equivalente. Muy largo en el teléfono (UI-05) y con la barra de herramientas partida a 1280 px (UI-06) |
| Sidebar del panel | 4 | Dos grupos (Gestión y Administración), indicador activo, insignias con «pendientes» para lector, `sticky`. En el teléfono se convierte en pestañas deslizables sin pista (UI-02) |
| Header | 4 | `PageShell` consistente: rótulo, `h1` de 28/34 px, descripción y acciones; «Volver» en las fichas. Sin barra superior propia en el teléfono, por diseño (mapa a pantalla completa) |
| Navegación principal | 4,5 | Barra inferior de 5 pestañas (68 px) con «Reportar» destacado y riel lateral en escritorio; cabe en 320 px (letra de 13 px); `aria-current`; precarga. Tapa el foco (UI-04) |
| Panel administrativo (bandeja, validaciones, equipo, informes, auditoría, catálogos) | 3,5 | Tarjetas claras con estado y gravedad en palabras, confirmación en hoja, filtros en la URL. Pierde por el truncado silencioso a 100 (UI-01), la jerarquía de acciones dispareja (UI-07) y los filtros que no se ven (UI-02) |
| Tablas | 4 | Auditoría, informes y «Lo más visto» con `th scope`, región con scroll y nombre («desliza para ver todas las columnas»), `tabular-nums`. Los encabezados de «Lo más visto» son solo ícono (con `aria-label`): para quien ve, el significado del ojo y la flecha no es obvio |
| Formularios (reportar, proponer, registrar negocio, editar lugar, perfil) | 3,5 | Una decisión por pantalla, tarjetas grandes con ícono, «Escuchar», campos de 48 px y 16 px (sin zoom en iOS), `autocomplete` correcto. Los errores de los asistentes no van al campo (UI-03) y la acción puede quedar bajo la barra (UI-04) |
| Tarjetas | 4,5 | `Card` único (radio de 18 y `--shadow-card`), etiquetas de color con texto, buena densidad |
| Modales y hojas | 4,5 | `<dialog>` nativo: hoja inferior en el teléfono y panel lateral en escritorio, foco atrapado, Escape, fondo inerte, cierre de 44 px, retorno del foco (medido en 09) |
| Gráficos | 4 | Gráfico de tendencia accesible (flechas, `aria-live`, tabla), barras con animación que respeta «reducir movimiento». Con 7 días y casi todo en 0 se ve un pico solitario, sin eje Y |
| Filtros | 3,5 | Por enlace, en la URL y compartibles, con `aria-current`. En el teléfono quedan ocultos de lado (UI-02) |
| Paginación («Ver más») | 3,5 | Enlace normal que funciona sin JS y no mueve la pantalla en listas públicas; ausente en la bandeja (UI-01); foco sin gestionar (UI-12) |
| Estados vacíos | 4,5 | `EmptyState` explica por qué y qué hacer («Cuando los vecinos apoyen reportes públicos…»); «Todo al día» en el panel; ficha sin fotos con una invitación |
| Estados de carga | 4,5 | `RouteLoading` dibuja la forma de lo que viene, en las 8 secciones; esqueleto del mapa |
| Estados de error | 4 | `error.tsx` en palabras simples, con «Intentar otra vez» y «Volver al inicio»; `ErrorNote` con `role=alert`. El 404 y el error duplican `<main>` (A11Y-07) |
| Mensajes y notificaciones | 3,5 | Lenguaje claro y en segunda persona, `aria-live`. Avisos efímeros (UI-11) |
| Vista móvil (320–430) | 4,5 | Sin desbordes ni cortes a 320/375/390/430; objetivos de 44 px; letra base de 16 px |
| Vista tablet | 4 | No se midió aquí (cubierta el 03/11 a 768/1024); el panel usa pestañas hasta `lg`, con el mismo problema que UI-02 |
| Vista escritorio (1280–1920) | 4 | Sin desbordes; contenido con ancho máximo legible (`max-w-3xl`/`6xl`), riel más menú lateral. A 1920 px queda mucho margen vacío, aceptable |
| **Global UI/UX** | **4** | Producto cuidado y consistente para el público objetivo; los P2 son de visibilidad de contenido y de errores, no de maquetación |

## Lo que está bien

- 0 desbordes y 0 elementos fuera de la pantalla en 30 pantallas × 6 anchos; 1 solo control de 43 px.
- Vocabulario de estados en palabras («Lo están revisando»), sin mayúsculas sostenidas, ícono con texto.
- Modo oscuro completo con tokens propios; axe sin fallas de contraste en oscuro (09).
- Sombras con tokens (`--shadow-card` ×44, `--shadow-float` ×9) y espacios en la escala de 4 px (`gap-2/3/4`, `p-4/5`).
- Botones con `press` (respuesta al toque) que respeta «reducir movimiento».

## Lo no verificado

- Medición de diseño en las fichas reales y en las pantallas de edición a los 6 anchos (se midieron como 404; las capturas de la ficha no muestran problemas).
- Tablet (768/1024) en esta corrida: ya cubierta el 03/11.
- Estados de error reales del servidor y avisos en pantalla (no se envió nada).
- Prueba con vecinos reales (§6.2), que sigue pendiente según la memoria del proyecto.
- El comportamiento de «Ver más» en el navegador (UI-12).

## Capturas (6, en el scratchpad de la sesión, no versionadas)

- `s1-admin-_admin-1280-dark.png`: resumen del panel, oscuro, 1280 px (UI-06).
- `s2-admin-_admin-320.png`: resumen del panel, 320 px, página completa (UI-05).
- `s3-admin-_admin_bandeja-390.png`: bandeja, 390 px (UI-02, UI-07).
- `s4-vecino-_reportar-320.png`: reportar, 320 px.
- `s5-visitante-_negocios_…-390-dark.png`: ficha de negocio, oscuro (UI-13).
- `s6-vecino-_proponer-375.png`: proponer, 375 px.
