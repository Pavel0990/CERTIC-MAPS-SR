// Auditoría de seguridad de la base en línea: npm run db:audit (SECURITY.md · Auditoría).
// Ejecuta supabase/ops/security_audit.sql (solo lectura) y falla si encuentra algún problema.
//   - Con DATABASE_URL (GitHub Actions): usa psql.
//   - Sin ella (en tu computadora): usa la CLI de Supabase con el proyecto enlazado (`supabase link`).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Ruta relativa a la raíz del repositorio: en Windows la CLI se lanza con shell y una ruta con espacios se partiría
const root = fileURLToPath(new URL('..', import.meta.url));
const sql = 'supabase/ops/security_audit.sql';
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });

let problems;
try {
  if (process.env.DATABASE_URL) {
    const out = run('psql', [process.env.DATABASE_URL, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-F', '\t', '-f', sql]);
    problems = out.split('\n').filter(Boolean).map((l) => { const [problem, object] = l.split('\t'); return { problem, object }; });
  } else {
    problems = JSON.parse(run('npx', ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', sql])).rows;
  }
} catch (e) {
  console.error('No se pudo ejecutar la auditoría:', e.stderr?.toString().trim() || e.message);
  process.exit(2);
}

if (!problems.length) {
  console.log('Auditoría de seguridad de la base: sin problemas.');
} else {
  console.error(`Auditoría de seguridad de la base: ${problems.length} problema(s)`);
  for (const p of problems) console.error(`  - ${p.problem}: ${p.object}`);
  process.exit(1);
}
