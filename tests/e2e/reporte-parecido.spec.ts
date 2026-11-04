import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// Aviso de reporte parecido cercano en /reportar (DATABASE.md §5.23). La respuesta de /api/v1/reports/similar
// se simula: así la prueba no depende de que la migración esté aplicada en staging ni crea datos.
// Sin simular, en una base sin la RPC el asistente sigue igual que siempre (lo cubre reporte-moderacion.spec.ts).
const EXISTING = '0b7e7c3e-6f1a-4c8e-9d38-2f8a1c5b9e01';
const SCREENSHOTS = process.env.E2E_SCREENSHOTS; // carpeta opcional para revisar el aviso a ojo (claro y oscuro)

async function toPlace(page: Page, type: string) {
  await page.goto('/reportar');
  await page.getByRole('button', { name: type }).click();
  await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
  await page.getByRole('button', { name: 'El pin está en el lugar' }).click();
}

test.use({ geolocation: { latitude: 19.4757, longitude: -71.3418 }, permissions: ['geolocation'] });

test('hay un reporte parecido cerca: avisa, deja verlo y "Crear el mío igual" sigue con el asistente', async ({ page }) => {
  await signIn(page, ACCOUNTS.vecino);
  let asked: unknown = null;
  await page.route('**/api/v1/reports/similar', async (route) => {
    asked = route.request().postDataJSON();
    await route.fulfill({ json: { status: 'ok', items: [
      { id: EXISTING, kind: 'request', type: 'alumbrado', distance_m: 42, mine: false, support_count: 3, can_support: true, supported: false },
    ] } });
  });
  await toPlace(page, 'Alumbrado');

  await expect(page.getByRole('heading', { name: 'Ya hay un reporte parecido aquí' })).toBeFocused();
  await expect(page.getByText('¿Quieres apoyarlo en lugar de crear otro?')).toBeVisible();
  await expect(page.getByText('a unos 42 m de aquí · 3 personas lo apoyan')).toBeVisible();
  expect(asked).toMatchObject({ kind: 'incident', type: 'alumbrado' });
  await expect(page.getByRole('link', { name: 'Ver el reporte' })).toHaveAttribute('href', `/consultas/${EXISTING}`);
  for (const name of ['Apoyarlo', 'Crear el mío igual']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  // WCAG 2.1 AA (contraste incluido) en claro y en oscuro; el mapa oculto de detrás se excluye como en las demás pruebas
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(400); // fin de las transiciones de color
    if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/aviso-${scheme}.png`, fullPage: true });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').exclude('nextjs-portal').analyze();
    expect(r.violations.map((v) => `${scheme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: 'light' });

  await page.getByRole('button', { name: 'Crear el mío igual' }).click();
  await expect(page.getByRole('heading', { name: 'Cuéntanos más' })).toBeVisible();
});

test('si la consulta tarda o falla, el asistente sigue sin aviso y sin mensaje de error', async ({ page }) => {
  await signIn(page, ACCOUNTS.vecino);
  await page.route('**/api/v1/reports/similar', async (route) => {
    await new Promise((r) => setTimeout(r, 5000)); // más que el máximo de 1,5 s
    await route.fulfill({ status: 503, json: { error: { code: 'unavailable' } } }).catch(() => {});
  });
  await toPlace(page, 'Bache');
  const started = Date.now();
  await expect(page.getByRole('heading', { name: 'Cuéntanos más' })).toBeVisible({ timeout: 4000 });
  expect(Date.now() - started).toBeLessThan(3000);
  await expect(page.getByText(/reporte parecido/)).toHaveCount(0);
  await expect(page.getByText(/No pudimos/)).toHaveCount(0);
});
