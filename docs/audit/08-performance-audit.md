# 08 · Auditoría de rendimiento (Fase 1, solo lectura)

> 04/11/2026 · producción `https://sr-conecta.vercel.app` · rama `auto/auditoria-integral`.
> Método: Playwright con Edge, contexto de teléfono (390 × 800, DPR 2, táctil), **CPU limitada 4x** (`Emulation.setCPUThrottlingRate`) y **red "4G lento" de Lighthouse** (150 ms de RTT, 1,6 Mb/s de bajada y 750 kb/s de subida, `Network.emulateNetworkConditions`), sin caché. LCP, CLS, tareas largas y eventos con `PerformanceObserver`; bytes por petición con CDP (`Network.loadingFinished.encodedDataLength`). Dos cargas en frío por pantalla. El JS por ruta sale de `.next/diagnostics/route-bundle-stats.json` (build local del 03/11 21:03, el mismo commit `bfa7c18`), comprimido con gzip.
> Objetivos de referencia: ARCHITECTURE.md §14.4 (LCP < 2,5 s, INP < 200 ms, CLS < 0,1, JS inicial propio < 200 KB gzip sin el mapa).

## Diagnóstico inicial

El servidor responde rápido (TTFB de unos 175 ms, con picos de 1,2 s en arranques en frío) y el CLS está bien en todas las pantallas. Lo que frena es **lo que se descarga antes de pintar**. En una red rural lenta la primera pintura nunca baja de **2,1 s**, porque la hoja de estilos (13 KB, bloqueante) compite con **4 fuentes precargadas (146 KB)**. Además, el JS inicial sin el mapa ronda los **260–280 KB gzip** en todas las rutas, por encima de la meta de 200 KB: el layout común mete el cliente de Supabase (97 KB gzip) incluso para quien solo mira. Dos pantallas no cumplen el LCP: el inicio (3,4 s, con la foto del LCP en `loading="lazy"`) y `/mapa` (6,4–6,8 s). Las fichas descargan el mapa completo (294 KB de JS y unos 225 KB de teselas) para un mapa pequeño.

## Mediciones (móvil, CPU 4x, 4G lento; dos corridas)

| Pantalla | TTFB | FCP | LCP | Elemento LCP | CLS | TBT aprox. | Peticiones | Transferido (JS / fuentes / imágenes / fetch) |
|---|---|---|---|---|---|---|---|---|
| `/` | 175 ms | 2,17–2,19 s | **3,37–3,42 s** | `IMG` de «Descubre la provincia» (`/_next/image`) | 0,018 | 343–346 ms | 52 | 1 217 KB (575 / 146 / 179 / 280) |
| `/mapa` | 179–1 266 ms | 2,20–2,58 s | **6,37–6,76 s** | `DIV` de la atribución del mapa | 0,018 | 341–396 ms | 48 | 1 033 KB (573 / 146 / 0 / 280) |
| `/negocios` | 148–180 ms | 2,12 s | 2,47 s | párrafo de descripción | 0,009 | 74–101 ms | 30 | 448 KB (265 / 146 / – / 7) |
| Ficha de negocio | 164–180 ms | 2,13–2,14 s | 2,39–2,40 s | párrafo «¿Es tu negocio?…» | **0,068** | 277–281 ms | 46 | 968 KB (564 / 146 / 0 / 225) |
| Ficha de lugar | 182–1 175 ms | 2,13–2,42 s | 2,13–2,80 s | párrafo «Todavía no hay fotos…» | **0,073** | 279–384 ms | 46 | 968 KB (564 / 146 / 0 / 225) |
| `/admin` (administrador) | 170 ms | 2,12–2,14 s | 2,53–2,57 s | `H1` | 0,001 | 103–142 ms | 36 | 465 KB (274 / 147 / – / 10) |

INP: al tocar el título de cada pantalla, después de la carga, la interacción duró de 16 a 32 ms, con 16–25 ms de espera antes de procesarla. Es una cota inferior: no se probaron interacciones pesadas, como abrir una ficha desde el mapa o filtrar.

### JS de primera carga por ruta (build local, gzip)

| Ruta | Sin comprimir | gzip | Trozos |
|---|---|---|---|
| `/offline` (solo el layout raíz) | 499 KB | 152 KB | 10 |
| `/negocios` | 885 KB | **258 KB** | 14 |
| `/negocios/[id]` | 894 KB | 262 KB | 14 |
| `/admin` | 906 KB | 266 KB | 16 |
| `/mapa` | 912 KB | 268 KB (más 294 KB de MapLibre cargado aparte) | 15 |
| `/` | 927 KB | 273 KB | 15 |
| `/reportar` | 938 KB | 278 KB | 15 |

