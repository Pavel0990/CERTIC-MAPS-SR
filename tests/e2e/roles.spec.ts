import { expect, test, type Browser } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// Cada rol ve solo lo suyo. La interfaz esconde lo que no corresponde, pero lo que manda es el servidor:
// estas pruebas entran directo por la URL, como haría alguien que adivina la dirección.
async function as(browser: Browser, account: string | null) {
  const context = await browser.newContext();
  const page = await context.newPage();
  if (account) await signIn(page, account);
  return { page, close: () => context.close() };
}

test('cada rol entra solo a lo suyo, aunque escriba la dirección a mano', async ({ browser }) => {
  test.setTimeout(150_000);

  // Sin sesión: el panel pide entrar y vuelve al panel después
  const anon = await as(browser, null);
  await anon.page.goto('/admin');
  await expect(anon.page).toHaveURL(/\/entrar\?next=%2Fadmin/);
  await anon.close();

  // Vecino: no es personal del municipio
  const vecino = await as(browser, ACCOUNTS.vecino);
  await vecino.page.goto('/admin');
  await expect(vecino.page).toHaveURL(/\/sin-permiso/);
  await expect(vecino.page.getByRole('heading', { name: 'Esta sección es para el personal del municipio' })).toBeVisible();
  await vecino.close();

  // Moderación: su trabajo del día, pero no equipo, auditoría, informes ni catálogos
  const mod = await as(browser, ACCOUNTS.moderador);
  await mod.page.goto('/admin');
  await expect(mod.page.getByRole('heading', { name: 'Tu trabajo hoy' })).toBeVisible();
  for (const path of ['/admin/equipo', '/admin/auditoria', '/admin/informes', '/admin/catalogos']) {
    await mod.page.goto(path);
    await expect(mod.page, `moderación no entra a ${path}`).toHaveURL(/\/admin$/);
  }
  await mod.close();

  // Administración provincial: todo el panel
  const admin = await as(browser, ACCOUNTS.admin);
  for (const path of ['/admin', '/admin/equipo', '/admin/auditoria', '/admin/informes', '/admin/catalogos']) {
    await admin.page.goto(path);
    await expect(admin.page, `administración entra a ${path}`).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`));
  }
  await expect(admin.page.getByRole('heading', { level: 1 })).toBeVisible();
  await admin.close();
});
