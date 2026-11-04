import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// Al tocar un botón de la navegación, la pantalla tiene que reaccionar enseguida (aunque los datos
// tarden un poco más): sin esa respuesta inmediata, la gente vuelve a tocar y siente la app "pegada".
// Se mide dentro de la página, desde el clic real hasta que cambia lo que se ve (esqueleto de carga
// o la página nueva), para no contar la espera de Playwright a que el botón deje de moverse.
const FEEDBACK_MS = 400;

async function tap(page: Page, href: string) {
  await page.evaluate(() => {
    const w = window as unknown as { __nav: { clickAt: number; feedbackAt: number } };
    w.__nav = { clickAt: 0, feedbackAt: 0 };
    const prev = document.querySelector('main h1')?.textContent ?? '';
    document.addEventListener('click', () => {
      w.__nav.clickAt = performance.now();
      const watch = () => {
        const m = document.querySelector('main');
        if (m && (m.querySelector('[data-loading]') || (m.querySelector('h1')?.textContent ?? '') !== prev)) w.__nav.feedbackAt = performance.now();
        else requestAnimationFrame(watch);
      };
      watch();
    }, { capture: true, once: true });
  });
  await page.locator(`a[href="${href}"]:visible`).first().click();
  await page.waitForURL((u) => u.pathname === href);
  await expect(page.locator('main [data-loading]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('main h1').first()).toBeVisible();
  const t = await page.evaluate(() => {
    const n = (window as unknown as { __nav: { clickAt: number; feedbackAt: number } }).__nav;
    return { feedback: Math.round(n.feedbackAt - n.clickAt), ready: Math.round(performance.now() - n.clickAt) };
  });
  return { href, ...t };
}

test('cada botón de la navegación reacciona enseguida', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  await page.goto('/');
  const route = ['/mapa', '/actividad', '/perfil', '/admin', '/admin/bandeja', '/admin/validaciones', '/admin/informes', '/', '/actividad', '/perfil'];
  // Primera pasada: calienta el servidor; la segunda es la que cuenta
  for (const href of route) await tap(page, href);
  const results = [];
  for (const href of route) results.push(await tap(page, href));
  console.table(results);
  for (const r of results) expect(r.feedback, `reacción al tocar ${r.href}`).toBeLessThan(FEEDBACK_MS);
});
