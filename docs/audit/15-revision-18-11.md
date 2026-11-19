# Revisión del 18/11/2026: lo que quedaba antes de congelar

Cuatro revisiones en paralelo (UX/UI y accesibilidad, QA funcional, producción y seguridad, rendimiento y código), sobre el sitio en vivo y el código de `main` después de los PR #25 a #36. Partieron de la auditoría del 04/11 ([14-final-report.md](14-final-report.md)) y solo revisaron lo abierto o lo nuevo. Ninguna escribió en la base ni inició sesión en el sitio.

**Suites:** `npm run check` 154/154 · `npm run test:db` 207/207 (33 migraciones) · `npm audit --omit=dev` 0 vulnerabilidades · axe WCAG 2.1 AA: 0 infracciones en `/mapa`, `/instalar` y fichas (claro y oscuro) · 0 px de desborde horizontal de 320 a 1366 px · unos 290 enlaces internos, todos 200.

## Corregido en esta revisión

| Hallazgo | Antes | Ahora |
|---|---|---|
| La portada saltaba en el teléfono: la hoja inferior salía abierta del servidor y se plegaba al hidratar (`bottom-sheet.tsx`) | CLS 0,22 | CLS 0,03: sale plegada desde el CSS |
| El aviso de instalación tapaba más de la mitad del mapa y sus botones a los 4 s (`install-prompt.tsx`) | 292–357 px de alto | 178 px, a los 30 s; los pasos a mano van a `/instalar` ("Ver cómo") |
| "Reportes" y "Zonas con más reportes" quedaban fuera de la pantalla en el teléfono (`layer-chips.tsx`) | Fila deslizable sin pista | Varias filas: las 6 capas a la vista |
| El botón de capas era solo un ícono (`explorer.tsx`) | Ícono | "Capas" / "Ocultar" con texto |
| Un rechazo por límite de reportes por hora (429) se mostraba como "sin señal" y quedaba en la cola sin explicar nada (`outbox.ts`) | "Se enviará cuando vuelva la señal" | Se dice el motivo ("Hiciste muchas veces esta acción…"); los fallos del servidor se reintentan cada 2 min |
| Las fotos de un reporte reenviado desde la cola se podían perder sin aviso (`outbox-sync.tsx`) | Silencio | Aviso de error |
| "¿A qué distancia estoy?" desaparecía sin explicar si se negaba el permiso (`directions-extras.tsx`) | Desaparecía | "Sin permiso para ver tu ubicación" / "Intentar otra vez" |
| Tarjeta del punto a 320 px: los botones partían el texto (`selected-card.tsx`) | Dos líneas | Uno sobre otro por debajo de 360 px |
| Créditos del mapa abiertos en el teléfono en horizontal (`maplibre-canvas.tsx`) | Rozaban "Mi ubicación" | Plegados en pantallas bajas |
| El arranque del mapa no toleraba un ícono fallido ni salir de la pantalla mientras cargaba (`maplibre-canvas.tsx`) | Sin marcadores | Sigue con los demás íconos; no toca un mapa ya destruido |
| La ficha saltaba al aparecer "Escuchar" (`listen-button.tsx`) | CLS 0,05 | El botón ya ocupa su lugar desde el servidor |
| Avisos (toast) breves y con botón de cerrar de 24 px (`toast.tsx`) | 4 s / 7 s | 7 s / 12 s, botón de 44 px |
| Instrucciones de instalación solo para el menú ⋮ (`install-prompt.tsx`) | "⋮ arriba a la derecha" | "Menú del navegador (⋮ o ≡)" |
| `/instalar` no tenía enlace dentro de la app | Solo en el sitemap | En Perfil |
| Sin preconexión al servidor de teselas | — | `preconnect` a `tiles.openfreemap.org` |
| `.env.example` desalineado con el código | Faltaban `SUPABASE_ENV`, `BACKUP_PASSPHRASE`, `E2E_*`; sobraba `APP_TIMEZONE` | Alineado |

Falso positivo descartado: los botones de zoom de 44 px en pantallas táctiles ya existían (`globals.css`, `@media (pointer: coarse)`); la medición se hizo sin simular toque.

## Pendiente: cuentas y consolas (lo hace una persona del equipo)

En este orden, antes del 27/11:

1. **Captcha** (Cloudflare Turnstile): sin él, cualquiera puede agotar el cupo de correos de acceso y nadie podría entrar durante la demo. Pasos en [DEPLOYMENT.md §4](../../DEPLOYMENT.md#4-vercel).
2. **Correo de acceso**: hoy sale de un Gmail personal. Resend con dominio propio o, como mínimo, un Gmail de la organización. Dejar abiertas de antemano las sesiones de los teléfonos de la demo.
3. **Limpiar la base**: ✅ las 10 alertas de tránsito de prueba se borraron el 19/11 (`supabase/ops/remove_test_traffic_reports.sql`, con 19 avisos y 5 fotos; copia previa `backups/staging-202611190213.json`). Quedan 0 alertas hasta la primera real. **Falta decidir** el negocio "MMG" (aprobado el 28/10, no viene de OSM): si es de prueba, archivarlo desde el panel.
4. **Copia de seguridad**: repetir `npm run backup:check` con la copia del 18/11 y guardar `BACKUP_PASSPHRASE` en el gestor de contraseñas de la organización. Las fotos de Storage no entran en la copia diaria.
5. **Segundo dueño**: invitar un *Owner* en Supabase y un administrador en GitHub. Transferir cuentas después de la demo.
6. **Monitor y errores**: UptimeRobot o Better Stack contra `/api/v1/health`, y `SENTRY_DSN` en Vercel.
7. **Supabase → Auth**: bajar la validez del código de acceso a 10 minutos (`otp_expiry = 600`).

**Base de producción separada: no antes de la demo.** Exige recrear cuentas, fotos, suscripciones push y secretos en 9 días. Se declara producción la base actual y se crea un proyecto nuevo y vacío solo para las E2E.

## Pendiente: después de la demo (necesita decisión o es más grande)

- **Sin señal tras una sola visita**, `/mapa` muestra "Sin conexión": la primera visita ocurre antes de que el service worker controle la página. Con dos visitas funciona. Arreglarlo toca `sw.js` (precarga de la página y sus recursos) y conviene hacerlo con calma, junto con versionar `VERSION` por build.
- **Los listados** (`/negocios`, `/turismo`, `/rutas`) no se guardan para usar sin conexión.
- **Marcadores del mapa** a ~8 s en 4G lento: pedir `/api/v1/map/features` en paralelo con MapLibre, no después de `load`.
- **Fichas de 1,1 MB**: galería con `next/image` y mapa pequeño montado al entrar en pantalla.
- **98 KB de supabase-js y zod** en todas las pantallas: separar `PROVINCE_VIEW` de `config/env.ts`.
- **Errores por campo** en los asistentes (UI-03 / A11Y-04), `main` anidado (A11Y-07), salto de títulos en la bandeja (A11Y-09).
- **E2E de la cola sin conexión, de la foto y del tiempo real**, contra el proyecto de pruebas, no contra la base de la demo.
- **Fichas inexistentes** responden 200 en vez de 404 (solo afecta a buscadores).
- Activar `deploy.yml` y las E2E en la CI solo con el proyecto de pruebas aparte.

## Para la demo

- La cuenta del teléfono A tiene un límite de **5 reportes por hora**: no ensayar con ella en la misma hora de la demo.
- El aviso de instalación ahora sale a los 30 s: no interrumpe el inicio de la presentación.
