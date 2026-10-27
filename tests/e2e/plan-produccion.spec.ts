import { expect, test } from '@playwright/test';

// Lo que falta para producción (docs/ESTADO-Y-PENDIENTES.md §5.2), registrado como pruebas PENDIENTES.
// `test.fixme` las deja en el reporte sin ejecutarlas; se quita `fixme` cuando cada cuenta externa esté lista.
// El captcha ya está hecho: lo cubren tests/e2e/captcha.spec.ts y src/app/(app)/entrar/actions.test.ts.

test.describe('Supabase de producción', () => {
  test.fixme('la API de salud responde contra la base de producción', async ({ request }) => {
    // Requiere: E2E_BASE_URL apuntando al despliegue de producción con sus vars de Vercel.
    const res = await request.get('/api/v1/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test.fixme('un vecino entra y ve su actividad con la BD de producción', async ({ page }) => {
    // Requiere: cuenta de prueba creada en producción vía scripts/staging-test-users.mjs.
    // Usa signIn() de helpers.ts; verificar /actividad carga sin error 500.
    expect(page).toBeDefined();
  });
});

test.describe('Correo con Resend', () => {
  test.fixme('el código de acceso llega por Resend (flujo de entrada)', async ({ page }) => {
    // Requiere: RESEND_API_KEY activa + dominio verificado en Supabase Auth.
    // Escribir el correo en /entrar y esperar el aviso de "te enviamos un código".
    await page.goto('/entrar');
    expect(page).toBeDefined();
  });
});
