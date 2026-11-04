import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// Foto de perfil de punta a punta contra Supabase: recorte en el navegador, subida a avatars/{uid}.webp,
// versión en el perfil, foto en la barra de navegación y borrado. Deja la cuenta sin foto al terminar.

test('una persona pone su foto de perfil, la ve en la barra y la quita', async ({ page }) => {
  await signIn(page, ACCOUNTS.vecino);
  await page.goto('/perfil');

  // Si quedó una foto de una corrida anterior, se quita primero
  const quitar = page.getByRole('button', { name: 'Quitar', exact: true });
  if (await quitar.isVisible()) {
    await quitar.click();
    await expect(page.getByText('Quitamos tu foto.')).toBeVisible();
  }

  // Foto de prueba de 600×400 dibujada por el propio navegador (el editor la recorta al centro a 256×256)
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 400;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2563eb'; g.fillRect(0, 0, 600, 400);
    g.fillStyle = '#f2b01e'; g.beginPath(); g.arc(300, 200, 120, 0, Math.PI * 2); g.fill();
    return c.toDataURL('image/png').split(',')[1]!;
  });
  // Como una persona: toca «Poner una foto» y elige el archivo. El selector solo se abre cuando la página ya
  // está lista (hidratada); entregar el archivo antes lo perdía y la prueba fallaba de vez en cuando.
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Poner una foto' }).click()]);
  await chooser.setFiles({ name: 'cara.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByText('Foto actualizada.')).toBeVisible();

  // La foto llega por la URL pública con versión y es WebP pequeño
  const navImg = page.getByRole('navigation', { name: 'Principal' }).last().locator('img[src*="/storage/v1/object/public/avatars/"]');
  await expect(navImg).toBeVisible();
  const src = await navImg.getAttribute('src');
  expect(src).toMatch(/\.webp\?v=\d+$/);
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/webp');
  expect((await res.body()).length).toBeLessThan(65_536);
  // Caché de un año en la CDN y el navegador: cada vista posterior no vuelve a Supabase
  expect(res.headers()['cache-control']).toContain('max-age=31536000');

  await page.getByRole('button', { name: 'Quitar', exact: true }).click();
  await expect(page.getByText('Quitamos tu foto.')).toBeVisible();
  await expect(navImg).toHaveCount(0);
});
