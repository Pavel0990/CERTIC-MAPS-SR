import { expect, test } from '@playwright/test';

// Mapa en el teléfono, como en las apps de mapas: la hoja «Descubre» empieza plegada para que se vea el mapa,
// y las capas se abren solo cuando se necesitan.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ context }) => {
  // El aviso de instalar se prueba aparte: aquí taparía la hoja
  await context.addInitScript(() => localStorage.setItem('sr-instalar-oculto', String(Date.now())));
});

test('la hoja empieza plegada, se abre al tocar el título y se pliega otra vez', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('button', { name: /Descubre la provincia/ });
  await expect(title).toHaveAttribute('aria-expanded', 'false');
  // Plegada, los accesos de la hoja no se pueden tocar ni enfocar (inert)
  const lists = page.getByRole('navigation', { name: 'Ver en lista' });
  await expect(lists.locator('xpath=ancestor::*[@inert]')).toHaveCount(1);
  await expect(async () => {
    if ((await title.getAttribute('aria-expanded')) === 'false') await title.click();
    await expect(title).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
  }).toPass();
  await expect(title).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Ver en lista' }).getByRole('link', { name: 'Negocios' })).toBeVisible();
  // Abierta, los botones flotantes se apartan para no chocar con el buscador
  await expect(page.getByRole('button', { name: 'Mostrar mi ubicación' })).toBeHidden();
  await title.click();
  await expect(title).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Mostrar mi ubicación' })).toBeVisible();
});

test('las capas están plegadas en un botón', async ({ page }) => {
  await page.goto('/mapa');
  await expect(page.getByRole('button', { name: 'Turismo' })).toBeHidden();
  await expect(async () => {
    await page.getByRole('button', { name: 'Capas del mapa' }).click();
    await expect(page.getByRole('button', { name: 'Turismo' })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole('button', { name: 'Ocultar capas' }).click();
  await expect(page.getByRole('button', { name: 'Turismo' })).toBeHidden();
});

test.describe('aviso para instalar la app', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.removeItem('sr-instalar-oculto'));
  });

  test('aparece en el teléfono y «Ahora no» lo calla en las visitas siguientes', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: '¿Quieres instalar SR Conecta?' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: 'Ahora no' }).last().click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('sr-instalar-oculto'))).not.toBeNull();
  });

  test('no aparece a mitad de un formulario', async ({ page }) => {
    await page.goto('/entrar');
    await page.waitForTimeout(5000);
    await expect(page.getByRole('dialog', { name: '¿Quieres instalar SR Conecta?' })).toHaveCount(0);
  });
});
