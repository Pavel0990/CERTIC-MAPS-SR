import { expect, test } from '@playwright/test';

// Lo que ve cualquier persona, sin cuenta: listados, filtros y fichas con "Cómo llegar".
test('un visitante encuentra un negocio en la lista, filtra y abre su ficha', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Ver en lista' }).getByRole('link', { name: 'Negocios' }).click();
  await expect(page.getByRole('heading', { name: 'Negocios', level: 1 })).toBeVisible();
  await expect(page.getByText(/\d+ negocios/)).toBeVisible();

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
