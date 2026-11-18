// Genera las imágenes de la app instalable (PWA) que se versionan en public/:
//   public/screenshots/  capturas del manifiesto: Android las muestra en la ventana de instalación
//   public/splash/       pantallas de inicio del iPhone (sin ellas, la app instalada abre en blanco)
// Las capturas se toman del sitio publicado (o de APP_URL), con su contenido real.
// Uso: node scripts/pwa-assets.mjs   ·   APP_URL=http://localhost:3000 node scripts/pwa-assets.mjs
// Si cambian los tamaños, actualizar SPLASH_SCREENS en src/app/layout.tsx y SCREENSHOTS en src/app/manifest.ts.
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base = process.env.APP_URL ?? 'https://sr-conecta.vercel.app';

// Tamaños lógicos de los iPhone (ancho × alto en puntos, densidad). Deben coincidir con SPLASH_SCREENS.
const IPHONES = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [414, 896, 3], [375, 812, 3], [414, 896, 2], [375, 667, 2],
];

const SHOTS = [
  { file: 'mapa.jpg', path: '/mapa', phone: true },
  { file: 'ruta.jpg', path: '/rutas', phone: true, firstLink: /^\/rutas\/[0-9a-f-]{36}$/ },
  { file: 'turismo.jpg', path: '/turismo', phone: true },
  { file: 'mapa-ancho.jpg', path: '/mapa', phone: false },
];

const browser = await chromium.launch();

mkdirSync(path.join(root, 'public/screenshots'), { recursive: true });
for (const s of SHOTS) {
  const ctx = await browser.newContext(
    s.phone
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-DO' }
      : { viewport: { width: 1366, height: 768 }, locale: 'es-DO' },
  );
  // Sin la ventana de "¿Quieres instalar?" encima
  await ctx.addInitScript(() => localStorage.setItem('sr-instalar-oculto', String(Number.MAX_SAFE_INTEGER / 2)));
  const page = await ctx.newPage();
  await page.goto(base + s.path, { waitUntil: 'networkidle' });
  if (s.firstLink) {
    const href = await page.$$eval('a[href]', (as, re) => as.map((a) => a.getAttribute('href')).find((h) => new RegExp(re).test(h)), s.firstLink.source);
    await page.goto(base + href, { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(4000); // teselas del mapa
  await page.screenshot({ path: path.join(root, 'public/screenshots', s.file), type: 'jpeg', quality: 80 });
  await ctx.close();
  console.log('captura', s.file);
}

// Pantalla de inicio: el ícono sobre el color de fondo del manifiesto, con el nombre debajo
const icon = readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8');
mkdirSync(path.join(root, 'public/splash'), { recursive: true });
const page = await browser.newPage();
for (const [w, h, dpr] of IPHONES) {
  await page.setViewportSize({ width: w * dpr, height: h * dpr });
  await page.setContent(`<!doctype html><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${8 * dpr}px;background:#f3f4f6;font-family:system-ui,sans-serif">
    <div style="width:${96 * dpr}px;height:${96 * dpr}px">${icon.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    <div style="font-size:${22 * dpr}px;font-weight:700;color:#1d4ed8">SR Conecta</div></body>`);
  await page.screenshot({ path: path.join(root, 'public/splash', `iphone-${w}x${h}@${dpr}.png`) });
  console.log('inicio', `${w}x${h}@${dpr}`);
}
await browser.close();
