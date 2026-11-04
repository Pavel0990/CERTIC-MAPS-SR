import { expect, test } from '@playwright/test';

// Ningún teléfono ni pantalla debe desplazarse de lado: del más angosto (320 px) al teléfono en horizontal y a la PC.
const SIZES = [
  { name: 'teléfono de 320 px', width: 320, height: 568 },
  { name: 'teléfono en horizontal', width: 844, height: 390 },
  { name: 'PC', width: 1920, height: 1080 },
];
const PAGES = ['/', '/mapa', '/negocios', '/turismo', '/rutas', '/entrar'];

for (const size of SIZES) {
  test(`sin desplazamiento lateral: ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(scroll, `${path} se sale ${scroll - client} px a lo ancho`).toBeLessThanOrEqual(client);
    }
  });
}

test('la barra de abajo cabe en 320 px: ninguna etiqueta choca con la de al lado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/negocios', { waitUntil: 'domcontentloaded' });
  const labels = page.getByRole('navigation', { name: 'Principal' }).locator('ul a > span:last-of-type');
  const boxes = await labels.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })));
  expect(boxes.length).toBe(5);
  boxes.slice(1).forEach((box, i) => expect(box.left, `etiqueta ${i + 2}`).toBeGreaterThanOrEqual(boxes[i]!.right));
});
