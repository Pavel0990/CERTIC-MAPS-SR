// Service worker de SR Conecta (ARCHITECTURE.md §6.4, ADR-009).
// Escrito a mano (sin Serwist): ver la nota de 02/10/2026 en ADR-009.
//
// Caché:
//   · Estáticos (/_next/static, /icons, /vendor): CacheFirst, versionado por VERSION.
//   · Capas públicas del mapa (/api/v1/map/*): StaleWhileRevalidate, máx. 80 respuestas.
//   · Páginas: NetworkFirst SOLO para las públicas y el formulario de reporte; las demás NetworkOnly.
//     Sin red y sin copia: /offline.
//   · Todo lo demás (datos de usuario, auth, panel, búsqueda): red directa, nunca se guarda.
// Al salir de la cuenta la app pide borrar las páginas guardadas (mensaje CLEAR_USER_CACHE).
// Actualizaciones: la versión nueva espera hasta que la persona acepta (mensaje SKIP_WAITING).

const VERSION = 'v1';
const STATIC = `sr-static-${VERSION}`;
const PAGES = `sr-pages-${VERSION}`;
const DATA = `sr-data-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon.svg', '/manifest.webmanifest'];

const CACHEABLE_PAGES = [/^\/$/, /^\/mapa$/, /^\/reportar$/, /^\/consultas\/[^/]+$/, /^\/turismo\/[^/]+$/, /^\/rutas\/[^/]+$/, /^\/negocios\/(?!registrar$)[^/]+$/];
const PUBLIC_DATA = /^\/api\/v1\/map\/(features|aggregates|static-layers)$/;
const MAX_DATA_ENTRIES = 80;
// Registrado como /sw.js?dev=1 en `next dev`: sin caché (rompería la recarga en caliente), solo push.
const DEV = new URL(self.location.href).searchParams.has('dev');

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

// La página /offline se guarda con sus scripts y estilos: si faltara uno, Next mostraría su pantalla
// de error en vez del aviso (nadie la visita con conexión, así que no estarían en caché).
async function precache() {
  const cache = await caches.open(STATIC);
  await cache.addAll(PRECACHE);
  const page = await cache.match(OFFLINE_URL);
  const html = page ? await page.text() : '';
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  await Promise.allSettled(assets.map((a) => cache.add(a))); // uno que falle no impide instalar
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES, DATA]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_USER_CACHE') event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(DATA)]));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (DEV || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/vendor/')) {
    event.respondWith(cacheFirst(request));
  } else if (PUBLIC_DATA.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
  } else if (request.mode === 'navigate') {
    event.respondWith(CACHEABLE_PAGES.some((re) => re.test(url.pathname)) ? networkFirst(request) : networkOrOffline(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(DATA);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trim(cache, MAX_DATA_ENTRIES);
      }
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) ?? Response.json({ error: { code: 'offline', message: 'Sin conexión.' } }, { status: 503 });
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    // Solo respuestas finales propias: nunca redirecciones (p. ej. a /entrar) ni errores
    if (response.ok && !response.redirected) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

// ---------------------------------------------------------------------------------------------
// Web Push (ADR-013). El servidor envía { title, body, url, tag } (src/modules/notifications/server/push.ts).
// ---------------------------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/notificaciones';
  event.waitUntil(
    self.registration.showNotification(data.title || 'SR Conecta', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      lang: 'es-DO',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/notificaciones', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(target);
      }
      return self.clients.openWindow(target);
    })(),
  );
});
