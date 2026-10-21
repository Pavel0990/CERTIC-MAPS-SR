import { expect, test, type Page } from '@playwright/test';

// Captcha de Cloudflare Turnstile en /entrar (SECURITY.md). Solo corre si la app se construyó con
// NEXT_PUBLIC_TURNSTILE_SITE_KEY y la misma variable está en el entorno de Playwright. Para probarlo sin
// cuenta de Cloudflare se usa la clave pública de prueba que siempre aprueba (developers.cloudflare.com/turnstile/troubleshooting/testing):
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npx next build
// Con esa clave el token es siempre XXXX.DUMMY.TOKEN.XXXX. No se envía ningún correo: el envío se corta
// en el navegador después de comprobar que el token va en la llamada a la acción del servidor.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const CLOUDFLARE = 'challenges.cloudflare.com';

test.skip(!SITE_KEY, 'Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY: el captcha está apagado (comportamiento de siempre)');

const captcha = (page: Page) => page.getByRole('group', { name: 'Comprobación de que eres una persona' }).first();

async function ready(page: Page) {
  await expect(captcha(page)).toHaveAttribute('data-captcha', 'listo', { timeout: 30_000 });
}

/** El iframe de Turnstile vive en un shadow root cerrado: se busca entre los frames de la página. */
async function turnstileFrame(page: Page) {
  await expect.poll(() => page.frames().some((f) => f.url().includes(CLOUDFLARE)), { timeout: 30_000 }).toBe(true);
  return page.frames().find((f) => f.url().includes(CLOUDFLARE))!;
}

test('el recuadro carga, entrega el token y el token viaja en la acción del servidor', async ({ page }) => {
  const res = await page.goto('/entrar');
  const csp = res?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain(`frame-src https://${CLOUDFLARE}`);
  expect(csp).toMatch(new RegExp(`script-src 'self' 'nonce-[^']+' 'strict-dynamic' https://${CLOUDFLARE}`));

  await turnstileFrame(page);
  await ready(page);
  await expect(page.locator('input[name=captchaToken]')).toHaveValue(DUMMY_TOKEN);

  // La acción del servidor es un POST a /entrar con la cabecera next-action. Se lee su cuerpo y se corta,
  // para no mandar un correo real (Supabase de staging no tiene el captcha activado).
  let body = '';
  await page.route('**/entrar**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && req.headers()['next-action']) {
      body = req.postData() ?? '';
      return route.abort();
    }
    return route.continue();
  });
  await page.getByLabel('Tu correo electrónico').fill('captcha.prueba@example.com');
  await page.getByRole('button', { name: 'Enviarme el correo para entrar' }).click();
  await expect.poll(() => body).toContain(DUMMY_TOKEN);
  expect(body).toMatch(/captchaToken/);
});

test('a 320 px el recuadro cabe sin desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/entrar');
  await ready(page);
  const frame = await (await (await turnstileFrame(page)).frameElement()).boundingBox();
  expect(frame).not.toBeNull();
  expect(frame!.x).toBeGreaterThanOrEqual(0);
  expect(frame!.x + frame!.width).toBeLessThanOrEqual(320);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('sin elección en Perfil sigue al teléfono (auto)', async ({ page }) => {
  await page.goto('/entrar');
  await ready(page);
  expect((await turnstileFrame(page)).url()).toContain(`/${SITE_KEY}/auto/`);
});

test('usa el tema de la app: oscuro si la persona lo eligió en Perfil', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'tema', value: 'dark', url: baseURL! }]);
  await page.goto('/entrar');
  await ready(page);
  // El tema va en la ruta del iframe: .../<clave>/<tema>/...
  expect((await turnstileFrame(page)).url()).toContain(`/${SITE_KEY}/dark/`);
});

test('si Cloudflare no responde, ofrece intentar otra vez y luego funciona', async ({ page }) => {
  let blocked = true;
  await page.route(`https://${CLOUDFLARE}/**`, (route) => (blocked ? route.abort() : route.continue()));
  await page.goto('/entrar');
  const retry = page.getByRole('button', { name: 'No pudimos comprobar que eres una persona. Toca para intentar otra vez' });
  await expect(retry).toBeVisible({ timeout: 30_000 });
  const size = await retry.boundingBox();
  expect(size!.height).toBeGreaterThanOrEqual(44);
  blocked = false;
  await retry.click();
  await ready(page);
});

test('el script de Cloudflare no se carga en otras pantallas', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes(CLOUDFLARE)) requests.push(r.url());
  });
  for (const path of ['/', '/negocios', '/turismo']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
  }
  expect(requests).toEqual([]);
});
