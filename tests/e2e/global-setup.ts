import { ACCOUNTS, resetRateLimits, resetReputation } from './helpers';

// Antes de cada corrida de Playwright: deja las cuentas de prueba como nuevas (límites por hora y reputación),
// para que las E2E se puedan correr varias veces seguidas sin tocar la base a mano.
export default async function globalSetup() {
  const n = await resetRateLimits();
  await resetReputation(ACCOUNTS.vecino);
  console.log(`Cuentas de prueba listas: ${n} contador(es) de límites borrados.`);
}
