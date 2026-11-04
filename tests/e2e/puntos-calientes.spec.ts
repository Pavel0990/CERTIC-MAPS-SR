import { expect, test } from '@playwright/test';

// Capa «Zonas con más reportes» (puntos calientes): cuadros de ~550 m con 2+ reportes públicos.
const HOT = { type: 'FeatureCollection', features: [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.3425, 19.4675] }, properties: { count: 6 } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.2475, 19.3825] }, properties: { count: 2 } },
] };

test.beforeEach(async ({ context }) => {
  // El aviso de instalar la app se prueba aparte: aquí tapaba los botones de las capas (intermitente en producción)
  await context.addInitScript(() => localStorage.setItem('sr-instalar-oculto', String(Date.now())));
});

// En el teléfono las capas viven plegadas detrás del botón «Capas del mapa» (las E2E corren con tamaño de teléfono)
async function openMap(page: import('@playwright/test').Page) {
  await page.goto('/mapa');
  const layers = page.getByRole('button', { name: 'Capas del mapa' });
  // Se espera al botón: preguntar si ya se ve, con la página a medio cargar, saltaba este paso en producción
  await expect(layers).toBeVisible({ timeout: 20_000 });
  // Se reintenta: un toque antes de que la página cargue del todo no hace nada
  await expect(async () => {
    if (!(await page.getByRole('button', { name: 'Turismo' }).isVisible())) await layers.click();
    await expect(page.getByRole('button', { name: 'Turismo' })).toBeVisible({ timeout: 1000 });
  }).toPass();
}

test('se enciende y se apaga, y explica qué significa el color', async ({ page }) => {
  await page.route('**/api/v1/map/hotspots', (r) => r.fulfill({ json: HOT }));
  await openMap(page);
  const chip = page.getByRole('button', { name: 'Zonas con más reportes' });
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Más rojo, más reportes en los últimos 90 días.' })).toBeVisible();
  await chip.click();
  await expect(page.getByText('Más rojo, más reportes')).toHaveCount(0);
});

test('sin zonas todavía, lo dice en vez de mostrar un mapa vacío', async ({ page }) => {
  await page.route('**/api/v1/map/hotspots', (r) => r.fulfill({ json: { type: 'FeatureCollection', features: [] } }));
  await openMap(page);
  await page.getByRole('button', { name: 'Zonas con más reportes' }).click();
  await expect(page.getByText('Todavía no hay zonas con varios reportes en los últimos 90 días.')).toBeVisible();
});

test('si la capa no está disponible, el botón no aparece', async ({ page }) => {
  await page.route('**/api/v1/map/hotspots', (r) => r.fulfill({ status: 404, json: { error: 'not_available' } }));
  await openMap(page);
  await expect(page.getByRole('button', { name: 'Turismo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zonas con más reportes' })).toHaveCount(0);
});

test('la API real responde con la capa o con «no disponible», nunca con un error', async ({ request }) => {
  const res = await request.get('/api/v1/map/hotspots');
  expect([200, 404]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body.type).toBe('FeatureCollection');
    for (const f of body.features) expect(f.properties.count).toBeGreaterThanOrEqual(2);
  }
});
