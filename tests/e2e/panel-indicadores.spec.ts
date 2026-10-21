import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

// Dashboard del panel (ARCHITECTURE.md §9.7): periodo en la URL, comparación, gráfico accesible y cada indicador abre su lista.
test('la administración cambia el periodo, recorre el gráfico y abre una lista desde un indicador', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Lo que hay que atender' })).toBeVisible();
  await expect(page.getByText(/Últimos 7 días/)).toBeVisible();

  // Periodo de 30 días: queda en la URL (el enlace se puede compartir) y el gráfico pasa a semanas
  await page.getByRole('navigation', { name: 'Periodo' }).getByRole('link', { name: '30 días' }).click();
  await expect(page).toHaveURL(/periodo=30/);
  await expect(page.getByText(/Últimos 30 días/)).toBeVisible();
  await expect(page.getByText('Por semana')).toBeVisible();

  // El gráfico se recorre con el teclado y tiene su tabla equivalente
  const chart = page.getByRole('img', { name: /Gráfico de reportes recibidos y resueltos/ });
  await chart.focus();
  const before = await chart.getAttribute('aria-label');
  await page.keyboard.press('ArrowLeft');
  await expect(chart).not.toHaveAttribute('aria-label', before!);
  await page.getByText('Ver como tabla').click();
  await expect(page.getByRole('columnheader', { name: 'Recibidos' })).toBeVisible();

  // Cada "?" explica el indicador en lenguaje sencillo
  await page.getByLabel('Qué mide «Abiertos ahora»').click();
  await expect(page.getByText(/todavía no se resolvieron ni se descartaron/)).toBeVisible();

  // Un indicador lleva a su lista
  await page.getByRole('link', { name: /Por validar/ }).click();
  await expect(page).toHaveURL(/\/admin\/validaciones/);
});
