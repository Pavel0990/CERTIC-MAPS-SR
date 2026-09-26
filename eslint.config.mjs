import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boundariesConfig } from './eslint.boundaries.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  boundariesConfig({ tsconfig: path.join(root, 'tsconfig.json') }),
  {
    // La regla es para el Pages Router; el proyecto usa solo App Router (ADR-002)
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    // Fuera de la aplicación: prototipo de diseño (runtime generado), SQL y sus pruebas, documentación
    'project/**',
    'supabase/**',
    'docs/**',
    // Archivos con violaciones intencionales para la prueba de regresión de fronteras
    'tests/boundaries/fixtures/**',
  ]),
]);
