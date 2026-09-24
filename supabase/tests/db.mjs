// Base de pruebas: PostgreSQL 18 + PostGIS (PGlite, WebAssembly) con stubs de Supabase y todas las migraciones.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

export async function createDb({ seed = true } = {}) {
  const db = await PGlite.create({ extensions: { postgis, pg_trgm, unaccent, pgcrypto } });
  await db.exec(readFileSync(join(here, 'supabase-stubs.sql'), 'utf8'));
  const files = readdirSync(join(root, 'migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
    } catch (e) {
      throw new Error(`Migración ${f} falló: ${e.message}${e.position ? ' (posición ' + e.position + ')' : ''}`);
    }
  }
  if (seed) await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));
  return { db, files };
}

// Ejecuta como un usuario concreto, igual que PostgREST: rol de la API + claims del JWT.
// who: null → anon · 'service' → service_role · uuid → authenticated con ese sub
export async function as(db, who, sql, params = []) {
  const role = who === null ? 'anon' : who === 'service' ? 'service_role' : 'authenticated';
  const claims = who === null ? { role: 'anon' } : who === 'service' ? { role: 'service_role' } : { sub: who, role: 'authenticated' };
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}
