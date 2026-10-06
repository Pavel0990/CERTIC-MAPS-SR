// Copia rápida de los DATOS de todas las tablas de public a backups/<proyecto>-<fecha>.json.
// No necesita Docker ni contraseña: usa el proyecto vinculado con la CLI de Supabase.
// El esquema no hace falta copiarlo: está entero en supabase/migrations.
// backups/ está en .gitignore: contiene datos personales y nunca debe ir a git.
// Uso: node scripts/backup-snapshot.mjs   (antes de cambios grandes de datos o de la demo)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// La consulta va siempre en un archivo: en Windows la consola partiría el SQL en argumentos sueltos
const tmp = 'backups/.snapshot.sql';
const run = (sql) => {
  fs.writeFileSync(tmp, sql);
  try {
    const out = execFileSync('npx', ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', tmp], { encoding: 'utf8', maxBuffer: 1 << 30, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(out.slice(out.indexOf('{'))).rows;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};
fs.mkdirSync('backups', { recursive: true });

const tables = run(`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`).map((r) => r.table_name);
const sql = `select jsonb_build_object(${tables.map((t) => `'${t}', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public."${t}" x)`).join(', ')}) as snapshot;`;
const snapshot = run(sql)[0].snapshot;
const file = `backups/staging-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.json`;
fs.writeFileSync(file, JSON.stringify({ created_at: new Date().toISOString(), tables: snapshot }));
const counts = Object.entries(snapshot).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.length}`).join('  ');
console.log(`${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)\n${counts}`);
