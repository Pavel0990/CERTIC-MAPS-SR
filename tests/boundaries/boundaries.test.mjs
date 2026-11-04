// Prueba de regresión de la regla de fronteras (ADR-008).
// Ejecuta ESLint con la misma configuración del proyecto (eslint.boundaries.mjs) sobre un árbol
// de ejemplo que contiene importaciones válidas y violaciones intencionales.
// Uso: npm run test:boundaries
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { boundariesConfig } from '../../eslint.boundaries.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const eslint = new ESLint({
  cwd: fixtures,
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['src/**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
    boundariesConfig({ tsconfig: path.join(fixtures, 'tsconfig.json') }),
  ],
});

const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
const errorsOf = (rel) => {
  const r = results.find((x) => path.relative(fixtures, x.filePath).split(path.sep).join('/') === rel);
  assert.ok(r, `no se analizó ${rel}`);
  const fatal = r.messages.filter((m) => m.fatal);
  assert.equal(fatal.length, 0, `error de análisis en ${rel}: ${fatal.map((m) => m.message).join('; ')}`);
  return r.messages.filter((m) => m.ruleId === 'boundaries/dependencies');
};
const allowed = (rel) => assert.equal(errorsOf(rel).length, 0, `${rel} debería estar permitido`);
const blocked = (rel) => assert.ok(errorsOf(rel).length > 0, `${rel} debería estar bloqueado`);

test('dentro de un módulo, los archivos se importan libremente', () => {
  allowed('src/modules/traffic/server/internal-ok.ts');
  allowed('src/modules/traffic/index.ts');
});
test('un módulo puede usar la API pública (index.ts o server.ts) de otro módulo', () => {
  allowed('src/modules/businesses/ok-uses-traffic-index.ts');
  allowed('src/modules/businesses/ok-alias-index.ts');
  allowed('src/modules/businesses/ok-uses-traffic-server-entry.ts');
});
test('un módulo NO puede importar archivos internos de otro módulo', () => {
  blocked('src/modules/businesses/bad-uses-traffic-internal.ts');
  blocked('src/modules/businesses/bad-alias-internal.ts');
});
test('map no puede depender de módulos de dominio, pero sí de sus propios archivos', () => {
  blocked('src/modules/map/bad-uses-domain.ts');
  allowed('src/modules/map/ok-internal.ts');
});
test('las capas compartidas no importan módulos de dominio', () => {
  blocked('src/lib/bad-uses-module.ts');
});
test('las importaciones con alias @/ se resuelven: una importación prohibida no pasa en silencio', () => {
  blocked('src/modules/businesses/bad-alias-internal.ts');
  allowed('src/modules/businesses/ok-alias-index.ts');
});
test('las páginas solo usan la API pública de los módulos', () => {
  allowed('src/app/page-ok.tsx');
  blocked('src/app/page-bad.tsx');
});
test('los módulos pueden usar utilidades compartidas', () => {
  allowed('src/modules/traffic/server/create.ts');
});
