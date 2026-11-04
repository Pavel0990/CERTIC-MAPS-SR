import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';
// Modo oscuro (prefers-color-scheme: dark): las mismas pantallas deben cumplir WCAG 2.1 AA, contraste incluido.
// El lienzo del mapa se excluye: es de terceros y su mapa base sigue claro a propósito.
test.use({ colorScheme: 'dark' });

test('modo oscuro sin errores de accesibilidad (públicas, con sesión y panel)', async ({ page }) => {
  const all: string[] = [];
  const scan = async (path: string) => {
    await page.goto(path);
    // Con el captcha activado, Turnstile mantiene la red ocupada en /entrar: "networkidle" no llega nunca
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => page.waitForTimeout(1500));
    // Las tarjetas del panel entran con una animación escalonada (kpi-rise): medir el contraste a mitad del
    // desvanecido da un falso fallo. Se espera a que terminen las animaciones finitas (las infinitas no cuentan).
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => undefined))));
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').exclude('nextjs-portal').analyze();
    for (const v of r.violations) all.push(`${path} ${v.impact} ${v.id}: ${v.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' ' + (n.any[0]?.message ?? '').slice(0, 90)).join(' | ')}`);
  };
  for (const p of ['/', '/negocios', '/turismo', '/rutas', '/entrar']) await scan(p);
  await signIn(page, ACCOUNTS.admin);
  for (const p of ['/perfil', '/actividad', '/reportar', '/notificaciones', '/admin', '/admin/bandeja', '/admin/validaciones', '/admin/informes', '/admin/equipo', '/admin/auditoria', '/admin/catalogos']) await scan(p);
  expect(all, all.join('\n')).toEqual([]);
});
