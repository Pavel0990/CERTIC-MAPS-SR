# ADR-009 · PWA en lugar de app nativa

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §6.4 |

## Contexto

Las bases admiten "móvil o web progresiva". Hay que llegar a teléfono, tablet y PC con un solo código.

## Decisión

PWA con Serwist. Offline solo para el shell, contenido visto, borradores y cola de reportes. Tres modos visibles: ONLINE, DEGRADED y OFFLINE.

## Alternativas descartadas

- React Native / Expo
- Capacitor

## Consecuencias

**A favor:**

- Un solo código, sin tiendas de aplicaciones.

**En contra:**

- Sin GPS en segundo plano.
- En iOS, push solo con la PWA instalada y la instalación es manual.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Usuarios de iPhone sin la PWA instalada no reciben push | Notificaciones in-app siempre y guía de instalación. El canal email para notificaciones llega en Fase 2. |

## Nota de implementación (02/10/2026)

El service worker se escribió a mano (`public/sw.js`, unas 150 líneas) en lugar de usar Serwist, siguiendo la guía de PWA de Next.js 16. Motivo: Serwist 9.5 necesita un plugin aparte y esbuild para funcionar con Turbopack (el empaquetador por defecto de Next 16), y la lógica que necesitamos es corta y auditable. Las estrategias son las de ARCHITECTURE.md §6.4:

| Recurso | Estrategia |
|---|---|
| `/_next/static`, `/icons`, `/vendor` | CacheFirst, versionado (`VERSION`) |
| `/api/v1/map/*` (capas públicas) | StaleWhileRevalidate, máximo 80 respuestas |
| Páginas públicas y `/reportar` | NetworkFirst; nunca se guardan redirecciones |
| Datos de usuario, auth, panel, búsqueda | NetworkOnly |
| Sin red y sin copia | Página `/offline`, guardada al instalar junto con sus scripts |

- **Actualización:** la versión nueva espera; la app muestra "Hay una versión nueva" y solo se recarga cuando la persona toca **Actualizar** (sin `skipWaiting` silencioso).
- **Teléfonos compartidos:** al salir de la cuenta se borran las páginas guardadas, se da de baja el push del dispositivo y se avisa si quedan reportes sin enviar.
- **Desarrollo:** en `next dev` se registra como `/sw.js?dev=1` y no guarda nada en caché (rompería la recarga en caliente); push funciona igual.
- **Background Sync:** no se usa. La cola de reportes se envía al abrir la app y al volver la conexión (`OutboxSync`), que es lo que también funciona en iPhone.
