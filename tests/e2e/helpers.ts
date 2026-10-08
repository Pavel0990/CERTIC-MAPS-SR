import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/** Cliente de servicio SOLO para preparar y limpiar las pruebas (nunca para verificar permisos). */
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const ACCOUNTS = {
  vecino: 'ciudadano.prueba@example.com',
  moderador: 'moderador.prueba@example.com',
  admin: 'admin.prueba@example.com',
} as const;

/** Entra con un código de un solo uso, sin correo, por la misma pantalla que usa un vecino. */
export async function signIn(page: Page, email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Ya tengo un código' }).click();
  await page.locator('input[name=email]:not([type=hidden])').fill(email);
  await page.locator('input[name=token]').fill(data.properties.email_otp);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('link', { name: /Perfil/ }).first()).toBeVisible();
}

/**
 * Deja la reputación de una cuenta de prueba en 0. Cada alerta publicada suma reputación, y con 5 o más
 * las alertas se publican sin moderación (regla de create_traffic_report): sin esto, la prueba de
 * moderación dejaría de probar la moderación después de unas cuantas ejecuciones.
 */
export async function resetReputation(email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  await admin().from('profiles').update({ reputation: 0 }).eq('id', data.user.id);
}
