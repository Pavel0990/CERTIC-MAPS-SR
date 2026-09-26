import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Pruebas unitarias de la aplicación. La prueba de fronteras usa node:test (npm run test:boundaries)
// y la base de datos tiene su propia suite (npm run test:db).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node' },
});
