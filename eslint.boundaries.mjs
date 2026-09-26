// Regla de fronteras del monolito modular (ADR-008, ARCHITECTURE.md §15).
// La usan eslint.config.mjs y la prueba de regresión tests/boundaries/boundaries.test.mjs.
//
// Reglas:
//   1. Un módulo de dominio solo se importa desde fuera a través de su index.ts.
//   2. Dentro de un mismo módulo, sus archivos se importan libremente.
//   3. `map` y `jobs` no conocen reglas de negocio: no importan otros módulos de dominio.
//   4. Las capas compartidas (components, hooks, lib, config, types, utils) no importan módulos de dominio.
//   5. Nada importa de src/app: las páginas consumen módulos, nunca al revés.
import boundaries from 'eslint-plugin-boundaries';

const SHARED = ['components', 'hooks', 'lib', 'config', 'types', 'utils'];

export const boundaryElements = [
  { type: 'app', pattern: 'src/app' },
  { type: 'module', pattern: 'src/modules/*', capture: ['name'] },
  { type: 'components', pattern: 'src/components' },
  { type: 'hooks', pattern: 'src/hooks' },
  { type: 'lib', pattern: 'src/lib' },
  { type: 'config', pattern: 'src/config' },
  { type: 'types', pattern: 'src/types' },
  { type: 'utils', pattern: 'src/utils' },
];

const toTypes = (types) => ({ to: { element: { types: { anyOf: types } } } });

export const boundaryPolicies = [
  // Páginas y rutas: módulos (solo por index.ts) y capas compartidas
  { from: { element: { type: 'app' } }, allow: toTypes(['app', ...SHARED]) },
  { from: { element: { type: 'app' } }, allow: { to: { element: { type: 'module', fileInternalPath: 'index.{ts,tsx}' } } } },
  // Módulos: todo su propio módulo, capas compartidas y la API pública (index.ts) de otros módulos
  { from: { element: { type: 'module' } }, allow: { to: { element: { type: 'module' } }, dependency: { relationship: { to: 'internal' } } } },
  { from: { element: { type: 'module' } }, allow: toTypes(SHARED) },
  { from: { element: { type: 'module' } }, allow: { to: { element: { type: 'module', fileInternalPath: 'index.{ts,tsx}' } } } },
  // map y jobs no conocen reglas de negocio
  {
    from: { element: { type: 'module', captured: { name: '{map,jobs}' } } },
    disallow: { to: { element: { type: 'module', captured: { name: '!{{ from.element.captured.name }}' } } } },
  },
  // Capas compartidas: solo hacia capas de igual o menor nivel
  { from: { element: { type: 'components' } }, allow: toTypes(['components', 'hooks', 'lib', 'config', 'types', 'utils']) },
  { from: { element: { type: 'hooks' } }, allow: toTypes(['hooks', 'lib', 'config', 'types', 'utils']) },
  { from: { element: { type: 'lib' } }, allow: toTypes(['lib', 'config', 'types', 'utils']) },
  { from: { element: { type: 'config' } }, allow: toTypes(['config', 'types']) },
  { from: { element: { type: 'utils' } }, allow: toTypes(['utils', 'types']) },
  { from: { element: { type: 'types' } }, allow: toTypes(['types']) },
];

/**
 * Configuración de ESLint (flat config) con la regla de fronteras.
 * @param {object} options
 * @param {string} options.tsconfig ruta absoluta del tsconfig. Es obligatoria: sin ella el resolvedor no
 *   entiende el alias "@/" y deja pasar en silencio las importaciones prohibidas (lo cubre la prueba).
 * @param {string[]} [options.files] globs de los archivos a los que se aplica
 */
export function boundariesConfig({ tsconfig, files = ['src/**/*.{ts,tsx}'] }) {
  if (!tsconfig) throw new Error('boundariesConfig: falta la ruta del tsconfig');
  return {
    files,
    plugins: { boundaries },
    settings: {
      'boundaries/elements': boundaryElements,
      'import/resolver': { typescript: { alwaysTryTypes: true, project: tsconfig } },
    },
    rules: {
      'boundaries/dependencies': [2, { default: 'disallow', policies: boundaryPolicies }],
    },
  };
}
