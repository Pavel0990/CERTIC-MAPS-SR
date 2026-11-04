import { expect, test } from '@playwright/test';

// Lo que ve cualquier persona, sin cuenta: listados, filtros y fichas con "Cómo llegar".
test('un visitante encuentra un negocio en la lista, filtra y abre su ficha', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Ver en lista' }).getByRole('link', { name: 'Negocios' }).click();
  await expect(page.getByRole('heading', { name: 'Negocios', level: 1 })).toBeVisible();
  await expect(page.getByText(/^\d+ negocios/)).toBeVisible();
  // La lista se carga por partes: 24 de entrada y más al pedirlo, sin mover la pantalla
  const rows = page.locator('main li a[href^="/negocios/"]');
  await expect(rows).toHaveCount(24);
  await page.getByRole('link', { name: /^Ver \d+ negocios más$/ }).click();
  await expect(page).toHaveURL(/ver=48/);
  await expect(rows).not.toHaveCount(24);

  await page.getByRole('navigation', { name: 'Municipio' }).getByRole('link', { name: 'Monción' }).click();
  await expect(page).toHaveURL(/municipio=mon/);
  await page.getByRole('navigation', { name: 'Tipo de negocio' }).getByRole('link', { name: /salud/i }).click();
  await expect(page).toHaveURL(/municipio=mon.*tipo=salud|tipo=salud.*municipio=mon/);
  const first = page.locator('main li a[href^="/negocios/"]').first();
  await expect(first).toContainText('Monción');
  await first.click();
  await expect(page.getByRole('link', { name: /Cómo llegar/ })).toBeVisible();
});

test('los listados de lugares y rutas muestran contenido real con su ficha', async ({ page }) => {
  await page.goto('/turismo');
  await expect(page.getByText('Presa de Monción')).toBeVisible();
  await page.goto('/rutas');
  await page.getByRole('link', { name: /De Monción a la Presa/ }).click();
  await expect(page.getByRole('heading', { name: 'De Monción a la Presa' })).toBeVisible();
});

test('la búsqueda tolera nombres sin tilde', async ({ page }) => {
  await page.goto('/negocios?q=moncion');
  await expect(page.locator('main li').first()).toContainText(/Monci[oó]n/i);
});

// El mapa es lo primero que se ve en la demo. Su web worker se sirve desde public/vendor/maplibre/<versión>
// (lo copia `prebuild`): si falta, el mapa queda en blanco sin que falle ninguna otra prueba. Esta lo detecta.
test('el mapa dibuja la provincia sin errores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/mapa');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  // Solo el lienzo (sin buscador ni botones encima): en blanco su captura pesa ~11 KB; con calles,
  // límites y marcadores, cientos de KB. Se espera a que tenga dibujo de verdad.
  const onlyCanvas = '*{visibility:hidden!important} canvas.maplibregl-canvas{visibility:visible!important}';
  await expect.poll(async () => (await canvas.screenshot({ style: onlyCanvas })).length, { timeout: 20_000 }).toBeGreaterThan(60_000);
  expect(errors.filter((e) => /worker|maplibre|webgl/i.test(e))).toEqual([]);
});

test('los buscadores reciben robots.txt y sitemap.xml: solo lo público', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin');
  expect(robots).toContain('Disallow: /perfil');
  expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBeTruthy();
  const sitemap = await res.text();
  for (const path of ['/mapa', '/negocios', '/turismo', '/rutas']) expect(sitemap).toContain(`${path}</loc>`);
  expect(sitemap).not.toContain('/admin');
});
