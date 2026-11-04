import { expect, test } from '@playwright/test';

// Capa «Zonas con más reportes» (puntos calientes): cuadros de ~550 m con 2+ reportes públicos.
const HOT = { type: 'FeatureCollection', features: [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.3425, 19.4675] }, properties: { count: 6 } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.2475, 19.3825] }, properties: { count: 2 } },
] };

test('se enciende y se apaga, y explica qué significa el color', async ({ page }) => {
  await page.route('**/api/v1/map/hotspots', (r) => r.fulfill({ json: HOT }));
  await page.goto('/mapa');
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
  await page.goto('/mapa');
  await page.getByRole('button', { name: 'Zonas con más reportes' }).click();
  await expect(page.getByText('Todavía no hay zonas con varios reportes en los últimos 90 días.')).toBeVisible();
});

test('si la capa no está disponible, el botón no aparece', async ({ page }) => {
  await page.route('**/api/v1/map/hotspots', (r) => r.fulfill({ status: 404, json: { error: 'not_available' } }));
  await page.goto('/mapa');
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
