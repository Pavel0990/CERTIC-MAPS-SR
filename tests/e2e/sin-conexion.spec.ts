import { expect, test } from '@playwright/test';

// Sin conexión (public/sw.js): lo que la persona ya abrió se sigue viendo, y lo que no, muestra /offline
// en vez de la pantalla de error del navegador. El service worker solo existe en el build de producción
// (next build + next start, o el sitio publicado); con `next dev` esta prueba se salta sola.
test('sin señal se ve lo que ya se abrió, y lo demás explica que no hay conexión', async ({ page, context }) => {
  await page.goto('/');
  const hasWorker = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 10_000))]);
    return !!reg;
  });
  test.skip(!hasWorker, 'Sin service worker (servidor de desarrollo)');

  // Con el service worker ya al mando, se visitan las pantallas que quedan guardadas en el teléfono
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.goto('/mapa');
  await expect(page.getByRole('heading', { name: 'Mapa de Santiago Rodríguez' })).toBeAttached();
  await page.goto('/');

  await context.setOffline(true);
  try {
    // Lo visitado se ve igual, sin red
    await page.goto('/mapa');
    await expect(page.getByRole('heading', { name: 'Mapa de Santiago Rodríguez' })).toBeAttached();
    // Lo que nunca se abrió: la página propia de "sin conexión", con lenguaje sencillo
    await page.goto('/negocios');
    await expect(page.getByRole('heading', { name: 'Estás sin conexión' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
