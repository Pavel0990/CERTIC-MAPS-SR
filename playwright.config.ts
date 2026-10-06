import { defineConfig, devices } from '@playwright/test';

// Pruebas de punta a punta en un navegador real (npm run test:e2e).
// Usan el Supabase vinculado (staging) y las cuentas de prueba de scripts/staging-test-users.mjs;
// lo que crean lo borran al terminar. Necesitan la app corriendo (npm run dev) o E2E_BASE_URL.
// En Windows usan Edge, ya instalado; en otro sistema: npx playwright install chromium.
try {
  process.loadEnvFile('.env.local');
} catch {
  // en CI las variables llegan por el entorno
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'telefono', use: { ...devices['Pixel 7'], ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) } }],
});
