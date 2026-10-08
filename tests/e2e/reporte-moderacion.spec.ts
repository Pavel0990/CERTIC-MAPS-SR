import { expect, test } from '@playwright/test';
import { ACCOUNTS, admin, resetReputation, signIn } from './helpers';

// El recorrido central: un vecino reporta una alerta, el moderador la publica y aparece en el mapa público.
const mark = `Prueba E2E ${Date.now()}`;

test.beforeAll(async () => {
  await resetReputation(ACCOUNTS.vecino);
});

test.afterAll(async () => {
  await admin().from('traffic_reports').delete().eq('description', mark);
});

test('vecino reporta un bache → moderador lo publica → sale en el mapa público', async ({ browser }) => {
  // Vecino en Sabaneta, con el GPS del teléfono
  const vecino = await browser.newContext({ geolocation: { latitude: 19.4757, longitude: -71.3418 }, permissions: ['geolocation'] });
  const p1 = await vecino.newPage();
  await signIn(p1, ACCOUNTS.vecino);
  await p1.goto('/reportar');
  await p1.getByRole('button', { name: 'Bache' }).click();
  await p1.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
  await p1.getByRole('button', { name: 'El pin está en el lugar' }).click();
  await p1.getByRole('textbox').last().fill(mark);
  await p1.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(p1.getByText(/recibimos|enviado|gracias/i).first()).toBeVisible();

  const { data: report } = await admin().from('traffic_reports').select('id, status').eq('description', mark).single();
  expect(report?.status).toBe('pending');

  // Moderador de Sabaneta: lo ve en la bandeja y lo publica
  const moderador = await browser.newContext();
  const p2 = await moderador.newPage();
  await signIn(p2, ACCOUNTS.moderador);
  await p2.goto('/admin/bandeja');
  const card = p2.locator('li, article, div').filter({ hasText: mark }).last();
  await card.getByRole('button', { name: 'Publicar en el mapa' }).click();
  await expect(p2.getByText('Publicada. Ya la ven todos.')).toBeVisible();

  // Público, sin sesión: la alerta está en el mapa
  const res = await p2.request.get('/api/v1/map/features?bbox=-71.62,19.24,-71.02,19.62&layers=traffic');
  const geo = await res.json();
  expect(geo.features.some((f: { properties: { id: string } }) => f.properties.id === report!.id)).toBe(true);

  await vecino.close();
  await moderador.close();
});
