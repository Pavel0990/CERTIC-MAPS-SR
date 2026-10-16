import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// Accesibilidad automática (WCAG 2.1 AA) en las pantallas principales: criterio de baja alfabetización digital.
// El lienzo del mapa se excluye: es un <canvas> de terceros; su alternativa accesible son los listados.
const scan = (page: import('@playwright/test').Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').exclude('nextjs-portal').analyze();

const fmt = (v: Awaited<ReturnType<typeof scan>>['violations']) =>
  v.map((x) => `${x.impact} · ${x.id}: ${x.help} → ${x.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`).join('\n');

for (const path of ['/', '/negocios', '/turismo', '/rutas', '/entrar']) {
  test(`sin errores de accesibilidad: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const { violations } = await scan(page);
    expect(violations, fmt(violations)).toEqual([]);
  });
}

test('sin errores de accesibilidad: pantallas con sesión', async ({ page }) => {
  await signIn(page, ACCOUNTS.vecino);
  const all: string[] = [];
  for (const path of ['/reportar', '/actividad', '/perfil', '/notificaciones']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const { violations } = await scan(page);
    if (violations.length) all.push(`${path}\n${fmt(violations)}`);
  }
  expect(all, all.join('\n\n')).toEqual([]);
});
