import { expect, test } from '@playwright/test';

// Botón «Escuchar» (baja alfabetización digital): lee la ficha y los pasos con la voz del teléfono.
// La voz se reemplaza por una falsa que anota lo que leería: así la prueba no depende de las voces instaladas.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const said: string[] = [];
    (window as unknown as { __said: string[] }).__said = said;
    class FakeUtterance { text: string; lang = ''; rate = 1; voice = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: (u: FakeUtterance) => said.push(u.text), cancel: () => {}, getVoices: () => [{ lang: 'es-DO' }] },
    });
  });
});

test('una ficha de turismo se puede escuchar y detener', async ({ page }) => {
  await page.goto('/turismo');
  await page.locator('main a[href^="/turismo/"]').first().click();
  await page.waitForURL(/\/turismo\/[0-9a-f-]{36}$/);
  const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim();
  const listen = page.getByRole('button', { name: 'Escuchar' });
  await listen.click();
  const stop = page.getByRole('button', { name: /Detener/ });
  await expect(stop).toHaveAttribute('aria-pressed', 'true');
  const said = await page.evaluate(() => (window as unknown as { __said: string[] }).__said.join(' '));
  expect(said).toContain(name);
  await stop.click();
  await expect(page.getByRole('button', { name: 'Escuchar' })).toHaveAttribute('aria-pressed', 'false');
});

test('sin voz en el navegador, el botón no aparece', async ({ page }) => {
  await page.addInitScript(() => { delete (window as { speechSynthesis?: unknown }).speechSynthesis; });
  await page.goto('/turismo');
  await page.locator('main a[href^="/turismo/"]').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escuchar' })).toHaveCount(0);
});