Lo que el layout `(app)` agrega sobre `/offline`: `25lvuru7dckha.js`, de **363 KB sin comprimir y 97 KB gzip**, que contiene supabase-js (GoTrue, Realtime y PostgREST) y zod. Se carga en todas las pantallas, también para el visitante sin sesión.

## Hallazgos

| ID | Sev. | Pantalla | Ancho y tema | Problema | Evidencia | Corrección propuesta |
|---|---|---|---|---|---|---|
| PERF-01 | **P2** | Todas | 390 px, ambos | El JS inicial sin el mapa (258–278 KB gzip) supera la meta de 200 KB de §14.4. El mayor trozo evitable es el cliente de Supabase (97 KB gzip), que entra en el layout por `OutboxSync`, que importa de forma estática `uploadPhotos` de `@/modules/media`. Se descarga y se evalúa aunque no haya nada en la cola, y también para visitantes sin sesión (el componente cliente queda en el manifiesto del layout aunque `{viewer && …}` no lo pinte). | `route-bundle-stats.json`: `/offline` 152 KB gzip frente a `/negocios` 258 KB gzip; diferencia `25lvuru7dckha.js` (97 KB gzip, contiene `supabase`, `GoTrue`, `realtime`) | `src/app/(app)/_components/outbox-sync.tsx`: `const { uploadPhotos } = await import('@/modules/media')` dentro de `sync()`, solo cuando `flushOutbox` encuentra items; o cargar el componente con `next/dynamic`. Volver a medir con `route-bundle-stats.json` |
| PERF-02 | **P2** | Todas | 390 px | Primera pintura de 2,1 s como mínimo en 4G lento: el CSS bloqueante termina a los ~2,0 s porque compite con **4 fuentes precargadas (146 KB)**: Lexend y Nunito, cada una en `latin` y `latin-ext`. El español entero cabe en `latin` (U+0000–00FF: á, é, ñ, ü, ¿, ¡), así que `latin-ext` sobra. | `link[rel=preload][as=font]` × 4; `document.fonts` cargadas: `Lexend U+100-2BA…` y `Nunito U+100-2BA…`; `renderBlockingStatus=blocking` solo en `2365i2ecsh27y.css` (13 KB, termina entre 2 017 y 2 105 ms) | `src/app/layout.tsx`: `subsets: ['latin']` en las dos fuentes (ahorra 2 de los 4 archivos, unos 70 KB) y `preload: false` en Nunito, que solo se usa en los títulos y ya tiene `display: swap`. Así se libera ancho de banda para el CSS y el HTML |
| PERF-03 | **P2** | `/` | 390 px | LCP de 3,4 s (meta 2,5 s). El elemento LCP es la primera foto de «Descubre la provincia», que está sobre el pliegue pero lleva `loading="lazy"` y ninguna prioridad. Además se sirve a la mitad de su resolución: es natural de 200 × 150 y se muestra en 200 × 112 con DPR 2 (`ratio 0,5`), así que se ve borrosa. | `lcpEl: IMG /_next/image?url=…supabase…`; `imgs[0]: nat 200x150, shown 200x112, loading lazy, aboveFold true` | `src/app/(app)/_components/discover.tsx:60`: `preload` (en Next 16 reemplaza a `priority`) o `loading="eager"` con `fetchPriority="high"` en las dos primeras tarjetas. Revisar la fuente: si la URL de Supabase ya es una miniatura de 200 px, pasar la original para que `/_next/image` sirva 400 px |
| PERF-04 | **P2** | `/mapa` (y el mapa del inicio) | 390 px | LCP de 6,4–6,8 s, y lo último en pintar es la atribución, porque el mapa entero espera a MapLibre (294 KB transferidos, el mayor trozo) más el estilo y las teselas (18 fetch, 280 KB). TBT de 340–400 ms en un teléfono lento: es la evaluación de MapLibre. | `lcpEl: DIV OpenFreeMap © OpenMapTiles…`; `js: 2e0a-8u5nmv5f.js 295KB`; tareas largas de hasta 163 ms | Ya hay esqueleto (§6.1). Para bajar el LCP: pintar un texto o una lista visible antes que el lienzo (por ejemplo, el buscador y los chips fuera del contenedor del mapa, que ya pintan a los 2,2 s), `preconnect` a `tiles.openfreemap.org` y precargar el JS de MapLibre en `/mapa` con `<link rel="modulepreload">`. Medir aparte la meta de «primeras features < 4 s», que esta prueba no aisló |
| PERF-05 | **P2** | Fichas de negocio, lugar y ruta | 390 px | Cada ficha descarga el motor de mapas completo (JS de 294 KB) y unos 225 KB de teselas para un mapa pequeño de ubicación: **968 KB por ficha** frente a 448 KB de la lista. Para vecinos con datos prepagados es un costo real, y suma TBT (280–380 ms). | `byType Script 564KB`, `Fetch 16 / 225KB`, terceros `tiles.openfreemap.org` | Montar el minimapa solo cuando entra en pantalla (`IntersectionObserver`) o tras tocar «Ver en el mapa»; mientras tanto, una vista estática con el botón «Cómo llegar», que ya existe |
| PERF-06 | P3 | Fichas | 390 px | Un CLS de 0,068–0,074 es el más alto de la app, aunque cumple la meta de 0,1. Probablemente lo causa el minimapa o la galería, que cambian de alto al cargar. | `cls` en las dos corridas | Reservar el alto del contenedor del mapa y de la galería (`aspect-ratio` fijo) |
| PERF-07 | P3 | Avatares y fotos de usuarios | — | No pasan por `next/image`, con razón documentada (avatar), pero `photo-gallery.tsx`, `consultas/[id]` y `admin/validaciones` muestran `<img>` con la URL pública original de Storage, sin `width`/`height` ni `srcset`. Si las fotos son las originales comprimidas por `sharp` está bien; si no, en la ficha se descargan más bytes de los necesarios. | `grep "<img" src` (5 lugares); no se midió con fotos reales, porque la ficha probada no tiene fotos | Pasar por `next/image` con `sizes` (el dominio ya está en `images.remotePatterns`) o guardar una versión de 800 px en la subida |
| PERF-08 | P3 | Todas | — | Hay 15–16 scripts en `<head>` por pantalla. El único sin `async` es el `noModule` de polyfills, que los navegadores modernos no descargan: no bloquea. | `headScripts`; `0c0hxoamwjsbw.js` tiene `noModule` | Nada que hacer; se deja anotado para no confundirlo con un bloqueo |

