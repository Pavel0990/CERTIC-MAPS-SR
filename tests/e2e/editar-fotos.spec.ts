import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// El personal agrega fotos a un lugar desde "Editar" (antes la edición no tenía dónde subirlas).
// No se sube nada: se comprueba que el selector funciona hasta el botón de subir, sin dejar datos en la base.
test('el personal puede elegir fotos al editar un lugar o una ruta', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  for (const list of ['/turismo', '/rutas']) {
    await page.goto(list);
    const href = await page.locator(`main a[href^="${list}/"]`).first().getAttribute('href');
    await page.goto(`${href}/editar`);
    await expect(page.getByRole('heading', { name: 'Fotos', level: 2 })).toBeVisible();

    // Foto de prueba dibujada por el navegador, elegida como lo haría una persona
    const png = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 800; c.height = 600;
      const g = c.getContext('2d')!;
      g.fillStyle = '#0e9f9a'; g.fillRect(0, 0, 800, 600);
      return c.toDataURL('image/png').split(',')[1]!;
    });
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByText('Agregar', { exact: true }).click()]);
    await chooser.setFiles({ name: 'lugar.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });

    await expect(page.getByRole('img', { name: 'Foto 1', exact: true })).toBeVisible();
    const remove = page.getByRole('button', { name: 'Quitar foto 1' });
    const box = await remove.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('button', { name: 'Subir la foto' })).toBeVisible();
    await remove.click();
    await expect(page.getByRole('img', { name: 'Foto 1', exact: true })).toHaveCount(0);
  }
});