## Lo que está bien

- TTFB de 150–180 ms en caliente, con regiones cercanas (iad1 / us-east-1) y HTML pequeño (8–22 KB comprimido).
- CLS < 0,1 en todas las pantallas; `/admin` y las listas, prácticamente en 0.
- El único recurso que bloquea el renderizado es un CSS de 13 KB, sin scripts bloqueantes; las fuentes usan `display: swap` con métricas de respaldo («Lexend Fallback»).
- `/negocios` y `/admin` no cargan el mapa y quedan en 2,5 s de LCP y 450–465 KB en total; TBT de 74–142 ms.
- Las interacciones simples responden en 16–32 ms incluso con la CPU limitada 4x.
- `next/image` en la portada; `loading="lazy"` en las galerías; la precarga selectiva de enlaces (§14.4) se nota en el número de peticiones (30–52).

## Lo no verificado

- El INP de interacciones reales y pesadas (abrir una ficha desde el mapa, cambiar capas o el periodo del panel): solo se midió un toque sin trabajo.
- La meta «mapa con primeras features < 4 s» como marca propia: el LCP del mapa queda dominado por la atribución.
- Escritorio y una red 4G normal (solo se midió el caso de teléfono lento).
- El peso de fotos reales en fichas con galería: la ficha medida no tenía fotos.
- El JS por ruta proviene del build local de `bfa7c18`; la producción puede diferir si se publicó otro commit. Los bytes por red coinciden en orden de magnitud: 265–275 KB de JS sin el mapa.

## Puntuación por área (0–5)

| Área | Puntos | Por qué |
|---|---|---|
| Servidor y TTFB | 4,5 | Rápido y estable; arranques en frío ocasionales de 1,2 s |
| LCP | 3 | Cumple en listas, fichas y panel (2,1–2,6 s, justo en el límite); falla en el inicio (3,4 s) y en el mapa (6,5 s) |
| CLS | 4,5 | Bien en todo; fichas en 0,07 |
| JS e interactividad | 3 | De 260 a 280 KB gzip sin el mapa frente a la meta de 200; TBT de 280–400 ms en pantallas con mapa |
| Imágenes | 3 | `next/image` en la portada, pero el LCP está en lazy y a media resolución; el resto son `<img>` directos |
| Fuentes | 3 | Precarga el doble de lo necesario (latin-ext) en una red lenta |
| **Global** | **3,5** | Base sana; tres arreglos baratos (PERF-01, 02 y 03) acercan todas las pantallas a la meta |
